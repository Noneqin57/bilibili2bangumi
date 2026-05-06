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

    if (typeof BS.BangumiWatcher !== 'undefined' && BS.BangumiWatcher.isBangumiPage()) {
      var bgmInfo = BS.BangumiWatcher.extractBangumiInfo();
      if (!bgmInfo.title) return false;
      state.videoInfo = {
        title: bgmInfo.title,
        episodeTitle: bgmInfo.episodeTitle,
        ep: bgmInfo.ep,
        url: bgmInfo.url,
        pageType: 'bangumi'
      };
      return true;
    }

    var info = BS.BiliWatcher.extractVideoInfo();
    if (!info.upName) return false;

    var upConfig = BS.Config.getUpConfig(info.upName) || (info.uid && BS.Config.getUpConfig(info.uid));
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

    var searchPromise = BS.BangumiAPI.searchSubjects(searchTitle, { limit: 10 });
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

    if (info.pageType === 'bangumi') {
      var ep = BS.BangumiWatcher.extractEpisode() || 1;
      if (BS.Config.isRecentlySynced(best.subject.id, ep)) {
        if (typeof BS.UI !== 'undefined') {
          BS.UI.showToast('24 小时内已同步过该集', 'info');
        }
        return;
      }
      BS.Orchestrator.sync(best.subject.id, ep);
      return;
    }

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
