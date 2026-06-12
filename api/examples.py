"""Vercel serverless — 예시 키워드 API."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler

EXAMPLE_KEYWORDS = [
    "인공지능 규제",
    "반도체 수출",
    "기후 변화",
    "K-콘텐츠",
    "전기차 배터리",
    "사이버 보안",
]


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        _json_response(self, 200, {"keywords": EXAMPLE_KEYWORDS})

    def log_message(self, format: str, *args) -> None:
        return
