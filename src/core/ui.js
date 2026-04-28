// ===== UI 模块 =====
BS.UI = (function () {
  // HTML 转义，防止 XSS
  function escHTML(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 样式
  var STYLES = [
    '#bgm-floating-container{position:fixed;right:-20px;bottom:20px;z-index:2147483647;transition:right 0.3s cubic-bezier(0.4, 0, 0.2, 1);padding:20px 0 20px 30px;margin:-20px 0 -20px -30px}',
    '#bgm-floating-container.bgm-expanded{right:20px}',
    '#bgm-floating-container.bgm-hidden{transform:translateX(calc(100% + 20px))}',
    '#bgm-floating-container.bgm-fullscreen-hidden{opacity:0;pointer-events:none;transition:opacity 0.3s}',

    '#bgm-floating-ball{width:40px;height:40px;background:rgba(251,114,153,0.95);backdrop-filter:blur(10px);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(251,114,153,0.4),0 0 0 1px rgba(255,255,255,0.2) inset;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);position:relative}',
    '#bgm-floating-container.bgm-expanded #bgm-floating-ball{transform:scale(1.1) rotate(5deg);box-shadow:0 6px 24px rgba(251,114,153,0.5),0 0 0 1px rgba(255,255,255,0.3) inset}',
    '#bgm-floating-ball:active{transform:scale(0.95)}',
    '#bgm-floating-ball .bgm-logo{width:28px;height:28px}',

    '@keyframes bgm-pulse{0%,100%{box-shadow:0 4px 20px rgba(251,114,153,0.4),0 0 0 1px rgba(255,255,255,0.2) inset}50%{box-shadow:0 4px 30px rgba(251,114,153,0.6),0 0 0 1px rgba(255,255,255,0.3) inset,0 0 20px rgba(251,114,153,0.3)}}',
    '#bgm-floating-ball.bgm-pulse{animation:bgm-pulse 2s infinite}',
    '#bgm-floating-ball.bgm-state-searching{animation:bgm-pulse 1.5s infinite}',
    '#bgm-floating-ball.bgm-state-matched{background:rgba(82,196,26,0.95);box-shadow:0 4px 20px rgba(82,196,26,0.4)}',
    '#bgm-floating-ball.bgm-state-no-match{background:rgba(153,153,153,0.95);box-shadow:0 4px 20px rgba(153,153,153,0.4)}',
    '#bgm-floating-ball.bgm-state-error{background:rgba(255,77,79,0.95);box-shadow:0 4px 20px rgba(255,77,79,0.4)}',
    '#bgm-floating-ball .bgm-badge{position:absolute;top:-4px;right:-4px;background:#52c41a;color:#fff;font-size:11px;padding:2px 6px;border-radius:10px;min-width:16px;text-align:center;font-weight:600}',

    '#bgm-floating-menu{position:fixed;right:20px;bottom:70px;width:180px;background:rgba(255,255,255,0.98);backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:2147483646;overflow:hidden;border:1px solid rgba(0,0,0,0.05);transform-origin:bottom right;animation:bgm-menu-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)}',
    '@keyframes bgm-menu-in{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}',
    '#bgm-floating-menu .bgm-menu-item{padding:12px 16px;cursor:pointer;transition:all 0.2s;font-size:14px;display:flex;align-items:center;gap:10px;color:#333}',
    '#bgm-floating-menu .bgm-menu-item:hover{background:linear-gradient(90deg, rgba(251,114,153,0.1), transparent);color:#fb7299}',
    '#bgm-floating-menu .bgm-menu-item:not(:last-child){border-bottom:1px solid rgba(0,0,0,0.05)}',

    '#bgm-sync-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000}',
    '#bgm-sync-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.25);z-index:100001;overflow:hidden;max-height:80vh}',
    '#bgm-sync-toast{position:fixed;top:80px;right:20px;z-index:2147483647;padding:12px 16px;border-radius:8px;color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,0.2)}',
    '#bgm-sync-toast.info{background:#1890ff}',
    '#bgm-sync-toast.success{background:#52c41a}',
    '#bgm-sync-toast.error{background:#ff4d4f}'
  ].join('');

  BS.Platform.addStyles(STYLES);

  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var existing = document.getElementById('bgm-sync-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'bgm-sync-toast';
    toast.className = type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.remove();
    }, duration);
  }

  function updateFloatingBallState(state, badgeCount) {
    var ball = document.getElementById('bgm-floating-ball');
    if (!ball) return;

    ball.classList.remove('bgm-state-searching', 'bgm-state-matched', 'bgm-state-no-match', 'bgm-state-error');

    var existingBadge = ball.querySelector('.bgm-badge');
    if (existingBadge) existingBadge.remove();

    if (state === 'searching') {
      ball.classList.add('bgm-state-searching');
    } else if (state === 'matched') {
      ball.classList.add('bgm-state-matched');
      if (badgeCount && badgeCount > 0) {
        var badge = document.createElement('span');
        badge.className = 'bgm-badge';
        badge.textContent = badgeCount > 99 ? '99+' : String(badgeCount);
        ball.appendChild(badge);
      }
    } else if (state === 'no_match') {
      ball.classList.add('bgm-state-no-match');
    } else if (state === 'error') {
      ball.classList.add('bgm-state-error');
    }
  }

  function closeOverlay() {
    var overlay = document.getElementById('bgm-sync-overlay');
    var panel = document.getElementById('bgm-sync-panel');
    if (overlay) overlay.remove();
    if (panel) panel.remove();
  }

  function isBiliPlayerWide() {
    if (!!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement ||
        !!document.msFullscreenElement) {
      return true;
    }

    var playerSelectors = ['.bpx-player-container', '#bilibili-player', '.player-container', '#playerWrap', '[class*="player"]'];
    var player = null;
    for (var i = 0; i < playerSelectors.length; i++) {
      player = document.querySelector(playerSelectors[i]);
      if (player) break;
    }

    if (player) {
      var className = player.className || '';
      var wideClasses = [
        'bpx-state-wide',
        'bpx-state-web-fullscreen',
        'bpx-state-fullscreen',
        'mode-web-fullscreen',
        'mode-fullscreen',
        'web-fullscreen',
        'fullscreen',
        'wide'
      ];
      for (var j = 0; j < wideClasses.length; j++) {
        if (className.indexOf(wideClasses[j]) !== -1) {
          return true;
        }
      }
    }

    var bodyClass = document.body ? (document.body.className || '') : '';
    var htmlClass = document.documentElement ? (document.documentElement.className || '') : '';
    var bodyHtmlClasses = ['player-fullscreen', 'player-wide', 'fullscreen', 'wide'];
    for (var k = 0; k < bodyHtmlClasses.length; k++) {
      if (bodyClass.indexOf(bodyHtmlClasses[k]) !== -1 || htmlClass.indexOf(bodyHtmlClasses[k]) !== -1) {
        return true;
      }
    }

    var video = document.querySelector('video');
    if (video) {
      var rect = video.getBoundingClientRect();
      var viewportArea = window.innerWidth * window.innerHeight;
      var videoArea = rect.width * rect.height;
      if (videoArea > viewportArea * 0.6) {
        return true;
      }
    }

    return false;
  }

  function initFullscreenDetection() {
    var container = document.getElementById('bgm-floating-container');
    if (!container) return;

    function handleFullscreenChange() {
      if (!BS.Config.getHideOnWide()) {
        BS.Logger.debug('宽屏隐藏功能已关闭');
        return;
      }

      var isWide = isBiliPlayerWide();
      BS.Logger.debug('宽屏检测: ' + isWide);

      if (isWide) {
        container.classList.add('bgm-fullscreen-hidden');
        BS.Logger.debug('已隐藏悬浮球');
      } else {
        container.classList.remove('bgm-fullscreen-hidden');
        BS.Logger.debug('已显示悬浮球');
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('click', function(e) {
      var target = e.target;
      if (target) {
        var className = target.className || '';
        var title = target.getAttribute('title') || '';
        if (className.indexOf('fullscreen') !== -1 ||
            className.indexOf('wide') !== -1 ||
            title.indexOf('全屏') !== -1 ||
            title.indexOf('宽屏') !== -1) {
          BS.Logger.debug('检测到全屏/宽屏按钮点击');
          setTimeout(handleFullscreenChange, 300);
          setTimeout(handleFullscreenChange, 600);
        }
      }
    });

    var player = document.querySelector('.bpx-player-container, #bilibili-player, .player-container');
    if (player) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            BS.Logger.debug('播放器类名变化: ' + player.className);
            handleFullscreenChange();
          }
        });
      });
      observer.observe(player, { attributes: true, attributeFilter: ['class'] });
      BS.Logger.debug('已监听播放器类名变化');
    }

    setTimeout(handleFullscreenChange, 500);
  }

  var BGM_LOGO_SVG = '<svg class="bgm-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M25 25 L20 10 M75 25 L80 10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<rect x="10" y="25" width="80" height="55" rx="12" ry="12" fill="#fff"/>' +
    '<path d="M45 75 L40 88 L55 75" fill="#fff"/>' +
    '<path d="M32 42 L42 48 L32 54" stroke="#fb7299" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M68 42 L58 48 L68 54" stroke="#fb7299" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M38 62 Q42 58 46 62 Q50 66 54 62 Q58 58 62 62" stroke="#fb7299" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  function createFloatingBall() {
    if (document.getElementById('bgm-floating-container')) return;

    var container = document.createElement('div');
    container.id = 'bgm-floating-container';

    var ball = document.createElement('div');
    ball.id = 'bgm-floating-ball';
    ball.innerHTML = BGM_LOGO_SVG;
    ball.title = 'Bangumi Sync';

    ball.addEventListener('click', function(e) {
      e.stopPropagation();
      var autoSyncState = (typeof BS.AutoSync !== 'undefined') ? BS.AutoSync.getState() : null;
      var mode = BS.Config.getAutoSyncMode();

      if (mode === 'assist' && autoSyncState) {
        if (autoSyncState.searching) {
          showToast('搜索中，请稍候', 'info');
          return;
        }
        if (autoSyncState.matched && autoSyncState.candidates.length > 0) {
          var info = autoSyncState.videoInfo || BS.BiliWatcher.extractVideoInfo();
          showSearchResults(autoSyncState.candidates, info);
          return;
        }
        if (autoSyncState.searched && !autoSyncState.matched) {
          manualSearch();
          return;
        }
      }

      showFloatingMenu();
    });

    container.appendChild(ball);
    document.body.appendChild(container);

    var hoverDelay = 200;
    var hoverTimer = null;

    container.addEventListener('mouseenter', function() {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function() {
        container.classList.add('bgm-expanded');
      }, hoverDelay);
    });

    container.addEventListener('mouseleave', function() {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      container.classList.remove('bgm-expanded');
    });

    initFullscreenDetection();
  }

  function showFloatingMenu() {
    var existing = document.getElementById('bgm-floating-menu');
    if (existing) {
      existing.remove();
      return;
    }

    var menu = document.createElement('div');
    menu.id = 'bgm-floating-menu';

    var items = [
      { icon: '🔍', text: '搜索并同步', action: searchAndSync },
      { icon: '✏️', text: '手动搜索', action: manualSearch },
      { icon: '➕', text: '添加当前 UP', action: addCurrentUp },
      { icon: '⚙️', text: '设置', action: showSettingsPanel }
    ];

    items.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'bgm-menu-item';
      div.innerHTML = item.icon + ' ' + item.text;
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        menu.remove();
        item.action();
      });
      menu.appendChild(div);
    });

    document.body.appendChild(menu);

    setTimeout(function() {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 100);
  }

  function searchAndSync() {
    var info = BS.BiliWatcher.extractVideoInfo();
    if (!info.upName) {
      showToast('无法识别 UP 信息', 'error');
      return;
    }

    var upConfig = BS.Config.getUpConfig(info.upName) || BS.Config.getUpConfig(info.uid);
    if (!upConfig) {
      showToast('当前 UP 不在白名单中', 'error');
      return;
    }

    var searchTitle = BS.Matcher.extractAnimeTitle(info.title);
    showToast('正在搜索: ' + searchTitle, 'info');

    BS.BangumiAPI.searchSubjects(searchTitle, { limit: 10, type: 2 })
      .then(function(res) {
        var candidates = res && res.data ? res.data : [];
        if (!candidates.length) {
          showToast('未找到匹配条目', 'error');
          return;
        }
        showSearchResults(candidates, info);
      })
      .catch(function(err) {
        showToast('搜索失败: ' + err.message, 'error');
      });
  }

  function tmplSearchResults(candidates) {
    var itemsHtml = candidates.map(function(item, idx) {
      var name = item.name_cn || item.name || '未知';
      var origName = item.name || '';
      var score = item.score ? '评分: ' + item.score : '';
      var date = item.date || '';
      return [
        '<div class="bgm-result-item" data-index="' + idx + '" data-id="' + escHTML(String(item.id)) + '" style="padding:12px 16px;border-bottom:1px solid #eee;cursor:pointer;transition:background 0.2s">',
        '<div style="font-weight:600;font-size:15px">' + escHTML(name) + '</div>',
        origName ? '<div style="font-size:12px;color:#666;margin-top:2px">' + escHTML(origName) + '</div>' : '',
        '<div style="font-size:12px;color:#999;margin-top:4px">' + escHTML(score) + (score && date ? ' | ' : '') + escHTML(date) + '</div>',
        '</div>'
      ].join('');
    }).join('');

    return [
      '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
      '<span>搜索结果</span>',
      '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
      '</div>',
      '<div style="max-height:60vh;overflow:auto">' + itemsHtml + '</div>',
      '<div style="padding:10px 16px;text-align:center;border-top:1px solid #eee">',
      '<button id="bgm-manual-search" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer">没有我要的，手动输入搜索</button>',
      '</div>'
    ].join('');
  }

  function showSearchResults(candidates, videoInfo) {
    closeOverlay();

    var panel = document.createElement('div');
    panel.id = 'bgm-sync-panel';
    panel.style.width = '500px';
    panel.innerHTML = tmplSearchResults(candidates);

    document.body.appendChild(panel);

    document.getElementById('bgm-close').addEventListener('click', closeOverlay);
    document.getElementById('bgm-manual-search').addEventListener('click', function() {
      closeOverlay();
      manualSearch();
    });

    var items = panel.querySelectorAll('.bgm-result-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
      item.addEventListener('mouseenter', function() {
        this.style.background = '#f5f5f5';
      });
      item.addEventListener('mouseleave', function() {
        this.style.background = 'transparent';
      });
      item.addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        var subjectId = parseInt(this.getAttribute('data-id'), 10);
        closeOverlay();
        showEpisodeInput(candidates[idx], videoInfo);
      });
      })(items[i]);
    }
  }

  function tmplEpisodeInput(subject, videoInfo, detectedEp) {
    var subjectName = subject.name_cn || subject.name || '未知番剧';
    var detectedText = detectedEp ? '识别到集数: 第 ' + detectedEp + ' 话' : '未识别到集数，请手动输入';

    return [
      '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
      '<span>同步到 Bangumi</span>',
      '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
      '</div>',
      '<div style="padding:20px">',
      '<div style="margin-bottom:16px">',
      '<div style="font-size:13px;color:#666;margin-bottom:4px">番剧</div>',
      '<div style="font-weight:600">' + escHTML(subjectName) + '</div>',
      '</div>',
      '<div style="margin-bottom:16px">',
      '<div style="font-size:13px;color:#666;margin-bottom:4px">视频标题</div>',
      '<div style="font-size:13px;color:#333;background:#f5f5f5;padding:8px;border-radius:4px">' + escHTML(videoInfo.title) + '</div>',
      '</div>',
      '<div style="margin-bottom:20px">',
      '<div style="font-size:13px;color:#666;margin-bottom:4px">' + detectedText + '</div>',
      '<div style="display:flex;align-items:center;gap:8px">',
      '<span style="font-size:14px">第</span>',
      '<input id="bgm-ep-input" type="number" value="' + (detectedEp || 1) + '" min="1" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:16px">',
      '<span style="font-size:14px">话</span>',
      '</div>',
      '</div>',
      '<div style="display:flex;justify-content:flex-end;gap:10px">',
      '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
      '<button id="bgm-confirm" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">确认同步</button>',
      '</div>',
      '</div>'
    ].join('');
  }

  function showEpisodeInput(subject, videoInfo) {
    closeOverlay();

    var epResult = BS.Matcher.extractEpisode(videoInfo.title);
    var detectedEp = epResult ? epResult.ep : null;

    var panel = document.createElement('div');
    panel.id = 'bgm-sync-panel';
    panel.style.width = '400px';
    panel.innerHTML = tmplEpisodeInput(subject, videoInfo, detectedEp);

    document.body.appendChild(panel);

    setTimeout(function() {
      var input = document.getElementById('bgm-ep-input');
      input.focus();
      input.select();
    }, 100);

    document.getElementById('bgm-close').addEventListener('click', closeOverlay);
    document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);
    document.getElementById('bgm-confirm').addEventListener('click', function() {
      var ep = parseInt(document.getElementById('bgm-ep-input').value, 10);
      if (!ep || ep < 1) {
        showToast('请输入有效的集数', 'error');
        return;
      }
      closeOverlay();

      var mode = BS.Config.getAutoSyncMode();
      if (mode === 'assist' || mode === 'auto') {
        var cleanTitle = BS.Matcher.extractAnimeTitle(videoInfo.title);
        BS.Config.confirmSubject(videoInfo.upName, cleanTitle, subject.id);
      }

      BS.Orchestrator.sync(subject.id, ep);
    });

    document.getElementById('bgm-ep-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('bgm-confirm').click();
      }
    });
  }

  function manualSearch() {
    closeOverlay();

    var panel = document.createElement('div');
    panel.id = 'bgm-sync-panel';
    panel.style.width = '400px';

    panel.innerHTML = [
      '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
      '<span>手动搜索</span>',
      '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
      '</div>',
      '<div style="padding:20px">',
      '<div style="margin-bottom:16px">',
      '<div style="font-size:13px;color:#666;margin-bottom:8px">输入番剧名称搜索</div>',
      '<input id="bgm-search-input" type="text" placeholder="例如：葬送的芙莉莲" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box">',
      '</div>',
      '<div style="display:flex;justify-content:flex-end;gap:10px">',
      '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
      '<button id="bgm-search" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">搜索</button>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(panel);

    setTimeout(function() {
      document.getElementById('bgm-search-input').focus();
    }, 100);

    document.getElementById('bgm-close').addEventListener('click', closeOverlay);
    document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);
    document.getElementById('bgm-search').addEventListener('click', function() {
      var keyword = document.getElementById('bgm-search-input').value.trim();
      if (!keyword) {
        showToast('请输入搜索关键词', 'error');
        return;
      }
      closeOverlay();

      var info = BS.BiliWatcher.extractVideoInfo();
      showToast('正在搜索: ' + keyword, 'info');

      BS.BangumiAPI.searchSubjects(keyword, { limit: 10, type: 2 })
        .then(function(res) {
          var candidates = res && res.data ? res.data : [];
          if (!candidates.length) {
            showToast('未找到匹配条目', 'error');
            return;
          }
          showSearchResults(candidates, info);
        })
        .catch(function(err) {
          showToast('搜索失败: ' + err.message, 'error');
        });
    });

    document.getElementById('bgm-search-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('bgm-search').click();
      }
    });
  }

  function addCurrentUp() {
    var info = BS.BiliWatcher.extractVideoInfo();
    if (!info.upName) {
      showToast('无法识别当前视频的 UP', 'error');
      return;
    }

    var existing = BS.Config.getUpConfig(info.upName) || BS.Config.getUpConfig(info.uid);
    if (existing) {
      showToast('UP 已在白名单中: ' + existing.upName, 'info');
      return;
    }

    BS.Config.addUp({
      upName: info.upName,
      uid: info.uid || null,
      matchMode: info.uid ? 'both' : 'name',
      enabled: true
    });

    showToast('已添加 UP: ' + info.upName, 'success');
  }

  function tmplSettingsPanel(upList, configs) {
    var upHtml = upList.map(function(up, idx) {
      return [
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee">',
        '<div>',
        '<div style="font-weight:500">' + escHTML(up.upName || '未命名') + '</div>',
        up.uid ? '<div style="font-size:12px;color:#999">UID: ' + escHTML(String(up.uid)) + '</div>' : '',
        '</div>',
        '<button class="bgm-remove-up" data-index="' + idx + '" style="padding:4px 10px;border:1px solid #ff4d4f;border-radius:4px;color:#ff4d4f;background:#fff;cursor:pointer;font-size:12px">删除</button>',
        '</div>'
      ].join('');
    }).join('');

    return [
      '<div style="padding:14px 16px;background:#fb7299;color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center">',
      '<span>设置</span>',
      '<span id="bgm-close" style="cursor:pointer;font-size:20px">×</span>',
      '</div>',
      '<div style="padding:20px;max-height:60vh;overflow:auto">',
      '<div style="margin-bottom:20px">',
      '<div style="font-size:13px;color:#666;margin-bottom:8px">Access Token</div>',
      '<input id="bgm-token-input" type="text" value="' + escHTML(configs.token) + '" placeholder="在 next.bgm.tv/demo/access-token 生成" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box">',
      '<div style="font-size:12px;color:#999;margin-top:4px">Token 地址: <a href="https://next.bgm.tv/demo/access-token" target="_blank" style="color:#fb7299">next.bgm.tv/demo/access-token</a></div>',
      '</div>',
      '<div style="margin-bottom:20px">',
      '<div style="font-size:13px;color:#666;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">',
      '<span>UP 白名单</span>',
      '<button id="bgm-add-up-btn" style="padding:4px 12px;border:0;border-radius:4px;background:#1890ff;color:#fff;cursor:pointer;font-size:12px">+ 添加</button>',
      '</div>',
      '<div style="border:1px solid #eee;border-radius:8px;padding:0 12px;max-height:200px;overflow:auto">',
      upHtml || '<div style="padding:20px;text-align:center;color:#999;font-size:13px">暂无 UP，点击上方按钮添加</div>',
      '</div>',
      '</div>',
      '<div style="margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:8px">',
      '<div style="font-size:13px;color:#666;margin-bottom:8px;font-weight:500">自动同步模式</div>',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;margin-bottom:8px">',
      '<input name="bgm-auto-sync-mode" type="radio" value="off" ' + (configs.autoSyncMode === 'off' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
      '<span>关闭 — 保持现有手动流程</span>',
      '</label>',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;margin-bottom:8px">',
      '<input name="bgm-auto-sync-mode" type="radio" value="assist" ' + (configs.autoSyncMode === 'assist' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
      '<span>智能辅助 — 自动搜索，点击悬浮球快速同步</span>',
      '</label>',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
      '<input name="bgm-auto-sync-mode" type="radio" value="auto" ' + (configs.autoSyncMode === 'auto' ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
      '<span style="color:#ff4d4f">全自动（实验性）⚠️ — 播放后自动同步，无需操作</span>',
      '</label>',
      '</div>',
      '<div style="margin-bottom:16px;padding:12px;background:#f9f9f9;border-radius:8px">',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
      '<input id="bgm-hide-wide" type="checkbox" ' + (configs.hideOnWide ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
      '<span>视频宽屏/全屏时自动隐藏悬浮球</span>',
      '</label>',
      '<div style="font-size:12px;color:#999;margin-top:4px;margin-left:24px">避免遮挡视频画面</div>',
      '</div>',
      '<div style="margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:8px">',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px">',
      '<input id="bgm-enable-dedup" type="checkbox" ' + (configs.enableDedup ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">',
      '<span>24小时内防重复同步</span>',
      '</label>',
      '<div style="font-size:12px;color:#999;margin-top:4px;margin-left:24px">开启后，同一集在24小时内不会重复同步</div>',
      '</div>',
      '<div style="display:flex;justify-content:flex-end;gap:10px">',
      '<button id="bgm-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">取消</button>',
      '<button id="bgm-save" style="padding:8px 16px;border:0;border-radius:6px;background:#fb7299;color:#fff;cursor:pointer">保存设置</button>',
      '</div>',
      '</div>'
    ].join('');
  }

  function showSettingsPanel() {
    closeOverlay();

    var upList = BS.Config.getUpWhitelist();

    var panel = document.createElement('div');
    panel.id = 'bgm-sync-panel';
    panel.style.width = '450px';

    var configs = {
      token: BS.Config.getAccessToken(),
      hideOnWide: BS.Config.getHideOnWide(),
      enableDedup: BS.Config.getEnableDedup(),
      autoSyncMode: BS.Config.getAutoSyncMode()
    };

    panel.innerHTML = tmplSettingsPanel(upList, configs);

    document.body.appendChild(panel);

    document.getElementById('bgm-close').addEventListener('click', closeOverlay);
    document.getElementById('bgm-cancel').addEventListener('click', closeOverlay);

    document.getElementById('bgm-save').addEventListener('click', function() {
      var token = document.getElementById('bgm-token-input').value.trim();
      var hideWide = document.getElementById('bgm-hide-wide').checked;
      var enableDedup = document.getElementById('bgm-enable-dedup').checked;

      var autoSyncModeEls = document.getElementsByName('bgm-auto-sync-mode');
      var selectedMode = 'assist';
      for (var i = 0; i < autoSyncModeEls.length; i++) {
        if (autoSyncModeEls[i].checked) {
          selectedMode = autoSyncModeEls[i].value;
          break;
        }
      }

      BS.Config.setAccessToken(token);
      BS.Config.setHideOnWide(hideWide);
      BS.Config.setEnableDedup(enableDedup);
      BS.Config.setAutoSyncMode(selectedMode);
      closeOverlay();
      showToast('设置已保存', 'success');
    });

    document.getElementById('bgm-add-up-btn').addEventListener('click', function() {
      var name = prompt('请输入 UP 名称:');
      if (!name) return;
      var uid = prompt('请输入 UID (可选):');

      BS.Config.addUp({
        upName: name.trim(),
        uid: uid ? uid.trim() : null,
        matchMode: uid ? 'both' : 'name',
        enabled: true
      });

      closeOverlay();
      showSettingsPanel();
      showToast('已添加 UP: ' + name, 'success');
    });

    var removeBtns = panel.querySelectorAll('.bgm-remove-up');
    for (var j = 0; j < removeBtns.length; j++) {
      removeBtns[j].addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        var upList = BS.Config.getUpWhitelist();
        if (confirm('确定删除 UP "' + upList[idx].upName + '" 吗？')) {
          BS.Config.removeUp(upList[idx].upName);
          closeOverlay();
          showSettingsPanel();
          showToast('已删除', 'success');
        }
      });
    }
  }

  return {
    showToast: showToast,
    createFloatingBall: createFloatingBall,
    closeOverlay: closeOverlay,
    updateFloatingBallState: updateFloatingBallState
  };
})();
