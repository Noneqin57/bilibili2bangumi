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
