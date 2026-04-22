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
