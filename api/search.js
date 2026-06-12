import { collectIssues } from '../lib/news-collector.js';
import { buildReport } from '../lib/summarizer.js';
import { formatKstNow, makeReportId, renderReportHtml } from '../lib/report-generator.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const keyword = (req.body?.keyword || '').trim();
    if (!keyword) {
      return res.status(400).json({ detail: '키워드를 입력해 주세요.' });
    }

    const items = await collectIssues(keyword);
    const report = buildReport(keyword, items);
    const generatedAt = formatKstNow();
    const reportHtml = renderReportHtml(keyword, report, generatedAt);
    const reportId = makeReportId(keyword);

    return res.status(200).json({
      keyword,
      period_days: 7,
      generated_at: generatedAt,
      item_count: items.length,
      three_line_summary: report.three_line_summary,
      overview: report.overview,
      highlights: report.highlights,
      sources: report.sources,
      items,
      report_id: reportId,
      report_url: `/api/reports/${reportId}`,
      report_download_url: `/api/reports/${reportId}/download`,
      report_html: reportHtml,
    });
  } catch (err) {
    return res.status(502).json({ detail: `뉴스 수집 실패: ${err.message}` });
  }
}
