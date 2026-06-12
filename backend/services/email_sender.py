"""HTML 보고서 이메일 발송."""

from __future__ import annotations

from email.message import EmailMessage
from typing import Any

import aiosmtplib
from aiosmtplib import SMTPAuthenticationError

from services.email_config import load_smtp_settings
from services.report_generator import render_report_html

GMAIL_AUTH_HELP = (
    "Gmail 인증 실패(535): 앱 비밀번호가 올바르지 않습니다. "
    "① Google 계정 2단계 인증 켜기 "
    "② https://myaccount.google.com/apppasswords 에서 새 앱 비밀번호 생성 "
    "③ backend/.env 의 SMTP_PASSWORD 에 16자리 입력(공백 있어도 됨) "
    "④ 서버 재시작. 일반 Gmail 로그인 비밀번호는 사용할 수 없습니다."
)


async def verify_smtp_login() -> None:
    """SMTP 로그인만 검증합니다."""
    cfg = load_smtp_settings()
    if not all([cfg["host"], cfg["user"], cfg["password"], cfg["from_addr"]]):
        raise ValueError(
            "SMTP 설정이 없습니다. backend/.env 파일에 SMTP_HOST, SMTP_USER, SMTP_PASSWORD를 설정하세요."
        )

    smtp = aiosmtplib.SMTP(hostname=str(cfg["host"]), port=int(cfg["port"]), start_tls=True)
    try:
        await smtp.connect()
        await smtp.login(str(cfg["user"]), str(cfg["password"]))
    except SMTPAuthenticationError as exc:
        raise ValueError(GMAIL_AUTH_HELP) from exc
    finally:
        try:
            await smtp.quit()
        except Exception:
            pass


async def send_report_email(
    to_email: str,
    keyword: str,
    report: dict[str, Any],
    generated_at: str,
) -> None:
    cfg = load_smtp_settings()
    if not all([cfg["host"], cfg["user"], cfg["password"], cfg["from_addr"]]):
        raise ValueError(
            "SMTP 설정이 없습니다. backend/.env 파일에 SMTP_HOST, SMTP_USER, SMTP_PASSWORD를 설정하세요."
        )

    html_body = render_report_html(keyword, report, generated_at)

    message = EmailMessage()
    message["From"] = str(cfg["from_addr"])
    message["To"] = to_email
    message["Subject"] = f"[이슈 브리핑] '{keyword}' 최근 7일 주요 이슈 보고서"
    message.set_content(f"'{keyword}' 이슈 보고서입니다. HTML 메일 클라이언트에서 확인하세요.")
    message.add_alternative(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=str(cfg["host"]),
            port=int(cfg["port"]),
            username=str(cfg["user"]),
            password=str(cfg["password"]),
            start_tls=True,
        )
    except SMTPAuthenticationError as exc:
        raise ValueError(GMAIL_AUTH_HELP) from exc
