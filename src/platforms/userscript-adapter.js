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
