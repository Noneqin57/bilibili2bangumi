// ===== Matcher 模块（集数提取 + 标题解析）=====
BS.Matcher = (function () {
  var EP_PATTERNS = [
    { regex: /第\s*(\d+)\s*[话集]/i, name: '第X话/集' },
    { regex: /\[(\d{1,4})\]/, name: '[XX]' },
    { regex: /EP\.?\s*(\d+)/i, name: 'EPXX' },
    { regex: /#\s*(\d{1,4})\b/, name: '#X' },
    { regex: /S\d+E(\d+)/i, name: 'SXXEXX' },
    { regex: /(\d{1,4})\s*话/i, name: 'X话' },
    { regex: /『[^』]*』\s*(\d{1,4})/i, name: '『作品名』XX' }
  ];

  var PROPERTY_TAGS = [
    '4K', '1080P', '720P', '480P', 'HDR', 'SDR',
    '简中', '繁中', '简体', '繁体', '中字', '中日',
    '超清', '高清', '标清',
    '字幕', '字幕组', '压制', ' ENCODE',
    'BD', 'BDRIP', 'WEB', 'WEBRIP',
    '新番', '完结', '全集'
  ];

  var SEASON_MARKERS = /^(\d{1,2})\s*月\s*(新番)?$/i;

  // 常见视频分辨率，避免被误识别为集数
  var COMMON_RESOLUTIONS = { 144:1, 240:1, 360:1, 480:1, 540:1, 720:1, 1080:1, 1440:1, 2160:1, 4320:1 };

  var CACHE_SIZE = 20;
  var cache = {};
  var cacheKeys = [];

  function getCache(key) {
    return cache.hasOwnProperty(key) ? cache[key] : null;
  }

  function setCache(key, value) {
    if (cacheKeys.length >= CACHE_SIZE) {
      var oldest = cacheKeys.shift();
      delete cache[oldest];
    }
    cacheKeys.push(key);
    cache[key] = value;
  }

  function extractEpisode(title) {
    var cached = getCache('ep:' + title);
    if (cached !== null) return cached;

    for (var i = 0; i < EP_PATTERNS.length; i++) {
      var m = title.match(EP_PATTERNS[i].regex);
      if (m) {
        var ep = parseInt(m[1], 10);
        // 跳过常见分辨率数字，避免 [1080]、[720] 等被误识别为集数
        if (COMMON_RESOLUTIONS.hasOwnProperty(ep)) {
          continue;
        }
        var result = {
          ep: ep,
          pattern: EP_PATTERNS[i].name
        };
        setCache('ep:' + title, result);
        return result;
      }
    }
    setCache('ep:' + title, null);
    return null;
  }

  function isPropertyTag(content) {
    if (!content) return false;
    var upper = content.toUpperCase();
    for (var i = 0; i < PROPERTY_TAGS.length; i++) {
      if (upper.indexOf(PROPERTY_TAGS[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function isSeasonMarker(content) {
    if (!content) return false;
    return SEASON_MARKERS.test(content.trim());
  }

  function cleanTitle(title) {
    return title
      .replace(/\s*第\s*\d+[\s\-~]*\d*\s*[话集]/gi, '')
      .replace(/\s*\d+[\s\-~]*\d*\s*话/gi, '')
      .replace(/\s*EP\.?\s*\d+/gi, '')
      .replace(/\s*S\d+E\d+/gi, '')
      .replace(/\s*\[\d+\]/g, '')
      .replace(/\s*【[^】]*】/g, '')
      .replace(/\s*『[^』]*』/g, '')
      .replace(/\s*\/\s*/g, ' ')
      .replace(/[\s\-~]+/g, ' ')
      .trim();
  }

  function extractAnimeTitle(title) {
    var cached = getCache('title:' + title);
    if (cached !== null) return cached;

    var result;
    var cornerMatch = title.match(/『([^』]+)』/);
    if (cornerMatch) {
      var cornerContent = cornerMatch[1].trim();
      if (!isPropertyTag(cornerContent)) {
        result = cleanTitle(cornerContent);
        setCache('title:' + title, result);
        return result;
      }
    }

    var bracketMatch = title.match(/【([^】]+)】/);
    if (bracketMatch) {
      var bracketContent = bracketMatch[1].trim();
      if (isPropertyTag(bracketContent) || isSeasonMarker(bracketContent)) {
        var afterBracket = title.replace(/【[^】]+】/, '').trim();
        result = extractAnimeTitleFromCleaned(afterBracket);
        setCache('title:' + title, result);
        return result;
      } else {
        result = cleanTitle(bracketContent);
        setCache('title:' + title, result);
        return result;
      }
    }

    var squareMatch = title.match(/\[([^\]]+)\]/);
    if (squareMatch) {
      var squareContent = squareMatch[1].trim();
      if (!isPropertyTag(squareContent) && !/^\d+$/.test(squareContent)) {
        result = cleanTitle(squareContent);
        setCache('title:' + title, result);
        return result;
      }
      var afterSquare = title.replace(/\[[^\]]+\]/, '').trim();
      result = cleanTitle(afterSquare);
      setCache('title:' + title, result);
      return result;
    }

    result = cleanTitle(title);
    setCache('title:' + title, result);
    return result;
  }

  function extractAnimeTitleFromCleaned(title) {
    var cornerMatch = title.match(/『([^』]+)』/);
    if (cornerMatch && !isPropertyTag(cornerMatch[1].trim())) {
      return cleanTitle(cornerMatch[1].trim());
    }

    var bracketMatch = title.match(/【([^】]+)】/);
    if (bracketMatch) {
      var bracketContent = bracketMatch[1].trim();
      if (!isPropertyTag(bracketContent) && !isSeasonMarker(bracketContent)) {
        return cleanTitle(bracketContent);
      }
    }

    var squareMatch = title.match(/\[([^\]]+)\]/);
    if (squareMatch) {
      var squareContent = squareMatch[1].trim();
      if (!isPropertyTag(squareContent) && !/^\d+$/.test(squareContent)) {
        return cleanTitle(squareContent);
      }
    }

    return cleanTitle(title);
  }

  return {
    extractEpisode: extractEpisode,
    extractAnimeTitle: extractAnimeTitle
  };
})();
