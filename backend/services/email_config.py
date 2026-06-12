"""SMTP 설정 상태 확인."""

from __future__ import annotations

import os
import re


def normalize_smtp_password(password: str | None) -> str:
    if not password:
        return ""
    return password.replace(" ", "").strip()


def load_smtp_settings() -> dict[str, str | int]:
    user = (os.getenv("SMTP_USER") or "").strip()
    password = normalize_smtp_password(os.getenv("SMTP_PASSWORD"))
    from_addr = (os.getenv("SMTP_FROM") or user).strip()
    return {
        "host": (os.getenv("SMTP_HOST") or "").strip(),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": user,
        "password": password,
        "from_addr": from_addr,
    }


def is_email_configured() -> bool:
    cfg = load_smtp_settings()
    if not all([cfg["host"], cfg["user"], cfg["password"], cfg["from_addr"]]):
        return False
    if _is_placeholder_password(str(cfg["password"])):
        return False
    return True


def _is_placeholder_password(password: str) -> bool:
    lowered = password.lower()
    placeholders = (
        "your-16-digit-app-password",
        "your-app-password",
        "여기에",
        "app-password",
        "changeme",
    )
    return any(p in lowered for p in placeholders) or len(password) < 16


def email_setup_hint() -> str:
    if is_email_configured():
        return "Gmail 발송 준비 완료"
    return (
        "Gmail: backend/.env 에 SMTP_USER와 앱 비밀번호(16자리)를 입력하고 서버를 재시작하세요. "
        "https://myaccount.google.com/apppasswords"
    )
