/** Google News RSS 수집 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePublished(entry) {
  const raw = entry.pubDate || entry.published || entry.updated || '';
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function withinLastDays(dt, days = 7) {
  if (!dt) return true;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return dt.getTime() >= cutoff;
}

function extractSource(entry) {
  if (entry.source && typeof entry.source === 'object' && entry.source['#text']) {
    return entry.source['#text'];
  }
  if (typeof entry.source === 'string') return entry.source;
  const link = entry.link || '';
  const match = link.match(/https?:\/\/(?:www\.)?([^/]+)/);
  return match ? match[1] : '출처 미상';
}

function formatKst(dt) {
  const kst = new Date(dt.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const min = String(kst.getUTCMinutes()).padStart(2, '0');
  return {
    iso: `${y}-${m}-${d}T${h}:${min}:00+09:00`,
    display: `${y}-${m}-${d} ${h}:${min}`,
  };
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    };
    const sourceRaw = pick('source');
    items.push({
      title: pick('title'),
      summary: pick('description') || pick('content'),
      link: pick('link'),
      pubDate: pick('pubDate'),
      source: sourceRaw ? stripHtml(sourceRaw) : '',
    });
  }
  return items;
}

export async function collectIssues(keyword, days = 7, maxItems = 12) {
  const query = encodeURIComponent(`${keyword} when:${days}d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'IssueReportBot/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`뉴스 RSS 요청 실패 (${response.status})`);
  }

  const xml = await response.text();
  const entries = parseRssItems(xml);
  const items = [];

  for (const entry of entries) {
    const published = parsePublished(entry);
    if (!withinLastDays(published, days)) continue;

    const title = stripHtml(entry.title);
    const summary = stripHtml(entry.summary || entry.title);
    const link = entry.link || '';
    if (!title) continue;

    const kst = published ? formatKst(published) : null;
    items.push({
      title,
      summary: summary || title,
      url: link,
      source: extractSource(entry),
      published_at: kst?.iso || null,
      published_display: kst?.display || '날짜 미상',
    });

    if (items.length >= maxItems) break;
  }

  return items;
}
