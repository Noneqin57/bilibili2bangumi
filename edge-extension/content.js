// Content Script - 用于将脚本注入到页面中
(function() {
  'use strict';

  // 创建 script 标签注入主脚本
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  console.log('[BangumiSync Extension] 脚本已注入');
})();
