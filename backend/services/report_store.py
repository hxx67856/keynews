"""생성된 HTML 보고서 저장·조회."""

from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from services.report_generator import render_report_html

KST = timezone(timedelta(hours=9))


def _reports_dir() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/reports")
    return Path(__file__).parent.parent / "reports"


REPORTS_DIR = _reports_dir()
_registry: dict[str, dict[str, Any]] = {}


def _slug(keyword: str) -> str:
    slug = re.sub(r"[^\w가-힣]+", "-", keyword.strip()).strip("-").lower()
    return slug[:30] or "report"


def create_report(keyword: str, report: dict[str, Any], generated_at: str) -> dict[str, str]:
    """HTML 보고서 파일을 생성하고 메타데이터를 반환합니다."""
    reports_dir = _reports_dir()
    reports_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(KST).strftime("%Y%m%d-%H%M%S")
    report_id = f"{_slug(keyword)}-{stamp}-{uuid.uuid4().hex[:8]}"
    html = render_report_html(keyword, report, generated_at)

    file_path = reports_dir / f"{report_id}.html"
    file_path.write_text(html, encoding="utf-8")

    meta = {
        "report_id": report_id,
        "keyword": keyword,
        "generated_at": generated_at,
        "file_path": str(file_path),
        "report": report,
    }
    _registry[report_id] = meta

    return {
        "report_id": report_id,
        "report_url": f"/api/reports/{report_id}",
        "report_download_url": f"/api/reports/{report_id}/download",
    }


def get_report_meta(report_id: str) -> dict[str, Any] | None:
    meta = _registry.get(report_id)
    if meta:
        return meta
    file_path = _reports_dir() / f"{report_id}.html"
    if file_path.exists():
        return {"report_id": report_id, "file_path": str(file_path)}
    return None


def get_report_file_path(report_id: str) -> Path | None:
    meta = get_report_meta(report_id)
    if not meta:
        return None
    path = Path(meta["file_path"])
    return path if path.exists() else None
