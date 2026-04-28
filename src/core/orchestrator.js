// ===== Orchestrator 模块 =====
BS.Orchestrator = (function () {
  function findEpisodeIds(episodes, targetEp) {
    var ids = [];
    for (var i = 0; i < episodes.length; i++) {
      if (episodes[i].ep === targetEp || episodes[i].sort === targetEp) {
        ids.push(episodes[i].id);
      }
    }
    return ids;
  }

  function sync(subjectId, ep, options) {
    options = options || {};
    var token = BS.Config.getAccessToken();
    if (!token) {
      BS.UI.showToast('未配置 Bangumi Token', 'error', 5000);
      return;
    }

    var fillPrevious = options.fillPrevious === true;

    if (!fillPrevious && BS.Config.isRecentlySynced(subjectId, ep)) {
      BS.UI.showToast('24 小时内已同步过该集', 'info');
      return;
    }

    BS.UI.showToast('正在同步...', 'info');

    BS.BangumiAPI.createOrUpdateCollection(subjectId, { type: 3 })
      .then(function() {
        // 补全模式下拉取足够多的剧集
        var epOptions = fillPrevious ? { limit: Math.max(200, ep + 50) } : undefined;
        return BS.BangumiAPI.getEpisodes(subjectId, epOptions);
      })
      .then(function(epRes) {
        var episodes = epRes && epRes.data ? epRes.data : [];

        if (fillPrevious) {
          // 补全模式：收集第 1 ~ ep 话的所有剧集 ID
          var allIds = [];
          for (var epNum = 1; epNum <= ep; epNum++) {
            var ids = findEpisodeIds(episodes, epNum);
            allIds = allIds.concat(ids);
          }

          if (allIds.length === 0) {
            BS.UI.showToast('未找到第 1~' + ep + ' 话，请检查集数', 'error');
            return;
          }

          return BS.BangumiAPI.markSubjectEpisodesWatched(subjectId, allIds).then(function() {
            return { filled: ep };
          });
        }

        // 单集模式
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
      .then(function(result) {
        if (result && result.filled) {
          // 补全模式：记录所有集数
          for (var epNum = 1; epNum <= result.filled; epNum++) {
            BS.Config.addSyncRecord(subjectId, epNum);
          }
          BS.UI.showToast('补全同步成功！已标记第 1~' + result.filled + ' 话', 'success');
        } else {
          BS.Config.addSyncRecord(subjectId, ep);
          BS.UI.showToast('同步成功！', 'success');
        }
      })
      .catch(function(err) {
        BS.UI.showToast('同步失败: ' + err.message, 'error', 5000);
      });
  }

  return {
    sync: sync
  };
})();
