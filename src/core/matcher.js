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

  function extractEpisode(title) {
    for (var i = 0; i < EP_PATTERNS.length; i++) {
      var m = title.match(EP_PATTERNS[i].regex);
      if (m) {
        return {
          ep: parseInt(m[1], 10),
          pattern: EP_PATTERNS[i].name
        };
      }
    }
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
    var cornerMatch = title.match(/『([^』]+)』/);
    if (cornerMatch) {
      var cornerContent = cornerMatch[1].trim();
      if (!isPropertyTag(cornerContent)) {
        return cleanTitle(cornerContent);
      }
    }

    var bracketMatch = title.match(/【([^】]+)】/);
    if (bracketMatch) {
      var bracketContent = bracketMatch[1].trim();
      if (isPropertyTag(bracketContent) || isSeasonMarker(bracketContent)) {
        var afterBracket = title.replace(/【[^】]+】/, '').trim();
        return extractAnimeTitleFromCleaned(afterBracket);
      } else {
        return cleanTitle(bracketContent);
      }
    }

    var squareMatch = title.match(/\[([^\]]+)\]/);
    if (squareMatch) {
      var squareContent = squareMatch[1].trim();
      if (!isPropertyTag(squareContent) && !/^\d+$/.test(squareContent)) {
        return cleanTitle(squareContent);
      }
      var afterSquare = title.replace(/\[[^\]]+\]/, '').trim();
      return cleanTitle(afterSquare);
    }

    return cleanTitle(title);
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
