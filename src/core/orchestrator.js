// ===== Orchestrator 模块 =====
BS.Orchestrator = (function () {
  function sync(subjectId, ep, videoInfo) {
    var token = BS.Config.getAccessToken();
    if (!token) {
      BS.UI.showToast('未配置 Bangumi Token', 'error', 5000);
      return;
    }

    if (BS.Config.isRecentlySynced(subjectId, ep)) {
      BS.UI.showToast('24 小时内已同步过该集', 'info');
      return;
    }

    BS.UI.showToast('正在同步...', 'info');

    BS.BangumiAPI.createOrUpdateCollection(subjectId, { type: 3 })
      .then(function() {
        return BS.BangumiAPI.getEpisodes(subjectId);
      })
      .then(function(epRes) {
        var episodes = epRes && epRes.data ? epRes.data : [];
        var targetEp = null;
        for (var i = 0; i < episodes.length; i++) {
          if (episodes[i].ep === ep || episodes[i].sort === ep) {
            targetEp = episodes[i];
            break;
          }
        }

        if (!targetEp) {
          BS.UI.showToast('未找到第 ' + ep + ' 话，请检查集数', 'error');
          return;
        }

        return BS.BangumiAPI.markSubjectEpisodesWatched(subjectId, [targetEp.id]);
      })
      .then(function() {
        BS.Config.addSyncRecord(subjectId, ep);
        BS.UI.showToast('同步成功！', 'success');
      })
      .catch(function(err) {
        BS.UI.showToast('同步失败: ' + err.message, 'error', 5000);
      });
  }

  return {
    sync: sync
  };
})();
