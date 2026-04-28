// ==UserScript==
// @name         bilibili2bangumi
// @namespace    https://github.com/Noneqin57
// @version      0.5.0
// @description  在 B 站观看 UGC 番剧视频时，手动搜索并同步到 Bangumi 收藏进度
// @author       bilibili2bangumi
// @match        *://www.bilibili.com/video/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bgm.tv
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Noneqin57/bilibili2bangumi/main/bilibili2bangumi.user.js
// @downloadURL  https://raw.githubusercontent.com/Noneqin57/bilibili2bangumi/main/bilibili2bangumi.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  var BS = window.BangumiSync = {};

  // ===== Userscript Platform Adapter =====
  // 适配油猴脚本的 GM_* API

  BS.Platform = {
    getValue: function(key, fallback) {
      var val = GM_getValue(key, null);
      return val !== null ? val : fallback;
    },

    setValue: function(key, value) {
      GM_setValue(key, value);
    },

    httpRequest: function(options) {
      GM_xmlhttpRequest({
        method: options.method,
        url: options.url,
        headers: options.headers,
        data: options.data,
        timeout: options.timeout,
        onload: function(res) {
          options.onload({
            status: res.status,
            responseText: res.responseText
          });
        },
        onerror: options.onerror,
        ontimeout: options.ontimeout,
        onabort: options.onabort
      });
    },

    addStyles: function(css) {
      GM_addStyle(css);
    }
  };


  // ===== Logger 模块 =====
  BS.Logger = (function () {
    var LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    var currentLevel = LEVELS.info;
    var PREFIX = '[BangumiSync]';

    function log(level, message) {
      if (LEVELS[level] < currentLevel) return;
      var fn = console[level] || console.log;
      fn(PREFIX + ' ' + message);
    }

    function debug(message) { log('debug', message); }
    function info(message) { log('info', message); }
    function warn(message) { log('warn', message); }
    function error(message) { log('error', message); }

    function setLevel(level) {
      if (LEVELS.hasOwnProperty(level)) {
        currentLevel = LEVELS[level];
      }
    }

    return {
      debug: debug,
      info: info,
      warn: warn,
      error: error,
      setLevel: setLevel
    };
  })();


  // ===== Config 模块 =====
  BS.Config = (function () {
    var KEYS = {
      ACCESS_TOKEN: 'bgm_access_token',
      SYNC_HISTORY: 'bgm_sync_history',
      UP_WHITELIST: 'bgm_up_whitelist',
      HIDE_ON_WIDE: 'bgm_hide_on_wide',
      ENABLE_DEDUP: 'bgm_enable_dedup',
      AUTO_SYNC_MODE: 'bgm_auto_sync_mode',
      AUTO_SYNC_SUBJECT_MAP: 'bgm_auto_sync_subject_map',
      AUTO_SYNC_SIMILARITY_THRESHOLD: 'bgm_auto_sync_threshold'
    };

    function get(key, fallback) {
      var val = BS.Platform.getValue(key, null);
      return val !== null ? val : fallback;
    }

    function set(key, value) {
      BS.Platform.setValue(key, value);
    }

    function getAccessToken() {
      return get(KEYS.ACCESS_TOKEN, '');
    }

    function setAccessToken(token) {
      set(KEYS.ACCESS_TOKEN, token || '');
    }

    function getSyncHistory() {
      return get(KEYS.SYNC_HISTORY, {});
    }

    function addSyncRecord(subjectId, ep) {
      var history = getSyncHistory();
      history[subjectId + '_' + ep] = Date.now();
      set(KEYS.SYNC_HISTORY, history);
    }

    function isRecentlySynced(subjectId, ep) {
      if (!getEnableDedup()) return false;

      var history = getSyncHistory();
      var key = subjectId + '_' + ep;
      var ts = history[key];
      if (!ts || typeof ts !== 'number') return false;
      return (Date.now() - ts) < 24 * 60 * 60 * 1000;
    }

    function getEnableDedup() {
      return get(KEYS.ENABLE_DEDUP, true);
    }

    function setEnableDedup(value) {
      set(KEYS.ENABLE_DEDUP, value);
    }

    function getUpWhitelist() {
      return get(KEYS.UP_WHITELIST, []);
    }

    function setUpWhitelist(whitelist) {
      set(KEYS.UP_WHITELIST, whitelist || []);
    }

    function addUp(upConfig) {
      var list = getUpWhitelist();
      list.push(upConfig);
      setUpWhitelist(list);
    }

    function removeUp(identifier) {
      var list = getUpWhitelist();
      var newList = list.filter(function(up) {
        return up.upName !== identifier && up.uid !== identifier;
      });
      setUpWhitelist(newList);
    }

    function getUpConfig(identifier) {
      var list = getUpWhitelist();
      for (var i = 0; i < list.length; i++) {
        if (list[i].upName === identifier || list[i].uid === identifier) {
          return list[i];
        }
      }
      return null;
    }

    function getHideOnWide() {
      return get(KEYS.HIDE_ON_WIDE, true);
    }

    function setHideOnWide(value) {
      set(KEYS.HIDE_ON_WIDE, value);
    }

    function getAutoSyncMode() {
      return get(KEYS.AUTO_SYNC_MODE, 'assist');
    }

    function setAutoSyncMode(value) {
      set(KEYS.AUTO_SYNC_MODE, value || 'assist');
    }

    function getAutoSyncSubjectMap() {
      return get(KEYS.AUTO_SYNC_SUBJECT_MAP, {});
    }

    function setAutoSyncSubjectMap(map) {
      set(KEYS.AUTO_SYNC_SUBJECT_MAP, map || {});
    }

    function getConfirmedSubjectId(upName, cleanTitle) {
      var map = getAutoSyncSubjectMap();
      var key = (upName || '') + '|' + (cleanTitle || '');
      return map[key] || null;
    }

    function confirmSubject(upName, cleanTitle, subjectId) {
      var map = getAutoSyncSubjectMap();
      var key = (upName || '') + '|' + (cleanTitle || '');
      map[key] = subjectId;
      setAutoSyncSubjectMap(map);
    }

    function getSimilarityThreshold() {
      return get(KEYS.AUTO_SYNC_SIMILARITY_THRESHOLD, 0.6);
    }

    function setSimilarityThreshold(value) {
      var num = parseFloat(value);
      if (isNaN(num) || num < 0.3 || num > 1.0) num = 0.6;
      set(KEYS.AUTO_SYNC_SIMILARITY_THRESHOLD, num);
    }

    return {
      getAccessToken: getAccessToken,
      setAccessToken: setAccessToken,
      getSyncHistory: getSyncHistory,
      addSyncRecord: addSyncRecord,
      isRecentlySynced: isRecentlySynced,
      getEnableDedup: getEnableDedup,
      setEnableDedup: setEnableDedup,
      getUpWhitelist: getUpWhitelist,
      setUpWhitelist: setUpWhitelist,
      addUp: addUp,
      removeUp: removeUp,
      getUpConfig: getUpConfig,
      getHideOnWide: getHideOnWide,
      setHideOnWide: setHideOnWide,
      getAutoSyncMode: getAutoSyncMode,
      setAutoSyncMode: setAutoSyncMode,
      getAutoSyncSubjectMap: getAutoSyncSubjectMap,
      setAutoSyncSubjectMap: setAutoSyncSubjectMap,
      getConfirmedSubjectId: getConfirmedSubjectId,
      confirmSubject: confirmSubject,
      getSimilarityThreshold: getSimilarityThreshold,
      setSimilarityThreshold: setSimilarityThreshold
    };
  })();


  // ===== Matcher 模块（集数提取 + 标题解析）=====
  BS.Matcher = (function () {
    var EP_PATTERNS = [
      { regex: /第\s*(\d+)\s*[话集]/i, name: '第X话/集' },
      { regex: /\[(\d{1,4})\]/, name: '[XX]' },
      { regex: /EP\.?\s*(\d+)/i, name: 'EPXX' },
      { regex: /#\s*(\d{1,4})\b/, name: '#X' },
      { regex: /S\d+E(\d+)/i, name: 'SXXEXX' },
      { regex: /(\d{1,4})\s*话/i, name: 'X话' },
      { regex: /『[^』]*』\s*(\d{1,4})/i, name: '『作品名』XX' }
    ];

    var PROPERTY_TAGS = [
      '4K', '1080P', '720P', '480P', 'HDR', 'SDR',
      '简中', '繁中', '简体', '繁体', '中字', '中日',
      '超清', '高清', '标清',
      '字幕', '字幕组', '压制', ' ENCODE',
      'BD', 'BDRIP', 'WEB', 'WEBRIP',
      '新番', '完结', '全集'
    ];

    var SEASON_MARKERS = /^(\d{1,2})\s*月\s*(新番)?$/i;

    // 常见视频分辨率，避免被误识别为集数
    var COMMON_RESOLUTIONS = { 144:1, 240:1, 360:1, 480:1, 540:1, 720:1, 1080:1, 1440:1, 2160:1, 4320:1 };

    var CACHE_SIZE = 20;
    var cache = {};
    var cacheKeys = [];

    function getCache(key) {
      return cache.hasOwnProperty(key) ? cache[key] : null;
    }

    function setCache(key, value) {
      if (cacheKeys.length >= CACHE_SIZE) {
        var oldest = cacheKeys.shift();
        delete cache[oldest];
      }
      cacheKeys.push(key);
      cache[key] = value;
    }

    function extractEpisode(title) {
      var cached = getCache('ep:' + title);
      if (cached !== null) return cached;

      for (var i = 0; i < EP_PATTERNS.length; i++) {
        var m = title.match(EP_PATTERNS[i].regex);
        if (m) {
          var ep = parseInt(m[1], 10);
          // 跳过常见分辨率数字，避免 [1080]、[720] 等被误识别为集数
          if (COMMON_RESOLUTIONS.hasOwnProperty(ep)) {
            continue;
          }
          var result = {
            ep: ep,
            pattern: EP_PATTERNS[i].name
          };
          setCache('ep:' + title, result);
          return result;
        }
      }
      setCache('ep:' + title, null);
      return null;
    }

    function isPropertyTag(content) {
      if (!content) return false;
      var upper = content.toUpperCase();
      for (var i = 0; i < PROPERTY_TAGS.length; i++) {
        if (upper.indexOf(PROPERTY_TAGS[i]) !== -1) {
          return true;
        }
      }
      return false;
    }

    function isSeasonMarker(content) {
      if (!content) return false;
      return SEASON_MARKERS.test(content.trim());
    }

    function cleanTitle(title) {
      return title
        .replace(/\s*第\s*\d+[\s\-~]*\d*\s*[话集]/gi, '')
        .replace(/\s*\d+[\s\-~]*\d*\s*话/gi, '')
        .replace(/\s*EP\.?\s*\d+/gi, '')
        .replace(/\s*S\d+E\d+/gi, '')
        .replace(/\s*\[\d+\]/g, '')
        .replace(/\s*【[^】]*】/g, '')
        .replace(/\s*『[^』]*』/g, '')
        .replace(/\s*\/\s*/g, ' ')
        .replace(/[\s\-~]+/g, ' ')
        .trim();
    }

    function extractAnimeTitle(title) {
      var cached = getCache('title:' + title);
      if (cached !== null) return cached;

      var result;
      var cornerMatch = title.match(/『([^』]+)』/);
      if (cornerMatch) {
        var cornerContent = cornerMatch[1].trim();
        if (!isPropertyTag(cornerContent)) {
          result = cleanTitle(cornerContent);
          setCache('title:' + title, result);
          return result;
        }
      }

      var bracketMatch = title.match(/【([^】]+)】/);
      if (bracketMatch) {
        var bracketContent = bracketMatch[1].trim();
        if (isPropertyTag(bracketContent) || isSeasonMarker(bracketContent)) {
          var afterBracket = title.replace(/【[^】]+】/, '').trim();
          result = extractAnimeTitleFromCleaned(afterBracket);
          setCache('title:' + title, result);
          return result;
        } else {
          result = cleanTitle(bracketContent);
          setCache('title:' + title, result);
          return result;
        }
      }

      var squareMatch = title.match(/\[([^\]]+)\]/);
      if (squareMatch) {
        var squareContent = squareMatch[1].trim();
        if (!isPropertyTag(squareContent) && !/^\d+$/.test(squareContent)) {
          result = cleanTitle(squareContent);
          setCache('title:' + title, result);
          return result;
        }
        var afterSquare = title.replace(/\[[^\]]+\]/, '').trim();
        result = cleanTitle(afterSquare);
        setCache('title:' + title, result);
        return result;
      }

      result = cleanTitle(title);
      setCache('title:' + title, result);
      return result;
    }

    function extractAnimeTitleFromCleaned(title) {
      var cornerMatch = title.match(/『([^』]+)』/);
      if (cornerMatch && !isPropertyTag(cornerMatch[1].trim())) {
        return cleanTitle(cornerMatch[1].trim());
      }

      var bracketMatch = title.match(/【([^】]+)】/);
      if (bracketMatch) {
        var bracketContent = bracketMatch[1].trim();
        if (!isPropertyTag(bracketContent) && !isSeasonMarker(bracketContent)) {
          return cleanTitle(bracketContent);
        }
      }

      var squareMatch = title.match(/\[([^\]]+)\]/);
      if (squareMatch) {
        var squareContent = squareMatch[1].trim();
        if (!isPropertyTag(squareContent) && !/^\d+$/.test(squareContent)) {
          return cleanTitle(squareContent);
        }
      }

      return cleanTitle(title);
    }

    return {
      extractEpisode: extractEpisode,
      extractAnimeTitle: extractAnimeTitle
    };
  })();


  // ===== BangumiAPI 模块 =====
  BS.BangumiAPI = (function () {
    var BASE_URL = 'https://api.bgm.tv';
    var USER_AGENT = 'BangumiSync/0.5.0 (UserScript)';

    var pendingRequests = {};
    var DEDUP_TTL = 500;

    function getRequestKey(method, url) {
      return method + ' ' + url;
    }

    function dedupRequest(method, url, executeFn) {
      var key = getRequestKey(method, url);
      if (pendingRequests.hasOwnProperty(key)) {
        return pendingRequests[key];
      }

      var promise = executeFn();
      pendingRequests[key] = promise;

      promise.then(function() {
        setTimeout(function() {
          delete pendingRequests[key];
        }, DEDUP_TTL);
      }).catch(function() {
        setTimeout(function() {
          delete pendingRequests[key];
        }, DEDUP_TTL);
      });

      return promise;
    }

    function request(method, path, data, needAuth, retryCount, useDedup) {
      retryCount = retryCount || 0;
      useDedup = useDedup !== false;
      var MAX_RETRIES = 3;
      var RETRY_DELAY_BASE = 1000;

      var executeFn = function() {
        return new Promise(function(resolve, reject) {
          var token = BS.Config.getAccessToken();
          if (needAuth && !token) {
            reject(new Error('未配置 Access Token'));
            return;
          }

          var headers = { 'User-Agent': USER_AGENT };
          if (needAuth) headers['Authorization'] = 'Bearer ' + token;
          if (data && method !== 'GET') headers['Content-Type'] = 'application/json';

          var retryAttempt = 0;

          function doRequest() {
            BS.Platform.httpRequest({
              method: method,
              url: BASE_URL + path,
              headers: headers,
              data: data ? JSON.stringify(data) : null,
              timeout: 30000,
              onload: function(res) {
                if (res.status >= 200 && res.status < 300) {
                  try {
                    resolve(JSON.parse(res.responseText));
                  } catch (e) {
                    resolve(res.responseText);
                  }
                } else {
                  // 指数退避重试：只在服务器错误或超时时重试
                  if ((res.status >= 500 || res.status === 0) && retryAttempt < MAX_RETRIES) {
                    retryAttempt++;
                    var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                    BS.Logger.warn('请求失败，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                    setTimeout(doRequest, delay);
                  } else {
                    try {
                      var err = JSON.parse(res.responseText);
                      reject(new Error(err.message || err.error || '请求失败'));
                    } catch (e) {
                      reject(new Error('请求失败: ' + res.status));
                    }
                  }
                }
              },
              onerror: function() {
                if (retryAttempt < MAX_RETRIES) {
                  retryAttempt++;
                  var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                  BS.Logger.warn('网络错误，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                  setTimeout(doRequest, delay);
                } else {
                  reject(new Error('网络请求失败，已重试' + MAX_RETRIES + '次'));
                }
              },
              ontimeout: function() {
                if (retryAttempt < MAX_RETRIES) {
                  retryAttempt++;
                  var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                  BS.Logger.warn('请求超时，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                  setTimeout(doRequest, delay);
                } else {
                  reject(new Error('请求超时，请检查网络连接，已重试' + MAX_RETRIES + '次'));
                }
              },
              onabort: function() {
                reject(new Error('请求被中断'));
              }
            });
          }

          doRequest();
        });
      };

      if (useDedup) {
        return dedupRequest(method, BASE_URL + path, executeFn);
      }
      return executeFn();
    }

    function verifyToken() {
      return request('GET', '/v0/me', null, true);
    }

    function searchSubjects(keyword, options) {
      options = options || {};
      var query = '?keyword=' + encodeURIComponent(keyword);
      if (options.type) query += '&type=' + options.type;
      if (options.limit) query += '&limit=' + options.limit;
      return request('POST', '/v0/search/subjects' + query, { keyword: keyword, filter: { type: [options.type || 2] } }, false);
    }

    function createOrUpdateCollection(subjectId, payload) {
      return request('POST', '/v0/users/-/collections/' + subjectId, payload || { type: 3 }, true);
    }

    function markSubjectEpisodesWatched(subjectId, episodeIds) {
      return request('PATCH', '/v0/users/-/collections/' + subjectId + '/episodes', {
        episode_id: episodeIds,
        type: 2
      }, true);
    }

    function getEpisodes(subjectId, options) {
      options = options || {};
      var query = '?subject_id=' + subjectId;
      if (options.limit) query += '&limit=' + options.limit;
      if (options.offset) query += '&offset=' + options.offset;
      return request('GET', '/v0/episodes' + query, null, false);
    }

    return {
      verifyToken: verifyToken,
      searchSubjects: searchSubjects,
      createOrUpdateCollection: createOrUpdateCollection,
      markSubjectEpisodesWatched: markSubjectEpisodesWatched,
      getEpisodes: getEpisodes
    };
  })();


  // ===== UI 模块 =====
  BS.UI = (function () {
    // HTML 转义，防止 XSS
    function escHTML(str) {
      if (!str && str !== 0) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // 样式
    var STYLES = [
      '#bgm-floating-container{position:fixed;right:-20px;bottom:20px;z-index:2147483647;transition:right 0.3s cubic-bezier(0.4, 0, 0.2, 1);padding:20px 0 20px 30px;margin:-20px 0 -20px -30px}',
      '#bgm-floating-container.bgm-expanded{right:20px}',
      '#bgm-floating-container.bgm-hidden{transform:translateX(calc(100% + 20px))}',
      '#bgm-floating-container.bgm-fullscreen-hidden{opacity:0;pointer-events:none;transition:opacity 0.3s}',

      '#bgm-floating-ball{width:40px;height:40px;background:rgba(251,114,153,0.95);backdrop-filter:blur(10px);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(251,114,153,0.4),0 0 0 1px rgba(255,255,255,0.2) inset;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);position:relative}',
      '#bgm-floating-container.bgm-expanded #bgm-floating-ball{transform:scale(1.1) rotate(5deg);box-shadow:0 6px 24px rgba(251,114,153,0.5),0 0 0 1px rgba(255,255,255,0.3) inset}',
      '#bgm-floating-ball:active{transform:scale(0.95)}',
      '#bgm-floating-ball .bgm-logo{width:28px;height:28px}',

      '@keyframes bgm-pulse{0%,100%{box-shadow:0 4px 20px rgba(251,114,153,0.4),0 0 0 1px rgba(255,255,255,0.2) inset}50%{box-shadow:0 4px 30px rgba(251,114,153,0.6),0 0 0 1px rgba(255,255,255,0.3) inset,0 0 20px rgba(251,114,153,0.3)}}',
      '#bgm-floating-ball.bgm-pulse{animation:bgm-pulse 2s infinite}',
      '#bgm-floating-ball.bgm-state-searching{animation:bgm-pulse 1.5s infinite}',
      '#bgm-floating-ball.bgm-state-matched{background:rgba(82,196,26,0.95);box-shadow:0 4px 20px rgba(82,196,26,0.4)}',
      '#bgm-floating-ball.bgm-state-no-match{background:rgba(153,153,153,0.95);box-shadow:0 4px 20px rgba(153,153,153,0.4)}',
      '#bgm-floating-ball.bgm-state-error{background:rgba(255,77,79,0.95);box-shadow:0 4px 20px rgba(255,77,79,0.4)}',
      '#bgm-floating-ball .bgm-badge{position:absolute;top:-4px;right:-4px;background:#52c41a;color:#fff;font-size:11px;padding:2px 6px;border-radius:10px;min-width:16px;text-align:center;font-weight:600}',

      '#bgm-floating-menu{position:fixed;right:20px;bottom:70px;width:180px;background:rgba(255,255,255,0.98);backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:2147483646;overflow:hidden;border:1px solid rgba(0,0,0,0.05);transform-origin:bottom right;animation:bgm-menu-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)}',
      '@keyframes bgm-menu-in{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}',
      '#bgm-floating-menu .bgm-menu-item{padding:12px 16px;cursor:pointer;transition:all 0.2s;font-size:14px;display:flex;align-items:center;gap:10px;color:#333}',
      '#bgm-floating-menu .bgm-menu-item:hover{background:linear-gradient(90deg, rgba(251,114,153,0.1), transparent);color:#fb7299}',
      '#bgm-floating-menu .bgm-menu-item:not(:last-child){border-bottom:1px solid rgba(0,0,0,0.05)}',

      '#bgm-sync-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000}',
      '#bgm-sync-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.25);z-index:100001;overflow:hidden;max-height:80vh}',
      '#bgm-sync-toast{position:fixed;top:80px;right:20px;z-index:2147483647;padding:12px 16px;border-radius:8px;color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,0.2)}',
      '#bgm-sync-toast.info{background:#1890ff}',
      '#bgm-sync-toast.success{background:#52c41a}',
      '#bgm-sync-toast.error{background:#ff4d4f}'
    ].join('');

    BS.Platform.addStyles(STYLES);

    function showToast(message, type, duration) {
      type = type || 'info';
      duration = duration || 3000;
      var existing = document.getElementById('bgm-sync-toast');
      if (existing) existing.remove();

      var toast = document.createElement('div');
      toast.id = 'bgm-sync-toast';
      toast.className = type;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(function() {
        toast.remove();
      }, duration);
    }

    function updateFloatingBallState(state, badgeCount) {
      var ball = document.getElementById('bgm-floating-ball');
      if (!ball) return;

      ball.classList.remove('bgm-state-searching', 'bgm-state-matched', 'bgm-state-no-match', 'bgm-state-error');

      var existingBadge = ball.querySelector('.bgm-badge');
      if (existingBadge) existingBadge.remove();

      if (state === 'searching') {
        ball.classList.add('bgm-state-searching');
      } else if (state === 'matched') {
        ball.classList.add('bgm-state-matched');
        if (badgeCount && badgeCount > 0) {
          var badge = document.createElement('span');
          badge.className = 'bgm-badge';
          badge.textContent = badgeCount > 99 ? '99+' : String(badgeCount);
          ball.appendChild(badge);
        }
      } else if (state === 'no_match') {
        ball.classList.add('bgm-state-no-match');
      } else if (state === 'error') {
        ball.classList.add('bgm-state-error');
      }
    }

    function closeOverlay() {
      var overlay = document.getElementById('bgm-sync-overlay');
      var panel = document.getElementById('bgm-sync-panel');
      if (overlay) overlay.remove();
      if (panel) panel.remove();
    }

    function isBiliPlayerWide() {
      if (!!document.fullscreenElement ||
          !!document.webkitFullscreenElement ||
          !!document.mozFullScreenElement ||
          !!document.msFullscreenElement) {
        return true;
      }

      var playerSelectors = ['.bpx-player-container', '#bilibili-player', '.player-container', '#playerWrap', '[class*="player"]'];
      var player = null;
      for (var i = 0; i < playerSelectors.length; i++) {
        player = document.querySelector(playerSelectors[i]);
        if (player) break;
      }

      if (player) {
        var className = player.className || '';
        var wideClasses = [
          'bpx-state-wide',
          'bpx-state-web-fullscreen',
          'bpx-state-fullscreen',
          'mode-web-fullscreen',
          'mode-fullscreen',
          'web-fullscreen',
          'fullscreen',
          'wide'
        ];
        for (var j = 0; j < wideClasses.length; j++) {
          if (className.indexOf(wideClasses[j]) !== -1) {
            return true;
          }
        }
      }

      var bodyClass = document.body ? (document.body.className || '') : '';
      var htmlClass = document.documentElement ? (document.documentElement.className || '') : '';
      var bodyHtmlClasses = ['player-fullscreen', 'player-wide', 'fullscreen', 'wide'];
      for (var k = 0; k < bodyHtmlClasses.length; k++) {
        if (bodyClass.indexOf(bodyHtmlClasses[k]) !== -1 || htmlClass.indexOf(bodyHtmlClasses[k]) !== -1) {
          return true;
        }
      }

      var video = document.querySelector('video');
      if (video) {
        var rect = video.getBoundingClientRect();
        var viewportArea = window.innerWidth * window.innerHeight;
        var videoArea = rect.width * rect.height;
        if (videoArea > viewportArea * 0.6) {
          return true;
        }
      }

      return false;
    }

    function initFullscreenDetection() {
      var container = document.getElementById('bgm-floating-container');
      if (!container) return;

      function handleFullscreenChange() {
        if (!BS.Config.getHideOnWide()) {
          BS.Logger.debug('宽屏隐藏功能已关闭');
          return;
        }

        var isWide = isBiliPlayerWide();
        BS.Logger.debug('宽屏检测: ' + isWide);

        if (isWide) {
          container.classList.add('bgm-fullscreen-hidden');
          BS.Logger.debug('已隐藏悬浮球');
        } else {
          container.classList.remove('bgm-fullscreen-hidden');
          BS.Logger.debug('已显示悬浮球');
        }
      }

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);

      document.addEventListener('click', function(e) {
        var target = e.target;
        if (target) {
          var className = target.className || '';
          var title = target.getAttribute('title') || '';
          if (className.indexOf('fullscreen') !== -1 ||
              className.indexOf('wide') !== -1 ||
              title.indexOf('全屏') !== -1 ||
              title.indexOf('宽屏') !== -1) {
            BS.Logger.debug('检测到全屏/宽屏按钮点击');
            setTimeout(handleFullscreenChange, 300);
            setTimeout(handleFullscreenChange, 600);
          }
        }
      });

      var player = document.querySelector('.bpx-player-container, #bilibili-player, .player-container');
      if (player) {
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              BS.Logger.debug('播放器类名变化: ' + player.className);
              handleFullscreenChange();
            }
          });
        });
        observer.observe(player, { attributes: true, attributeFilter: ['class'] });
        BS.Logger.debug('已监听播放器类名变化');
      }

      setTimeout(handleFullscreenChange, 500);
    }

    var BGM_LOGO_SVG = '<svg class="bgm-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M25 25 L20 10 M75 25 L80 10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<rect x="10" y="25" width="80" height="55" rx="12" ry="12" fill="#fff"/>' +
      '<path d="M45 75 L40 88 L55 75" fill="#fff"/>' +
      '<path d="M32 42 L42 48 L32 54" stroke="#fb7299" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M68 42 L58 48 L68 54" stroke="#fb7299" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M38 62 Q42 58 46 62 Q50 66 54 62 Q58 58 62 62" stroke="#fb7299" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '</svg>';

    function createFloatingBall() {
      if (document.getElementById('bgm-floating-container')) return;

      var container = document.createElement('div');
      container.id = 'bgm-floating-container';

      var ball = document.createElement('div');
      ball.id = 'bgm-floating-ball';
      ball.innerHTML = BGM_LOGO_SVG;
      ball.title = 'Bangumi Sync';

      ball.addEventListener('click', function(e) {
        e.stopPropagation();
        var autoSyncState = (typeof BS.AutoSync !== 'undefined') ? BS.AutoSync.getState() : null;
        var mode = BS.Config.getAutoSyncMode();

        if (mode === 'assist' && autoSyncState) {
          if (autoSyncState.searching) {
            showToast('搜索中，请稍候', 'info');
            return;
          }
          if (autoSyncState.matched && autoSyncState.candidates.length > 0) {
            var info = autoSyncState.videoInfo || BS.BiliWatcher.extractVideoInfo();
            showSearchResults(autoSyncState.candidates, info);
            return;
          }
          if (autoSyncState.searched && !autoSyncState.matched) {
            manualSearch();
            return;
          }
        }

        showFloatingMenu();
      });

      container.appendChild(ball);
      document.body.appendChild(container);

      var hoverDelay = 200;
      var hoverTimer = null;

      container.addEventListener('mouseenter', function() {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function() {
          container.classList.add('bgm-expanded');
        }, hoverDelay);
      });

      container.addEventListener('mouseleave', function() {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        container.classList.remove('bgm-expanded');
      });

      initFullscreenDetection();
    }

    function showFloatingMenu() {
      var existing = document.getElementById('bgm-floating-menu');
      if (existing) {
        existing.remove();
        return;
      }

      var menu = document.createElement('div');
      menu.id = 'bgm-floating-menu';

      var items = [
        { icon: '🔍', text: '搜索并同步', action: searchAndSync },
        { icon: '✏️', text: '手动搜索', action: manualSearch },
        { icon: '➕', text: '添加当前 UP', action: addCurrentUp },
        { icon: '⚙️', text: '设置', action: showSettingsPanel }
      ];

      items.forEach(function(item) {
        var div = document.createElement('div');
        div.className = 'bgm-menu-item';
        div.innerHTML = item.icon + ' ' + item.text;
        div.addEventListener('click', function(e) {
          e.stopPropagation();
          menu.remove();
          item.action();
        });
        menu.appendChild(div);
      });

      document.body.appendChild(menu);

      setTimeout(function() {
        document.addEventListener('click', function closeMenu() {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        });
      }, 100);
    }

    function searchAndSync() {
      var info = BS.BiliWatcher.extractVideoInfo();
      if (!info.upName) {
        showToast('无法识别 UP 信息', 'error');
        return;
      }

      var upConfig = BS.Config.getUpConfig(info.upName) || BS.Config.getUpConfig(info.uid);
      if (!upConfig) {
        showToast('当前 UP 不在白名单中', 'error');
        return;
      }

      var searchTitle = BS.Matcher.extractAnimeTitle(info.title);
      showToast('正在搜索: ' + searchTitle, 'info');

      BS.BangumiAPI.searchSubjects(searchTitle, { limit: 10, type: 2 })
        .then(function(res) {
          var candidates = res && res.data ? res.data : [];
          if (!candidates.length) {
            showToast('未找到匹配条目', 'error');
            return;
          }
          showSearchResults(candidates, info);
        })
        .catch(function(err) {
          showToast('搜索失败: ' + err.message, 'error');
        });
    }

    function tmplSearchResults(candidates) {
      var itemsHtml = candidates.map(function(item, idx) {
        var name = item.name_cn || item.name || '未知';
        var origName = item.name || '';
        var score = item.score ? '评分: ' + item.score : '';
        var date = item.date || '';
        return [
          '<div class="bgm-result-item" data-index="' + idx + '" data-id="' + escHTML(String(item.id)) + '" style="padding:12px 16px;border-bottom:1px solid #eee;cursor:pointer;transition:background 0.2s">',
          '<div style="font-weight:600;font-size:15px">' + escHTML(name) + '</div>',
          origName ? '<div style="font-size:12px;color:#666;margin-top:2px">' + escHTML(origName) + '</div>' : '',
          '<div style="font-size:12px;color:#999;margin-top:4px">' + escHTML(score) + (score && date ? ' | ' : '') + escHTML(date) + '</div>',
          '</div>'
        ].join('');
      }).join('');

      return [
        '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
        '<span>搜索结果</span>',
        '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
        '</div>',
        '<div style="max-height:60vh;overflow:auto">' + itemsHtml + '</div>',
        '<div style="padding:10px 16px;text-align:center;border-top:1px solid #eee">',
        '<button id="bgm-manual-search" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer">没有我要的，手动输入搜索</button>',
        '</div>'
      ].join('');
    }

    function showSearchResults(candidates, videoInfo) {
      closeOverlay();

      var panel = document.createElement('div');
      panel.id = 'bgm-sync-panel';
      panel.style.width = '500px';
      panel.innerHTML = tmplSearchResults(candidates);

      document.body.appendChild(panel);

      document.getElementById('bgm-close').addEventListener('click', closeOverlay);
      document.getElementById('bgm-manual-search').addEventListener('click', function() {
        closeOverlay();
        manualSearch();
      });

      var items = panel.querySelectorAll('.bgm-result-item');
      for (var i = 0; i < items.length; i++) {
        (function(item) {
        item.addEventListener('mouseenter', function() {
          this.style.background = '#f5f5f5';
        });
        item.addEventListener('mouseleave', function() {
          this.style.background = 'transparent';
        });
        item.addEventListener('click', function() {
          var idx = parseInt(this.getAttribute('data-index'), 10);
          var subjectId = parseInt(this.getAttribute('data-id'), 10);
          closeOverlay();
          showEpisodeInput(candidates[idx], videoInfo);
        });
        })(items[i]);
      }
    }

    function tmplEpisodeInput(subject, videoInfo, detectedEp) {
      var subjectName = subject.name_cn || subject.name || '未知番剧';
      var detectedText = detectedEp ? '识别到集数: 第 ' + detectedEp + ' 话' : '未识别到集数，请手动输入';

      return [
        '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
        '<span>同步到 Bangumi</span>',
        '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
        '</div>',
        '<div style="padding:20px">',
        '<div style="margin-bottom:16px">',
        '<div style="font-size:13px;color:#666;margin-bottom:4px">番剧</div>',
        '<div style="font-weight:600">' + escHTML(subjectName) + '</div>',
        '</div>',
        '<div style="margin-bottom:16px">',
        '<div style="font-size:13px;color:#666;margin-bottom:4px">视频标题</div>',
        '<div style="font-size:13px;color:#333;background:#f5f5f5;padding:8px;border-radius:4px">' + escHTML(videoInfo.title) + '</div>',
        '</div>',
        '<div style="margin-bottom:20px">',
        '<div style="font-size:13px;color:#666;margin-bottom:4px">' + detectedText + '</div>',
        '<div style="display:flex;align-items:center;gap:8px">',
        '<span style="font-size:14px">第</span>',
        '<input id="bgm-ep-input" type="number" value="' + (detectedEp || 1) + '" min="1" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:16px">',
        '<span style="font-size:14px">话</span>',
        '</div>',
        '</div>',
        '<div style="margin-bottom:16px;padding:10px 12px;background:#f9f9f9;border-radius:8px">',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#666">',
        '<input id="bgm-fill-previous" type="checkbox" style="width:16px;height:16px;cursor:pointer">',
        '<span>补全前面集数（将第 1~N 话一并标记为看过）</span>',
        '</label>',
        '</div>',
        '<div style="display:flex;justify-content:flex-end;gap:10px">',
        '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
        '<button id="bgm-confirm" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">确认同步</button>',
        '</div>',
        '</div>'
      ].join('');
    }

    function showEpisodeInput(subject, videoInfo) {
      closeOverlay();

      var epResult = BS.Matcher.extractEpisode(videoInfo.title);
      var detectedEp = epResult ? epResult.ep : null;

      var panel = document.createElement('div');
      panel.id = 'bgm-sync-panel';
      panel.style.width = '400px';
      panel.innerHTML = tmplEpisodeInput(subject, videoInfo, detectedEp);

      document.body.appendChild(panel);

      setTimeout(function() {
        var input = document.getElementById('bgm-ep-input');
        input.focus();
        input.select();
      }, 100);

      document.getElementById('bgm-close').addEventListener('click', closeOverlay);
      document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);
      document.getElementById('bgm-confirm').addEventListener('click', function() {
        var ep = parseInt(document.getElementById('bgm-ep-input').value, 10);
        if (!ep || ep < 1) {
          showToast('请输入有效的集数', 'error');
          return;
        }
        var fillPrevious = document.getElementById('bgm-fill-previous').checked;
        closeOverlay();

        var mode = BS.Config.getAutoSyncMode();
        if (mode === 'assist' || mode === 'auto') {
          var cleanTitle = BS.Matcher.extractAnimeTitle(videoInfo.title);
          BS.Config.confirmSubject(videoInfo.upName, cleanTitle, subject.id);
        }

        BS.Orchestrator.sync(subject.id, ep, { fillPrevious: fillPrevious });
      });

      document.getElementById('bgm-ep-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          document.getElementById('bgm-confirm').click();
        }
      });
    }

    function manualSearch() {
      closeOverlay();

      var panel = document.createElement('div');
      panel.id = 'bgm-sync-panel';
      panel.style.width = '400px';

      panel.innerHTML = [
        '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
        '<span>手动搜索</span>',
        '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
        '</div>',
        '<div style="padding:20px">',
        '<div style="margin-bottom:16px">',
        '<div style="font-size:13px;color:#666;margin-bottom:8px">输入番剧名称搜索</div>',
        '<input id="bgm-search-input" type="text" placeholder="例如：葬送的芙莉莲" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box">',
        '</div>',
        '<div style="display:flex;justify-content:flex-end;gap:10px">',
        '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
        '<button id="bgm-search" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">搜索</button>',
        '</div>',
        '</div>'
      ].join('');

      document.body.appendChild(panel);

      setTimeout(function() {
        document.getElementById('bgm-search-input').focus();
      }, 100);

      document.getElementById('bgm-close').addEventListener('click', closeOverlay);
      document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);
      document.getElementById('bgm-search').addEventListener('click', function() {
        var keyword = document.getElementById('bgm-search-input').value.trim();
        if (!keyword) {
          showToast('请输入搜索关键词', 'error');
          return;
        }
        closeOverlay();

        var info = BS.BiliWatcher.extractVideoInfo();
        showToast('正在搜索: ' + keyword, 'info');

        BS.BangumiAPI.searchSubjects(keyword, { limit: 10, type: 2 })
          .then(function(res) {
            var candidates = res && res.data ? res.data : [];
            if (!candidates.length) {
              showToast('未找到匹配条目', 'error');
              return;
            }
            showSearchResults(candidates, info);
          })
          .catch(function(err) {
            showToast('搜索失败: ' + err.message, 'error');
          });
      });

      document.getElementById('bgm-search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          document.getElementById('bgm-search').click();
        }
      });
    }

    function addCurrentUp() {
      var info = BS.BiliWatcher.extractVideoInfo();
      if (!info.upName) {
        showToast('无法识别当前视频的 UP', 'error');
        return;
      }

      var existing = BS.Config.getUpConfig(info.upName) || BS.Config.getUpConfig(info.uid);
      if (existing) {
        showToast('UP 已在白名单中: ' + existing.upName, 'info');
        return;
      }

      BS.Config.addUp({
        upName: info.upName,
        uid: info.uid || null,
        matchMode: info.uid ? 'both' : 'name',
        enabled: true
      });

      showToast('已添加 UP: ' + info.upName, 'success');
    }

    function tmplSettingsPanel(upList, configs) {
      var upHtml = upList.map(function(up, idx) {
        return [
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee">',
          '<div>',
          '<div style="font-weight:500">' + escHTML(up.upName || '未命名') + '</div>',
          up.uid ? '<div style="font-size:12px;color:#999">UID: ' + escHTML(String(up.uid)) + '</div>' : '',
          '</div>',
          '<button class="bgm-remove-up" data-index="' + idx + '" style="padding:4px 10px;border:1px solid #ff4d4f;border-radius:4px;color:#ff4d4f;background:#fff;cursor:pointer;font-size:12px">删除</button>',
          '</div>'
        ].join('');
      }).join('');

      return [
        '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
        '<span>设置</span>',
        '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
        '</div>',
        '<div style="padding:20px;max-height:60vh;overflow:auto">',
        '<div style="margin-bottom:20px">',
        '<div style="font-size:13px;color:#666;margin-bottom:8px">Access Token</div>',
        '<input id="bgm-token-input" type="text" value="' + escHTML(configs.token) + '" placeholder="在 next.bgm.tv/demo/access-token 生成" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box">',
        '<div style="font-size:12px;color:#999;margin-top:4px">Token 地址: <a href="https://next.bgm.tv/demo/access-token" target="_blank" style="color:#fb7299">next.bgm.tv/demo/access-token</a></div>',
        '</div>',
        '<div style="margin-bottom:20px">',
        '<div style="font-size:13px;color:#666;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">',
        '<span>UP 白名单</span>',
        '<button id="bgm-add-up-btn" style="padding:4px 12px;border:0;border-radius:4px;background:#1890ff;color:#fff;cursor:pointer;font-size:12px">+ 添加</button>',
        '</div>',
        '<div style="border:1px solid #eee;border-radius:8px;padding:0 12px;max-height:200px;overflow:auto">',
        upHtml || '<div style="padding:20px;text-align:center;color:#999;font-size:13px">暂无 UP，点击上方按钮添加</div>',
        '</div>',
        '</div>',
        '<div style="margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:8px">',
        '<div style="font-size:13px;color:#666;margin-bottom:8px;font-weight:500">自动同步模式</div>',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;margin-bottom:8px">',
        '<input name="bgm-auto-sync-mode" type="radio" value="off" ' + (configs.autoSyncMode === 'off' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
        '<span>关闭 — 保持现有手动流程</span>',
        '</label>',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;margin-bottom:8px">',
        '<input name="bgm-auto-sync-mode" type="radio" value="assist" ' + (configs.autoSyncMode === 'assist' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
        '<span>智能辅助 — 自动搜索，点击悬浮球快速同步</span>',
        '</label>',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
        '<input name="bgm-auto-sync-mode" type="radio" value="auto" ' + (configs.autoSyncMode === 'auto' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
        '<span style="color:#ff4d4f">全自动（实验性）⚠️ — 播放后自动同步，无需操作</span>',
        '</label>',
        '</div>',
        '<div style="margin-bottom:16px;padding:12px;background:#f9f9f9;border-radius:8px">',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
        '<input id="bgm-hide-wide" type="checkbox" ' + (configs.hideOnWide ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
        '<span>视频宽屏/全屏时自动隐藏悬浮球</span>',
        '</label>',
        '<div style="font-size:12px;color:#999;margin-top:4px;margin-left:24px">避免遮挡视频画面</div>',
        '</div>',
        '<div style="margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:8px">',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
        '<input id="bgm-enable-dedup" type="checkbox" ' + (configs.enableDedup ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
        '<span>24小时内防重复同步</span>',
        '</label>',
        '<div style="font-size:12px;color:#999;margin-top:4px;margin-left:24px">开启后，同一集在24小时内不会重复同步</div>',
        '</div>',
        '<div style="display:flex;justify-content:flex-end;gap:10px">',
        '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
        '<button id="bgm-save" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">保存设置</button>',
        '</div>',
        '</div>'
      ].join('');
    }

    function showSettingsPanel() {
      closeOverlay();

      var upList = BS.Config.getUpWhitelist();

      var panel = document.createElement('div');
      panel.id = 'bgm-sync-panel';
      panel.style.width = '450px';

      var configs = {
        token: BS.Config.getAccessToken(),
        hideOnWide: BS.Config.getHideOnWide(),
        enableDedup: BS.Config.getEnableDedup(),
        autoSyncMode: BS.Config.getAutoSyncMode()
      };

      panel.innerHTML = tmplSettingsPanel(upList, configs);

      document.body.appendChild(panel);

      document.getElementById('bgm-close').addEventListener('click', closeOverlay);
      document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);

      document.getElementById('bgm-save').addEventListener('click', function() {
        var token = document.getElementById('bgm-token-input').value.trim();
        var hideWide = document.getElementById('bgm-hide-wide').checked;
        var enableDedup = document.getElementById('bgm-enable-dedup').checked;

        var autoSyncModeEls = document.getElementsByName('bgm-auto-sync-mode');
        var selectedMode = 'assist';
        for (var i = 0; i < autoSyncModeEls.length; i++) {
          if (autoSyncModeEls[i].checked) {
            selectedMode = autoSyncModeEls[i].value;
            break;
          }
        }

        BS.Config.setAccessToken(token);
        BS.Config.setHideOnWide(hideWide);
        BS.Config.setEnableDedup(enableDedup);
        BS.Config.setAutoSyncMode(selectedMode);
        closeOverlay();
        showToast('设置已保存', 'success');
      });

      document.getElementById('bgm-add-up-btn').addEventListener('click', function() {
        var name = prompt('请输入 UP 名称:');
        if (!name) return;
        var uid = prompt('请输入 UID (可选):');

        BS.Config.addUp({
          upName: name.trim(),
          uid: uid ? uid.trim() : null,
          matchMode: uid ? 'both' : 'name',
          enabled: true
        });

        closeOverlay();
        showSettingsPanel();
        showToast('已添加 UP: ' + name, 'success');
      });

      var removeBtns = panel.querySelectorAll('.bgm-remove-up');
      for (var j = 0; j < removeBtns.length; j++) {
        removeBtns[j].addEventListener('click', function() {
          var idx = parseInt(this.getAttribute('data-index'), 10);
          var upList = BS.Config.getUpWhitelist();
          if (confirm('确定删除 UP "' + upList[idx].upName + '" 吗？')) {
            BS.Config.removeUp(upList[idx].upName);
            closeOverlay();
            showSettingsPanel();
            showToast('已删除', 'success');
          }
        });
      }
    }

    return {
      showToast: showToast,
      createFloatingBall: createFloatingBall,
      closeOverlay: closeOverlay,
      updateFloatingBallState: updateFloatingBallState
    };
  })();


  // ===== BiliWatcher 模块 =====
  BS.BiliWatcher = (function () {
    function extractTitle() {
      var title = '';
      var h1 = document.querySelector('h1.video-title, h1[data-title], h1');
      if (h1) {
        title = (h1.getAttribute('title') || h1.textContent || '').trim();
      }
      if (!title) {
        var og = document.querySelector('meta[property="og:title"]');
        title = og ? (og.getAttribute('content') || '').trim() : '';
      }
      if (!title) {
        title = (document.title || '').replace(/_哔哩哔哩_bilibili$/, '').trim();
      }
      return title;
    }

    function extractUpName() {
      var selectors = [
        '.up-name__text',
        '.username',
        '.up-detail-top .name',
        '.staff-name',
        '[class*="up-name"]',
        '[class*="upName"]',
        '[class*="author"]',
        'a[href*="space.bilibili.com"] span',
        '.video-owner-name',
        '.up-info .name'
      ];
      for (var i = 0; i < selectors.length; i++) {
        var node = document.querySelector(selectors[i]);
        if (node && node.textContent) return node.textContent.trim();
      }
      return '';
    }

    function extractUid() {
      var uid = '';
      var upLinks = document.querySelectorAll('a[href*="space.bilibili.com"]');
      for (var i = 0; i < upLinks.length; i++) {
        var href = upLinks[i].getAttribute('href') || '';
        var uidMatch = href.match(/space\.bilibili\.com\/(\d+)/);
        if (uidMatch) {
          uid = uidMatch[1];
          break;
        }
      }
      if (!uid) {
        var midNode = document.querySelector('[data-mid]');
        if (midNode) uid = midNode.getAttribute('data-mid') || '';
      }
      return uid;
    }

    function extractVideoInfo() {
      return {
        title: extractTitle(),
        upName: extractUpName(),
        uid: extractUid(),
        url: location.href
      };
    }

    function init() {
      BS.UI.createFloatingBall();
      if (typeof BS.VideoObserver !== 'undefined') {
        BS.VideoObserver.init();
      }
      BS.Logger.info('v0.5.0 已加载');
    }

    return {
      init: init,
      extractTitle: extractTitle,
      extractUpName: extractUpName,
      extractUid: extractUid,
      extractVideoInfo: extractVideoInfo
    };
  })();


  // ===== Orchestrator 模块 =====
  BS.Orchestrator = (function () {
    function findEpisodeIds(episodes, targetEp) {
      var ids = [];
      for (var i = 0; i < episodes.length; i++) {
        if (episodes[i].ep === targetEp || episodes[i].sort === targetEp) {
          ids.push(episodes[i].id);
        }
      }
      return ids;
    }

    function sync(subjectId, ep, options) {
      options = options || {};
      var token = BS.Config.getAccessToken();
      if (!token) {
        BS.UI.showToast('未配置 Bangumi Token', 'error', 5000);
        return;
      }

      var fillPrevious = options.fillPrevious === true;

      if (!fillPrevious && BS.Config.isRecentlySynced(subjectId, ep)) {
        BS.UI.showToast('24 小时内已同步过该集', 'info');
        return;
      }

      BS.UI.showToast('正在同步...', 'info');

      BS.BangumiAPI.createOrUpdateCollection(subjectId, { type: 3 })
        .then(function() {
          // 补全模式下拉取足够多的剧集
          var epOptions = fillPrevious ? { limit: Math.max(200, ep + 50) } : undefined;
          return BS.BangumiAPI.getEpisodes(subjectId, epOptions);
        })
        .then(function(epRes) {
          var episodes = epRes && epRes.data ? epRes.data : [];

          if (fillPrevious) {
            // 补全模式：收集第 1 ~ ep 话的所有剧集 ID
            var allIds = [];
            for (var epNum = 1; epNum <= ep; epNum++) {
              var ids = findEpisodeIds(episodes, epNum);
              allIds = allIds.concat(ids);
            }

            if (allIds.length === 0) {
              BS.UI.showToast('未找到第 1~' + ep + ' 话，请检查集数', 'error');
              return;
            }

            return BS.BangumiAPI.markSubjectEpisodesWatched(subjectId, allIds).then(function() {
              return { filled: ep };
            });
          }

          // 单集模式
          var targetEp = null;
          for (var i = 0; i < episodes.length; i++) {
            if (episodes[i].ep === ep || episodes[i].sort === ep) {
              targetEp = episodes[i];
              break;
            }
          }

          if (!targetEp) {
            BS.UI.showToast('未找到第 ' + ep + ' 话，请检查集数', 'error');
            return;
          }

          return BS.BangumiAPI.markSubjectEpisodesWatched(subjectId, [targetEp.id]);
        })
        .then(function(result) {
          if (result && result.filled) {
            // 补全模式：记录所有集数
            for (var epNum = 1; epNum <= result.filled; epNum++) {
              BS.Config.addSyncRecord(subjectId, epNum);
            }
            BS.UI.showToast('补全同步成功！已标记第 1~' + result.filled + ' 话', 'success');
          } else {
            BS.Config.addSyncRecord(subjectId, ep);
            BS.UI.showToast('同步成功！', 'success');
          }
        })
        .catch(function(err) {
          BS.UI.showToast('同步失败: ' + err.message, 'error', 5000);
        });
    }

    return {
      sync: sync
    };
  })();


  // ===== VideoObserver 模块 =====
  // 监听视频播放事件，触发自动同步

  BS.VideoObserver = (function () {
    var hasTriggered = false;
    var currentUrl = '';
    var videoPlayHandler = null;
    var titleObserver = null;

    function findMainVideo() {
      var videos = document.querySelectorAll('video');
      if (videos.length === 0) return null;
      if (videos.length === 1) return videos[0];

      var playerContainers = [
        '.bpx-player-container',
        '#bilibili-player',
        '.player-container',
        '#playerWrap'
      ];
      for (var i = 0; i < playerContainers.length; i++) {
        var container = document.querySelector(playerContainers[i]);
        if (container) {
          var video = container.querySelector('video');
          if (video) return video;
        }
      }

      var maxArea = 0;
      var mainVideo = null;
      for (var j = 0; j < videos.length; j++) {
        var rect = videos[j].getBoundingClientRect();
        var area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          mainVideo = videos[j];
        }
      }
      return mainVideo;
    }

    function bindVideo(video) {
      if (!video || videoPlayHandler) return;

      videoPlayHandler = function() {
        if (hasTriggered) return;
        hasTriggered = true;

        BS.Logger.debug('视频开始播放，触发自动同步检测');

        if (typeof BS.AutoSync !== 'undefined') {
          BS.AutoSync.handlePlayEvent();
        }
      };

      video.addEventListener('play', videoPlayHandler);
    }

    function observeVideo() {
      var video = findMainVideo();
      if (video) {
        bindVideo(video);
        return true;
      }

      var observer = new MutationObserver(function() {
        var v = findMainVideo();
        if (v) {
          bindVideo(v);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(function() {
        observer.disconnect();
      }, 5000);

      return false;
    }

    function handleUrlChange() {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        hasTriggered = false;
        if (videoPlayHandler) {
          var oldVideo = findMainVideo();
          if (oldVideo) {
            oldVideo.removeEventListener('play', videoPlayHandler);
          }
          videoPlayHandler = null;
        }
        // 先取消待处理的搜索，再重置状态
        if (typeof BS.AutoSync !== 'undefined') {
          BS.AutoSync.cancelPendingSearch();
          BS.AutoSync.reset();
        }
        observeVideo();
      }
    }

    function setupUrlChangeDetection() {
      // 监听 popstate（SPA 路由变化）
      window.addEventListener('popstate', handleUrlChange);

      // 监听 title 变化（B 站切换视频时通常会更新标题）
      var titleEl = document.querySelector('title');
      if (titleEl) {
        titleObserver = new MutationObserver(function() {
          handleUrlChange();
        });
        titleObserver.observe(titleEl, { childList: true });
      }

      // 监听 hashchange 作为兜底
      window.addEventListener('hashchange', handleUrlChange);
    }

    function init() {
      currentUrl = location.href;
      hasTriggered = false;
      observeVideo();
      setupUrlChangeDetection();
    }

    function destroy() {
      if (titleObserver) {
        titleObserver.disconnect();
        titleObserver = null;
      }
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      if (videoPlayHandler) {
        var video = findMainVideo();
        if (video) {
          video.removeEventListener('play', videoPlayHandler);
        }
        videoPlayHandler = null;
      }
    }

    return {
      init: init,
      destroy: destroy
    };
  })();


  // ===== AutoSync 模块 =====
  // 自动搜索、匹配状态管理、相似度计算

  BS.AutoSync = (function () {
    var state = {
      searched: false,
      searching: false,
      matched: false,
      candidates: [],
      selectedSubject: null,
      error: null,
      videoInfo: null
    };

    // 防抖控制
    var debounceTimer = null;
    var DEBOUNCE_DELAY = 3000; // 3秒防抖延迟
    var currentSearchPromise = null;
    var isCancelled = false;

    function levenshtein(a, b) {
      var m = a.length, n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;

      var matrix = [];
      for (var i = 0; i <= m; i++) {
        matrix[i] = [i];
      }
      for (var j = 0; j <= n; j++) {
        matrix[0][j] = j;
      }

      for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
          var cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }

      return matrix[m][n];
    }

    function levenshteinSimilarity(a, b) {
      var maxLen = Math.max(a.length, b.length);
      if (maxLen === 0) return 1.0;
      var distance = levenshtein(a, b);
      return 1 - distance / maxLen;
    }

    function similarity(a, b) {
      if (!a || !b) return 0;
      a = a.toLowerCase().replace(/\s+/g, '');
      b = b.toLowerCase().replace(/\s+/g, '');
      if (a === b) return 1.0;

      // 字符重叠率
      var setA = {};
      for (var i = 0; i < a.length; i++) setA[a[i]] = true;
      var overlap = 0;
      for (var i = 0; i < b.length; i++) {
        if (setA[b[i]]) overlap++;
      }
      var overlapScore = overlap / Math.max(a.length, b.length);

      // Levenshtein 相似度
      var levScore = levenshteinSimilarity(a, b);

      return Math.max(overlapScore, levScore);
    }

    function getState() {
      return state;
    }

    function cancelPendingSearch() {
      isCancelled = true;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (currentSearchPromise) {
        // 标记为已取消，实际请求会继续但结果会被忽略
        currentSearchPromise = null;
      }
      BS.Logger.debug('已取消待处理的搜索');
    }

    function debouncedSearch() {
      // 取消之前的防抖定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        BS.Logger.debug('重置防抖定时器');
      }

      // 重置取消标志
      isCancelled = false;

      // 设置新的防抖定时器
      debounceTimer = setTimeout(function() {
        debounceTimer = null;
        if (!isCancelled) {
          executeSearch();
        }
      }, DEBOUNCE_DELAY);

      // 立即更新 UI 为搜索中状态
      if (typeof BS.UI !== 'undefined') {
        BS.UI.updateFloatingBallState('searching');
      }
    }

    function reset() {
      cancelPendingSearch();
      state = {
        searched: false,
        searching: false,
        matched: false,
        candidates: [],
        selectedSubject: null,
        error: null,
        videoInfo: null
      };
      if (typeof BS.UI !== 'undefined') {
        BS.UI.updateFloatingBallState('idle');
      }
    }

    function detect() {
      var mode = BS.Config.getAutoSyncMode();
      if (mode === 'off') return false;

      var token = BS.Config.getAccessToken();
      if (!token) {
        state.error = '未配置 Access Token';
        return false;
      }

      var info = BS.BiliWatcher.extractVideoInfo();
      if (!info.upName) return false;

      var upConfig = BS.Config.getUpConfig(info.upName) || BS.Config.getUpConfig(info.uid);
      if (!upConfig) return false;

      var epResult = BS.Matcher.extractEpisode(info.title);
      if (!epResult) return false;

      state.videoInfo = info;
      return true;
    }

    function executeSearch() {
      if (state.searching || state.searched) return Promise.resolve();

      var mode = BS.Config.getAutoSyncMode();
      if (mode === 'off') return Promise.resolve();

      if (!detect()) {
        if (state.error) {
          if (typeof BS.UI !== 'undefined') BS.UI.updateFloatingBallState('error');
        }
        return Promise.resolve();
      }

      state.searching = true;
      state.error = null;
      if (typeof BS.UI !== 'undefined') BS.UI.updateFloatingBallState('searching');

      var searchTitle = BS.Matcher.extractAnimeTitle(state.videoInfo.title);

      var searchPromise = BS.BangumiAPI.searchSubjects(searchTitle, { limit: 10, type: 2 });
      currentSearchPromise = searchPromise;

      return searchPromise
        .then(function(res) {
          // 如果已被取消，忽略结果
          if (isCancelled) {
            BS.Logger.debug('搜索结果已过期，忽略');
            return;
          }

          state.searching = false;
          state.searched = true;
          currentSearchPromise = null;

          var candidates = res && res.data ? res.data : [];
          state.candidates = candidates;

          if (candidates.length > 0) {
            state.matched = true;
            if (typeof BS.UI !== 'undefined') BS.UI.updateFloatingBallState('matched', candidates.length);
          } else {
            state.matched = false;
            if (typeof BS.UI !== 'undefined') BS.UI.updateFloatingBallState('no_match');
          }

          if (mode === 'auto') {
            handleAutoMode();
          }
        })
        .catch(function(err) {
          // 如果已被取消，忽略错误
          if (isCancelled) {
            BS.Logger.debug('搜索错误已过期，忽略');
            return;
          }

          state.searching = false;
          state.searched = true;
          state.error = err.message || '搜索失败';
          currentSearchPromise = null;
          if (typeof BS.UI !== 'undefined') BS.UI.updateFloatingBallState('error');
        });
    }

    function search() {
      return debouncedSearch();
    }

    function getBestMatch() {
      if (!state.candidates || state.candidates.length === 0) return null;

      var searchTitle = BS.Matcher.extractAnimeTitle(state.videoInfo.title);
      var best = null;
      var bestScore = -1;

      for (var i = 0; i < state.candidates.length; i++) {
        var candidate = state.candidates[i];
        var names = [candidate.name, candidate.name_cn].filter(Boolean);
        for (var j = 0; j < names.length; j++) {
          var score = similarity(searchTitle, names[j]);
          if (score > bestScore) {
            bestScore = score;
            best = { subject: candidate, score: score };
          }
        }
      }

      if (best && bestScore >= BS.Config.getSimilarityThreshold()) {
        return best;
      }
      return null;
    }

    function isFirstTime(upName, cleanTitle) {
      var confirmedId = BS.Config.getConfirmedSubjectId(upName, cleanTitle);
      return !confirmedId;
    }

    function handleAutoMode() {
      var best = getBestMatch();
      if (!best) {
        if (typeof BS.UI !== 'undefined') {
          BS.UI.showToast('自动匹配相似度过低，已降级为辅助模式', 'info');
          BS.UI.updateFloatingBallState('matched', state.candidates.length);
        }
        return;
      }

      var info = state.videoInfo;
      var epResult = BS.Matcher.extractEpisode(info.title);
      var ep = epResult ? epResult.ep : 1;
      var cleanTitle = BS.Matcher.extractAnimeTitle(info.title);

      if (isFirstTime(info.upName, cleanTitle)) {
        if (typeof BS.UI !== 'undefined') {
          BS.UI.showToast('首次观看该番剧，请手动确认一次后后续将自动同步', 'info');
          BS.UI.updateFloatingBallState('matched', state.candidates.length);
        }
        return;
      }

      if (BS.Config.isRecentlySynced(best.subject.id, ep)) {
        if (typeof BS.UI !== 'undefined') {
          BS.UI.showToast('24 小时内已同步过该集', 'info');
        }
        return;
      }

      BS.Orchestrator.sync(best.subject.id, ep);
    }

    function handlePlayEvent() {
      var mode = BS.Config.getAutoSyncMode();
      if (mode === 'off') return;
      search();
    }

    return {
      detect: detect,
      search: search,
      getBestMatch: getBestMatch,
      isFirstTime: isFirstTime,
      handlePlayEvent: handlePlayEvent,
      handleAutoMode: handleAutoMode,
      reset: reset,
      getState: getState,
      cancelPendingSearch: cancelPendingSearch
    };
  })();


  // ===== 初始化 =====
  BS.BiliWatcher.init();

})();
