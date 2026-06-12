"""HTML 보고서 렌더링."""

from __future__ import annotations

from typing import Any

from jinja2 import Template

REPORT_HTML_TEMPLATE = Template("""
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이슈 브리핑 — {{ keyword }}</title>
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
    <p>키워드: <strong>{{ keyword }}</strong> · 수집 기간: 최근 7일 · 생성: {{ generated_at }}</p>
  </div>

  <div class="section">
    <h2>세 줄 요약</h2>
    <ol class="summary-lines">
      {% for line in three_line_summary %}
      <li>{{ line }}</li>
      {% endfor %}
    </ol>
  </div>

  <div class="section">
    <h2>핵심 개요</h2>
    <p>{{ overview }}</p>
  </div>

  <div class="section">
    <h2>주요 이슈</h2>
    {% for item in highlights %}
    <div class="card">
      <h3>{{ item.rank }}. <a href="{{ item.url }}">{{ item.title }}</a></h3>
      <p>{{ item.key_point }}</p>
      <p class="meta">{{ item.date_short }} · <a href="{{ item.url }}">{{ item.link_label }}</a></p>
    </div>
    {% endfor %}
  </div>

  <div class="section">
    <h2>출처 목록</h2>
    <ol class="source-list">
      {% for src in sources %}
      <li>
        [{{ src.index }}] {{ src.title }}<br />
        {{ src.date_short }} · <a href="{{ src.url }}">{{ src.link_label }}</a><br />
        <span class="url"><a href="{{ src.url }}">{{ src.url_short }}</a></span>
      </li>
      {% endfor %}
    </ol>
  </div>

  <p class="footer">Issue Briefing · Google News RSS 기반 · 자동 생성 보고서</p>
</body>
</html>
""")


def render_report_html(keyword: str, report: dict[str, Any], generated_at: str) -> str:
    return REPORT_HTML_TEMPLATE.render(
        keyword=keyword,
        three_line_summary=report["three_line_summary"],
        overview=report["overview"],
        highlights=report["highlights"],
        sources=report["sources"],
        generated_at=generated_at,
    )
