const fs = require('fs');
const path = require('path');

const VERSION = '0.5.0';

const CORE_FILES = [
  'src/platforms/PLATFORM-adapter.js',
  'src/core/logger.js',
  'src/core/config.js',
  'src/core/matcher.js',
  'src/core/bangumi-api.js',
  'src/core/ui.js',
  'src/core/bilibili-watcher.js',
  'src/core/orchestrator.js',
  'src/core/video-observer.js',
  'src/core/auto-sync.js'
];

const USERSCRIPT_HEADER = `// ==UserScript==
// @name         bilibili2bangumi
// @namespace    https://github.com/bilibili2bangumi
// @version      ${VERSION}
// @description  在 B 站观看 UGC 番剧视频时，手动搜索并同步到 Bangumi 收藏进度
// @author       bilibili2bangumi
// @match        *://www.bilibili.com/video/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.bgm.tv
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/bilibili2bangumi/bilibili2bangumi/main/bilibili2bangumi.user.js
// @downloadURL  https://raw.githubusercontent.com/bilibili2bangumi/bilibili2bangumi/main/bilibili2bangumi.user.js
// @license      MIT
// ==/UserScript==

`;

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function replacePlaceholders(content, platform) {
  return content
    .replace(/__VERSION__/g, VERSION)
    .replace(/__PLATFORM__/g, platform);
}

function buildUserscript() {
  console.log('Building userscript...');

  let output = USERSCRIPT_HEADER;
  output += "(function () {\n  'use strict';\n\n  var BS = window.BangumiSync = {};\n\n";

  CORE_FILES.forEach(function(file) {
    var actualFile = file.replace('PLATFORM', 'userscript');
    var content = readFile(actualFile);
    content = replacePlaceholders(content, 'UserScript');

    // 缩进处理
    var lines = content.split('\n');
    lines.forEach(function(line) {
      if (line.trim()) {
        output += '  ' + line + '\n';
      } else {
        output += '\n';
      }
    });
    output += '\n';
  });

  output += '  // ===== 初始化 =====\n';
  output += '  BS.BiliWatcher.init();\n\n';
  output += '})();\n';

  fs.writeFileSync('bilibili2bangumi.user.js', output);
  console.log('✓ bilibili2bangumi.user.js generated');
}

function buildExtension() {
  console.log('Building extension...');

  let output = "// bilibili2bangumi - Edge Extension Version\n";
  output += "// 在 B 站观看 UGC 番剧视频时，手动搜索并同步到 Bangumi 收藏进度\n\n";
  output += "(function () {\n  'use strict';\n\n  var BS = window.BangumiSync = {};\n\n";

  CORE_FILES.forEach(function(file) {
    var actualFile = file.replace('PLATFORM', 'extension');
    var content = readFile(actualFile);
    content = replacePlaceholders(content, 'Extension');

    var lines = content.split('\n');
    lines.forEach(function(line) {
      if (line.trim()) {
        output += '  ' + line + '\n';
      } else {
        output += '\n';
      }
    });
    output += '\n';
  });

  output += '  // ===== 初始化 =====\n';
  output += '  BS.BiliWatcher.init();\n\n';
  output += '})();\n';

  fs.writeFileSync('edge-extension/injected.js', output);
  console.log('✓ edge-extension/injected.js generated');
}

function main() {
  console.log('=== bilibili2bangumi build ===');
  console.log('Version:', VERSION);
  console.log('');

  buildUserscript();
  buildExtension();

  console.log('');
  console.log('Build complete!');
}

main();
