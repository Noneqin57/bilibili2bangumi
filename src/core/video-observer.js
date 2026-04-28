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
