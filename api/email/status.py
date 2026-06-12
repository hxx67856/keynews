"""Vercel serverless — 이메일 설정 상태 (Vercel에서는 미지원)."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler


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
        _json_response(
            self,
            200,
            {
                "configured": False,
                "message": "Vercel 배포에서는 이메일 발송을 지원하지 않습니다. 로컬 FastAPI 서버를 사용하세요.",
            },
        )

    def log_message(self, format: str, *args) -> None:
        return
