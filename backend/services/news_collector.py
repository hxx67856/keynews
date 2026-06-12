"""Google News RSS를 활용한 최근 7일 이슈 수집."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from html import unescape
from typing import Any
from urllib.parse import quote_plus

import feedparser
import httpx

KST = timezone(timedelta(hours=9))


def _strip_html(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    return unescape(re.sub(r"\s+", " ", cleaned)).strip()


def _parse_published(entry: dict[str, Any]) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed:
            return datetime(*parsed[:6], tzinfo=timezone.utc)
    return None


def _within_last_days(dt: datetime | None, days: int = 7) -> bool:
    if dt is None:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return dt >= cutoff


def _extract_source(entry: dict[str, Any]) -> str:
    source = entry.get("source", {})
    if isinstance(source, dict) and source.get("title"):
        return source["title"]
    link = entry.get("link", "")
    match = re.search(r"https?://(?:www\.)?([^/]+)", link)
    return match.group(1) if match else "출처 미상"


async def collect_issues(keyword: str, days: int = 7, max_items: int = 12) -> list[dict[str, Any]]:
    """키워드 관련 최근 뉴스/이슈를 수집합니다."""
    query = quote_plus(f"{keyword} when:{days}d")
    url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(
            url,
            headers={"User-Agent": "IssueReportBot/1.0 (+https://localhost)"},
        )
        response.raise_for_status()
        feed = feedparser.parse(response.text)

    items: list[dict[str, Any]] = []
    for entry in feed.entries:
        published = _parse_published(entry)
        if not _within_last_days(published, days):
            continue

        title = _strip_html(entry.get("title", ""))
        summary = _strip_html(entry.get("summary", entry.get("description", "")))
        link = entry.get("link", "")

        if not title:
            continue

        items.append(
            {
                "title": title,
                "summary": summary or title,
                "url": link,
                "source": _extract_source(entry),
                "published_at": published.astimezone(KST).isoformat() if published else None,
                "published_display": (
                    published.astimezone(KST).strftime("%Y-%m-%d %H:%M")
                    if published
                    else "날짜 미상"
                ),
            }
        )

        if len(items) >= max_items:
            break

    return items
