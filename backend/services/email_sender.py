"""HTML 보고서 이메일 발송."""

from __future__ import annotations

import os
from email.message import EmailMessage
from typing import Any

import aiosmtplib

from services.report_generator import render_report_html


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

    html_body = render_report_html(keyword, report, generated_at)

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
