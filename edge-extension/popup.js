// Popup 脚本
document.addEventListener('DOMContentLoaded', function() {
  // 打开设置面板按钮
  document.getElementById('open-settings').addEventListener('click', function() {
    // 向当前标签页发送消息，打开设置面板
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('bilibili.com')) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: function() {
            // 触发设置面板打开
            if (window.BangumiSync && window.BangumiSync.UI) {
              window.BangumiSync.UI.showSettingsPanel();
            } else {
              alert('请在B站视频页面使用此功能');
            }
          }
        });
      } else {
        alert('请在B站视频页面使用此功能');
      }
    });
    window.close();
  });

  // 打开 GitHub 按钮
  document.getElementById('open-github').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://github.com/bilibili2bangumi/bilibili2bangumi' });
    window.close();
  });
});
