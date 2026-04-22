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

  function similarity(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase().replace(/\s+/g, '');
    b = b.toLowerCase().replace(/\s+/g, '');
    if (a === b) return 1.0;

    var setA = {};
    for (var i = 0; i < a.length; i++) setA[a[i]] = true;
    var overlap = 0;
    for (var i = 0; i < b.length; i++) {
      if (setA[b[i]]) overlap++;
    }
    return overlap / Math.max(a.length, b.length);
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
    console.log('[BangumiSync] 已取消待处理的搜索');
  }

  function debouncedSearch() {
    // 取消之前的防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      console.log('[BangumiSync] 重置防抖定时器');
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
          console.log('[BangumiSync] 搜索结果已过期，忽略');
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
          console.log('[BangumiSync] 搜索错误已过期，忽略');
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

    BS.Orchestrator.sync(best.subject.id, ep, info);
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
