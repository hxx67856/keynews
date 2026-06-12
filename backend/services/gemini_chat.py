"""Gemini API 챗봇."""

from __future__ import annotations

import os
from typing import Any

import httpx

GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

SYSTEM_PROMPT = """당신은 'Issue Briefing' 서비스의 AI 어시스턴트입니다.
사용자가 키워드 기반 뉴스 이슈 수집, HTML 보고서, 이메일 발송, 서비스 사용법을 물어보면
한국어로 간결하고 정확하게 답변합니다.
모르는 내용은 지어내지 말고, 검색·보고서 생성을 권장하세요."""


def is_gemini_configured() -> bool:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return bool(key and not key.startswith("your-"))


def _build_system_instruction(keyword: str | None, report_context: str | None) -> str:
    parts = [SYSTEM_PROMPT]
    if keyword:
        parts.append(f"현재 사용자가 검색한 키워드: {keyword}")
    if report_context:
        parts.append(f"현재 생성된 보고서 요약:\n{report_context}")
    return "\n\n".join(parts)


def _to_gemini_contents(messages: list[dict[str, str]]) -> list[dict[str, Any]]:
    contents: list[dict[str, Any]] = []
    for msg in messages[-12:]:
        role = "user" if msg.get("role") == "user" else "model"
        text = (msg.get("content") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    if not contents:
        raise ValueError("메시지를 입력해 주세요.")
    if contents[0]["role"] == "model":
        contents.insert(0, {"role": "user", "parts": [{"text": "안녕하세요."}]})
    return contents


async def generate_chat_reply(
    messages: list[dict[str, str]],
    keyword: str | None = None,
    report_context: str | None = None,
) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY가 설정되지 않았습니다. "
            "Vercel 환경 변수 또는 backend/.env에 추가하세요."
        )

    payload = {
        "systemInstruction": {"parts": [{"text": _build_system_instruction(keyword, report_context)}]},
        "contents": _to_gemini_contents(messages),
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            GEMINI_API_URL,
            params={"key": api_key},
            json=payload,
        )
        if response.status_code >= 400:
            detail = response.text[:300]
            raise ValueError(f"Gemini API 오류 ({response.status_code}): {detail}")

        data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        block = data.get("promptFeedback", {}).get("blockReason")
        if block:
            raise ValueError(f"Gemini 응답이 차단되었습니다: {block}") from exc
        raise ValueError("Gemini 응답을 해석할 수 없습니다.") from exc
