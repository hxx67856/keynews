"""SMTP 설정 상태 확인."""

from __future__ import annotations

import os


def is_email_configured() -> bool:
    return all([
        os.getenv("SMTP_HOST"),
        os.getenv("SMTP_USER"),
        os.getenv("SMTP_PASSWORD"),
        os.getenv("SMTP_FROM") or os.getenv("SMTP_USER"),
    ])


def email_setup_hint() -> str:
    if is_email_configured():
        return "이메일 발송 준비 완료"
    return (
        "이메일 발송을 사용하려면 backend/.env 파일에 SMTP 설정을 추가하고 서버를 재시작하세요. "
        "(.env.example 참고)"
    )
