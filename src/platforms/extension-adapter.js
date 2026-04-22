// ===== Extension Platform Adapter =====
// 适配浏览器扩展的 localStorage 和 XMLHttpRequest

BS.Platform = {
  getValue: function(key, fallback) {
    try {
      var val = localStorage.getItem('bgm_' + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  setValue: function(key, value) {
    try {
      localStorage.setItem('bgm_' + key, JSON.stringify(value));
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
