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
        return "Gmail 발송 준비 완료"
    return (
        "Gmail 설정: backend/.env 에 SMTP_USER·SMTP_PASSWORD(앱 비밀번호)를 입력하고 서버를 재시작하세요. "
        "앱 비밀번호 → https://myaccount.google.com/apppasswords"
    )
