// ===== Extension Platform Adapter =====
// 适配浏览器扩展的 localStorage 和 XMLHttpRequest

// 配置迁移：将旧格式的 bgm_ 前缀数据迁移到新格式
(function migrateOldConfig() {
  var MIGRATION_FLAG = '__bgm_config_migrated__';
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  var keysToMigrate = [
    'bgm_access_token',
    'bgm_sync_history',
    'bgm_up_whitelist',
    'bgm_hide_on_wide',
    'bgm_enable_dedup',
    'bgm_auto_sync_mode',
    'bgm_auto_sync_subject_map',
    'bgm_auto_sync_threshold'
  ];

  var hasOldData = false;
  keysToMigrate.forEach(function(oldKey) {
    var val = localStorage.getItem(oldKey);
    if (val !== null) {
      hasOldData = true;
      var newKey = oldKey.replace(/^bgm_/, '');
      localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
  });

  if (hasOldData) {
    console.log('[BangumiSync] 配置数据已迁移到新格式');
  }
  localStorage.setItem(MIGRATION_FLAG, 'true');
})();

BS.Platform = {
  getValue: function(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  setValue: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[BangumiSync] Storage error:', e);
    }
  },

  httpRequest: function(options) {
    var xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url, true);

    if (options.headers) {
      for (var key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, options.headers[key]);
        }
      }
    }

    xhr.timeout = options.timeout || 30000;

    xhr.onload = function() {
      options.onload({
        status: xhr.status,
        responseText: xhr.responseText
      });
    };

    xhr.onerror = options.onerror;
    xhr.ontimeout = options.ontimeout;
    xhr.onabort = options.onabort;

    xhr.send(options.data || null);
  },

  addStyles: function(css) {
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
};
