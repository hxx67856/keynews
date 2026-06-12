"""이슈 브리핑 API 서버."""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

from services.email_sender import send_report_email
from services.news_collector import collect_issues
from services.summarizer import build_report

load_dotenv()

KST = timezone(timedelta(hours=9))
STATIC_DIR = Path(__file__).parent / "static"

EXAMPLE_KEYWORDS = [
    "인공지능 규제",
    "반도체 수출",
    "기후 변화",
    "K-콘텐츠",
    "전기차 배터리",
    "사이버 보안",
]

app = FastAPI(title="Issue Briefing API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()] + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100)


class EmailRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/examples")
async def examples() -> dict[str, list[str]]:
    return {"keywords": EXAMPLE_KEYWORDS}


@app.post("/api/search")
async def search(req: SearchRequest) -> dict[str, Any]:
    keyword = req.keyword.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="키워드를 입력해 주세요.")

    try:
        items = await collect_issues(keyword)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"뉴스 수집 실패: {exc}") from exc

    report = build_report(keyword, items)
    generated_at = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")

    return {
        "keyword": keyword,
        "period_days": 7,
        "generated_at": generated_at,
        "item_count": len(items),
        "three_line_summary": report["three_line_summary"],
        "overview": report["overview"],
        "highlights": report["highlights"],
        "sources": report["sources"],
        "items": items,
    }


@app.post("/api/send-email")
async def send_email(req: EmailRequest) -> dict[str, str]:
    keyword = req.keyword.strip()

    try:
        items = await collect_issues(keyword)
        report = build_report(keyword, items)
        generated_at = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")
        await send_report_email(req.email, keyword, report, generated_at)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"이메일 발송 실패: {exc}") from exc

    return {"message": f"{req.email}로 보고서를 발송했습니다."}


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
