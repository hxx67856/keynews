"""검색 API 공통 로직 (FastAPI · Vercel 공용)."""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from services.news_collector import collect_issues
from services.report_generator import render_report_html
from services.report_store import create_report
from services.summarizer import build_report

KST = timezone(timedelta(hours=9))


async def execute_search(keyword: str) -> dict[str, Any]:
    term = keyword.strip()
    if not term:
        raise ValueError("키워드를 입력해 주세요.")

    items = await collect_issues(term)
    report = build_report(term, items)
    generated_at = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")
    report_html = render_report_html(term, report, generated_at)
    report_files = create_report(term, report, generated_at)

    return {
        "keyword": term,
        "period_days": 7,
        "generated_at": generated_at,
        "item_count": len(items),
        "three_line_summary": report["three_line_summary"],
        "overview": report["overview"],
        "highlights": report["highlights"],
        "sources": report["sources"],
        "items": items,
        "report_html": report_html,
        **report_files,
    }
