/** HTML 보고서 렌더링 */

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderReportHtml(keyword, report, generatedAt) {
  const summaryLines = report.three_line_summary
    .map((line) => `<li>${esc(line)}</li>`)
    .join('\n      ');

  const highlights = report.highlights
    .map(
      (item) => `
    <div class="card">
      <h3>${item.rank}. <a href="${esc(item.url)}">${esc(item.title)}</a></h3>
      <p>${esc(item.key_point)}</p>
      <p class="meta">${esc(item.date_short)} · <a href="${esc(item.url)}">${esc(item.link_label)}</a></p>
    </div>`,
    )
    .join('');

  const sources = report.sources
    .map(
      (src) => `
      <li>
        [${src.index}] ${esc(src.title)}<br />
        ${esc(src.date_short)} · <a href="${esc(src.url)}">${esc(src.link_label)}</a><br />
        <span class="url"><a href="${esc(src.url)}">${esc(src.url_short)}</a></span>
      </li>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이슈 브리핑 — ${esc(keyword)}</title>
  <style>
    body { font-family: 'Malgun Gothic', Inter, sans-serif; color: #37352f; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .header { background: #0a1530; color: #fff; padding: 24px; border-radius: 12px; margin-bottom: 32px; }
    .header h1 { margin: 0 0 8px; font-size: 24px; }
    .header p { margin: 0; color: #a4a097; font-size: 14px; }
    .section { margin: 28px 0; }
    .section h2 { font-size: 18px; margin-bottom: 12px; color: #1a1a1a; }
    .summary-lines { padding-left: 20px; }
    .summary-lines li { margin-bottom: 10px; }
    .card { border: 1px solid #e5e3df; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: #fafaf9; }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .meta { color: #787671; font-size: 13px; }
    .source-list { font-size: 14px; line-height: 1.7; padding-left: 20px; }
    a { color: #0075de; }
    .url { font-size: 12px; color: #787671; word-break: break-all; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e3df; font-size: 12px; color: #787671; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>이슈 브리핑 보고서</h1>
    <p>키워드: <strong>${esc(keyword)}</strong> · 수집 기간: 최근 7일 · 생성: ${esc(generatedAt)}</p>
  </div>
  <div class="section">
    <h2>세 줄 요약</h2>
    <ol class="summary-lines">
      ${summaryLines}
    </ol>
  </div>
  <div class="section">
    <h2>핵심 개요</h2>
    <p>${esc(report.overview)}</p>
  </div>
  <div class="section">
    <h2>주요 이슈</h2>
    ${highlights}
  </div>
  <div class="section">
    <h2>출처 목록</h2>
    <ol class="source-list">
      ${sources}
    </ol>
  </div>
  <p class="footer">Issue Briefing · Google News RSS 기반 · 자동 생성 보고서</p>
</body>
</html>`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatKstNow() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = pad(kst.getUTCMonth() + 1);
  const d = pad(kst.getUTCDate());
  const h = pad(kst.getUTCHours());
  const min = pad(kst.getUTCMinutes());
  return `${y}-${m}-${d} ${h}:${min} KST`;
}

export function makeReportId(keyword) {
  const slug = keyword
    .trim()
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 30) || 'report';
  const stamp = formatKstNow().replace(/[^0-9]/g, '').slice(0, 14);
  const rand = Math.random().toString(16).slice(2, 10);
  return `${slug}-${stamp}-${rand}`;
}
