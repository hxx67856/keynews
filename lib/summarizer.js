/** 이슈 요약 (Python summarizer.js 포트) */

const STOP = new Set([
  '및', '등', 'the', 'and', 'for', 'with', 'from', 'that', 'this',
  '에서', '으로', '하는', '있다', '없다', '대한', '관련', '통해',
  '뉴스', '기사', '보도', '최근', '이번', '지난', '속보', '단독',
  '오늘', '내일', '어제', '정부', '발표', '예정', '진행', '가능',
]);

function topTerms(texts, limit = 5) {
  const counts = new Map();
  for (const text of texts) {
    for (const raw of text.replace(/,/g, ' ').replace(/\./g, ' ').split(/\s+/)) {
      const word = raw.replace(/[·…"'()[\]]/g, '').trim();
      if (word.length >= 2 && !STOP.has(word) && !/^\d+$/.test(word)) {
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}

function cleanTitle(title, source = '') {
  let cleaned = title.trim();
  for (const sep of [' - ', ' – ', ' — ', ' | ', ' · ']) {
    if (!cleaned.includes(sep)) continue;
    const idx = cleaned.lastIndexOf(sep);
    const head = cleaned.slice(0, idx).trim();
    const tail = cleaned.slice(idx + sep.length).trim();
    if (!tail) continue;
    if (source && (tail === source || tail.includes(source) || source.includes(tail))) {
      return head;
    }
    if (tail.length <= 24 && !/[?!…]/.test(tail)) return head;
  }
  return cleaned;
}

function truncate(text, maxLen = 36) {
  text = text.trim();
  if (text.length <= maxLen) return text;
  let cut = text.slice(0, maxLen - 1);
  const sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/[,.]$/, '') + '…';
}

function uniquePreserve(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.replace(/\s+/g, '').toLowerCase();
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      result.push(item.trim());
    }
  }
  return result;
}

function cleanSummary(summary, source, title) {
  let text = summary.replace(/\s+/g, ' ').trim();
  text = cleanTitle(text, source);
  if (source) {
    for (const pattern of [` ${source}`, ` · ${source}`, source]) {
      if (text.endsWith(pattern)) text = text.slice(0, -pattern.length).trim();
    }
  }
  const norm = (s) => s.replace(/[^\w가-힣]/g, '').toLowerCase();
  const titleNorm = norm(title);
  const textNorm = norm(text);
  if (!textNorm || textNorm === titleNorm || titleNorm.includes(textNorm)) return '';
  return text;
}

function shortDate(publishedDisplay) {
  if (publishedDisplay.length >= 10 && publishedDisplay[4] === '-') {
    return publishedDisplay.slice(5, 10);
  }
  return publishedDisplay;
}

function linkLabel(source, url) {
  if (source && source !== '출처 미상') return truncate(source, 14);
  const match = url.match(/https?:\/\/(?:www\.)?([^/]+)/);
  if (match) {
    const domain = match[1];
    return domain.includes('.') ? domain.split('.')[0].slice(0, 12) : domain.slice(0, 12);
  }
  return '원문';
}

function shortUrl(url, maxLen = 52) {
  url = url.trim();
  return url.length <= maxLen ? url : url.slice(0, maxLen - 1) + '…';
}

function filterTerms(terms, items) {
  const blocked = new Set();
  for (const item of items) {
    for (const word of (item.source || '').split(/[\s·\-|]+/)) {
      if (word.length >= 2) blocked.add(word.toLowerCase());
    }
  }
  return terms.filter((t) => !blocked.has(t.toLowerCase())).slice(0, 4);
}

function buildThreeLineSummary(keyword, items) {
  const cleanedTitles = uniquePreserve(
    items.slice(0, 6).map((i) => cleanTitle(i.title, i.source || '')),
  );
  const n = items.length;
  const terms = filterTerms(topTerms(cleanedTitles, 6), items);

  const line1 =
    `최근 7일간 '${keyword}' 관련 보도 ${n}건이 수집되었으며, ` +
    '정책·산업·시장 등 여러 영역에서 연쇄적으로 이슈가 이어지고 있습니다.';

  let line2;
  if (cleanedTitles.length >= 2) {
    const lead = truncate(cleanedTitles[0], 42);
    const second = truncate(cleanedTitles[1], 42);
    if (cleanedTitles.length >= 3) {
      const third = truncate(cleanedTitles[2], 36);
      line2 = `핵심 화두는 「${lead}」, 「${second}」, 「${third}」 순으로 부각됩니다.`;
    } else {
      line2 = `핵심 화두는 「${lead}」와 「${second}」 두 축으로 압축됩니다.`;
    }
  } else if (cleanedTitles.length === 1) {
    line2 = `핵심 화두는 「${truncate(cleanedTitles[0], 48)}」로 집중됩니다.`;
  } else {
    line2 = '수집된 기사에서 뚜렷한 단일 화두를 특정하기 어렵습니다.';
  }

  const line3 = terms.length
    ? `보도 전반에서 ${terms.slice(0, 3).join(', ')} 관련 논의가 반복되며, 후속 조치와 시장·여론 반응을 주시할 필요가 있습니다.`
    : '보도 내용이 다양한 세부 주제로 분산되어 있어, 향후 후속 기사 흐름을 통해 논점이 재정리될 가능성이 큽니다.';

  return [line1, line2, line3];
}

function buildOverview(keyword, items, terms) {
  const n = items.length;
  const dated = items.filter((i) => i.published_display && i.published_display !== '날짜 미상');

  let timing;
  if (!dated.length) timing = '보도 시점 정보는 일부 제한적이나';
  else if (dated.length >= 4) {
    timing = `${shortDate(dated[dated.length - 1].published_display)}부터 ${shortDate(dated[0].published_display)}까지 이슈가 지속적으로 갱신되었으며`;
  } else {
    timing = '최근 며칠 사이 보도가 집중적으로 쏟아졌으며';
  }

  if (terms.length) {
    return (
      `${timing}, '${keyword}' 관련 논의는 ${terms.slice(0, 4).join(', ')} 등 ` +
      '서로 연관된 키워드군을 중심으로 확장되고 있습니다. ' +
      '동일 키워드 내에서도 초기 보도(사실 전달)와 후속 보도(영향·대응 분석)가 ' +
      '교차하는 양상이 나타나, 단순 사건 요약을 넘어 구조적 변화 신호로 해석할 여지가 있습니다.'
    );
  }

  return (
    `${timing}, '${keyword}' 관련 ${n}건의 보도는 단일 이벤트보다 ` +
    '분산된 관심사가 동시에 부각되는 패턴을 보입니다. ' +
    '향후 동일 키워드에 대한 추가 보도가 이어질 경우, ' +
    '현재 분산된 논점 중 일부가 핵심 쟁점으로 수렴할 가능성을 염두에 두어야 합니다.'
  );
}

export function buildReport(keyword, items) {
  if (!items.length) {
    return {
      three_line_summary: [
        `'${keyword}' 관련 최근 7일 내 주요 이슈를 찾지 못했습니다.`,
        '키워드 표기를 바꾸거나 더 구체적인 검색어를 시도해 보세요.',
        "예: '인공지능 규제', '반도체 수출' 등",
      ],
      overview: '검색 결과가 없습니다. 키워드를 바꾸거나 영문/한글 표기를 조정해 보세요.',
      highlights: [],
      sources: [],
    };
  }

  const titles = items.map((i) => cleanTitle(i.title, i.source || ''));
  const terms = topTerms(titles);
  const three_line_summary = buildThreeLineSummary(keyword, items);
  const overview = buildOverview(keyword, items, terms);

  const highlights = items.slice(0, 6).map((item, idx) => {
    const titleClean = cleanTitle(item.title, item.source || '');
    let body = cleanSummary(item.summary || '', item.source || '', titleClean);
    if (!body) body = titleClean;
    const keyPoint = body.length > 180 ? body.slice(0, 180) + '…' : body;
    const url = item.url;
    return {
      rank: idx + 1,
      title: titleClean,
      key_point: keyPoint,
      source: item.source,
      link_label: linkLabel(item.source, url),
      url,
      url_short: shortUrl(url),
      published_display: item.published_display,
      date_short: shortDate(item.published_display),
    };
  });

  const sources = items.map((item, idx) => {
    const url = item.url;
    return {
      index: idx + 1,
      title: cleanTitle(item.title, item.source || ''),
      source: item.source,
      link_label: linkLabel(item.source, url),
      url,
      url_short: shortUrl(url),
      published_display: item.published_display,
      date_short: shortDate(item.published_display),
    };
  });

  return { three_line_summary, overview, highlights, sources };
}
