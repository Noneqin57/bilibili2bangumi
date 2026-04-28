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
    BS.Logger.info('v__VERSION__ 已加载');
  }

  return {
    init: init,
    extractTitle: extractTitle,
    extractUpName: extractUpName,
    extractUid: extractUid,
    extractVideoInfo: extractVideoInfo
  };
})();
