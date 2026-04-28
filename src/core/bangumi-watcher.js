// ===== BangumiWatcher 模块 =====
// 从 B 站番剧页面提取番剧信息（无 UP 概念，使用 __INITIAL_STATE__ 结构化数据）

BS.BangumiWatcher = (function () {
  function isBangumiPage() {
    return /^\/bangumi\/play\//.test(location.pathname);
  }

  function getInitialState() {
    try {
      if (window.__INITIAL_STATE__) {
        return window.__INITIAL_STATE__;
      }
    } catch (e) {
      /* 忽略 */
    }
    return null;
  }

  function extractTitle() {
    var state = getInitialState();

    if (state) {
      if (state.mediaInfo) {
        var t = state.mediaInfo.title || state.mediaInfo.season_title || '';
        if (t) return t.trim();
      }
    }

    var og = document.querySelector('meta[property="og:title"]');
    if (og) {
      var ogTitle = (og.getAttribute('content') || '').trim();
      if (ogTitle) return ogTitle;
    }

    var docTitle = document.title || '';
    docTitle = docTitle.replace(/[_-]番剧.*$/, '').replace(/[_-]哔哩哔哩.*$/, '').replace(/_bilibili$/i, '').trim();
    return docTitle;
  }

  function extractEpisode() {
    var state = getInitialState();

    if (state) {
      if (state.epInfo) {
        var raw = state.epInfo.index !== undefined ? state.epInfo.index
          : state.epInfo.ep_index !== undefined ? state.epInfo.ep_index
          : state.epInfo.ep ? state.epInfo.ep
          : null;

        if (raw !== null && raw !== undefined) {
          var ep = typeof raw === 'string' ? parseInt(raw, 10) : raw;
          if (!isNaN(ep) && ep > 0) return ep;
        }

        var title = state.epInfo.title || state.epInfo.long_title || '';
        var m = title.match(/第\s*(\d+)/);
        if (m) {
          var fromTitle = parseInt(m[1], 10);
          if (!isNaN(fromTitle) && fromTitle > 0) return fromTitle;
        }
      }
    }

    return null;
  }

  function extractEpisodeTitle() {
    var state = getInitialState();

    if (state && state.epInfo) {
      var t = state.epInfo.long_title || state.epInfo.title || '';
      if (t) return t.trim();
    }

    return '';
  }

  function extractBangumiInfo() {
    return {
      title: extractTitle(),
      ep: extractEpisode(),
      episodeTitle: extractEpisodeTitle(),
      url: location.href
    };
  }

  function init() {
    BS.UI.createFloatingBall();
    if (typeof BS.VideoObserver !== 'undefined') {
      BS.VideoObserver.init();
    }
    BS.Logger.info('v__VERSION__ 已加载（番剧页面）');
  }

  return {
    isBangumiPage: isBangumiPage,
    extractBangumiInfo: extractBangumiInfo,
    extractEpisode: extractEpisode,
    extractTitle: extractTitle,
    init: init
  };
})();
