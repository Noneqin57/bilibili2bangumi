// ===== BangumiAPI 模块 =====
BS.BangumiAPI = (function () {
  var BASE_URL = 'https://api.bgm.tv';
  var USER_AGENT = 'BangumiSync/__VERSION__ (__PLATFORM__)';

  var pendingRequests = {};
  var DEDUP_TTL = 500;

  function getRequestKey(method, url) {
    return method + ' ' + url;
  }

  function dedupRequest(method, url, executeFn) {
    var key = getRequestKey(method, url);
    if (pendingRequests.hasOwnProperty(key)) {
      return pendingRequests[key];
    }

    var promise = executeFn();
    pendingRequests[key] = promise;

    promise.then(function() {
      setTimeout(function() {
        delete pendingRequests[key];
      }, DEDUP_TTL);
    }).catch(function() {
      setTimeout(function() {
        delete pendingRequests[key];
      }, DEDUP_TTL);
    });

    return promise;
  }

  function request(method, path, data, needAuth, retryCount, useDedup) {
    retryCount = retryCount || 0;
    useDedup = useDedup !== false;
    var MAX_RETRIES = 3;
    var RETRY_DELAY_BASE = 1000;

    var executeFn = function() {
      return new Promise(function(resolve, reject) {
        var token = BS.Config.getAccessToken();
        if (needAuth && !token) {
          reject(new Error('未配置 Access Token'));
          return;
        }

        var headers = { 'User-Agent': USER_AGENT };
        if (needAuth) headers['Authorization'] = 'Bearer ' + token;
        if (data && method !== 'GET') headers['Content-Type'] = 'application/json';

        var retryAttempt = 0;

        function doRequest() {
          BS.Platform.httpRequest({
            method: method,
            url: BASE_URL + path,
            headers: headers,
            data: data ? JSON.stringify(data) : null,
            timeout: 30000,
            onload: function(res) {
              if (res.status >= 200 && res.status < 300) {
                try {
                  resolve(JSON.parse(res.responseText));
                } catch (e) {
                  resolve(res.responseText);
                }
              } else {
                // 指数退避重试：只在服务器错误或超时时重试
                if ((res.status >= 500 || res.status === 0) && retryAttempt < MAX_RETRIES) {
                  retryAttempt++;
                  var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                  BS.Logger.warn('请求失败，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                  setTimeout(doRequest, delay);
                } else {
                  try {
                    var err = JSON.parse(res.responseText);
                    reject(new Error(err.message || err.error || '请求失败'));
                  } catch (e) {
                    reject(new Error('请求失败: ' + res.status));
                  }
                }
              }
            },
            onerror: function() {
              if (retryAttempt < MAX_RETRIES) {
                retryAttempt++;
                var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                BS.Logger.warn('网络错误，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                setTimeout(doRequest, delay);
              } else {
                reject(new Error('网络请求失败，已重试' + MAX_RETRIES + '次'));
              }
            },
            ontimeout: function() {
              if (retryAttempt < MAX_RETRIES) {
                retryAttempt++;
                var delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt - 1);
                BS.Logger.warn('请求超时，' + delay + 'ms 后第 ' + retryAttempt + ' 次重试');
                setTimeout(doRequest, delay);
              } else {
                reject(new Error('请求超时，请检查网络连接，已重试' + MAX_RETRIES + '次'));
              }
            },
            onabort: function() {
              reject(new Error('请求被中断'));
            }
          });
        }

        doRequest();
      });
    };

    if (useDedup) {
      return dedupRequest(method, BASE_URL + path, executeFn);
    }
    return executeFn();
  }

  function verifyToken() {
    return request('GET', '/v0/me', null, true);
  }

  function searchSubjects(keyword, options) {
    options = options || {};
    var query = '?keyword=' + encodeURIComponent(keyword);
    if (options.type) query += '&type=' + options.type;
    if (options.limit) query += '&limit=' + options.limit;
    return request('POST', '/v0/search/subjects' + query, { keyword: keyword, filter: { type: [options.type || 2] } }, false);
  }

  function createOrUpdateCollection(subjectId, payload) {
    return request('POST', '/v0/users/-/collections/' + subjectId, payload || { type: 3 }, true);
  }

  function markSubjectEpisodesWatched(subjectId, episodeIds) {
    return request('PATCH', '/v0/users/-/collections/' + subjectId + '/episodes', {
      episode_id: episodeIds,
      type: 2
    }, true);
  }

  function getEpisodes(subjectId, options) {
    options = options || {};
    var query = '?subject_id=' + subjectId;
    if (options.limit) query += '&limit=' + options.limit;
    if (options.offset) query += '&offset=' + options.offset;
    return request('GET', '/v0/episodes' + query, null, false);
  }

  return {
    verifyToken: verifyToken,
    searchSubjects: searchSubjects,
    createOrUpdateCollection: createOrUpdateCollection,
    markSubjectEpisodesWatched: markSubjectEpisodesWatched,
    getEpisodes: getEpisodes
  };
})();
