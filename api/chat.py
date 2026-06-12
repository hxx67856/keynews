"""Vercel serverless — Gemini 챗봇 API."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from services.gemini_chat import generate_chat_reply, is_gemini_configured


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.rstrip("/").endswith("/status"):
            _json_response(
                self,
                200,
                {
                    "configured": is_gemini_configured(),
                    "model": "gemini-2.5-flash-lite",
                },
            )
            return
        _json_response(self, 405, {"detail": "Method not allowed"})

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw.decode("utf-8"))
            messages = data.get("messages", [])
            keyword = data.get("keyword")
            report_context = data.get("report_context")

            reply = asyncio.run(
                generate_chat_reply(messages, keyword=keyword, report_context=report_context)
            )
            _json_response(self, 200, {"reply": reply, "model": "gemini-2.5-flash-lite"})
        except ValueError as exc:
            _json_response(self, 400, {"detail": str(exc)})
        except Exception as exc:
            _json_response(self, 502, {"detail": f"챗봇 오류: {exc}"})

    def log_message(self, format: str, *args) -> None:
        return
