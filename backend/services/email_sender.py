"""HTML 보고서 이메일 발송."""

from __future__ import annotations

import os
from email.message import EmailMessage
from typing import Any

import aiosmtplib
from jinja2 import Template

REPORT_TEMPLATE = Template("""
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; color: #18181b; line-height: 1.6; }
    .header { background: #18181b; color: #fff; padding: 24px; border-radius: 8px; }
    .section { margin: 24px 0; }
    .card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .meta { color: #71717a; font-size: 13px; }
    .source-list { font-size: 13px; line-height: 1.7; }
    .summary-lines { padding-left: 20px; }
    .summary-lines li { margin-bottom: 8px; }
    a { color: #0075de; }
    .url { font-size: 12px; color: #787671; word-break: break-all; }
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
</body>
</html>
""")


async def send_report_email(
    to_email: str,
    keyword: str,
    report: dict[str, Any],
    generated_at: str,
) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
        raise ValueError(
            "SMTP 설정이 없습니다. backend/.env 파일에 SMTP_HOST, SMTP_USER, SMTP_PASSWORD를 설정하세요."
        )

    html_body = REPORT_TEMPLATE.render(
        keyword=keyword,
        three_line_summary=report["three_line_summary"],
        overview=report["overview"],
        highlights=report["highlights"],
        sources=report["sources"],
        generated_at=generated_at,
    )

    message = EmailMessage()
    message["From"] = smtp_from
    message["To"] = to_email
    message["Subject"] = f"[이슈 브리핑] '{keyword}' 최근 7일 주요 이슈 보고서"
    message.set_content(f"'{keyword}' 이슈 보고서입니다. HTML 메일 클라이언트에서 확인하세요.")
    message.add_alternative(html_body, subtype="html")

    await aiosmtplib.send(
        message,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
        start_tls=True,
    )
