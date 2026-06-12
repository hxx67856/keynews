"""수집된 이슈를 세 줄 요약 및 핵심 보고서로 정리."""

from __future__ import annotations

import re
from collections import Counter
from typing import Any


def _top_terms(texts: list[str], limit: int = 5) -> list[str]:
    stop = {
        "및", "등", "the", "and", "for", "with", "from", "that", "this",
        "에서", "으로", "하는", "있다", "없다", "대한", "관련", "통해",
        "뉴스", "기사", "보도", "최근", "이번", "지난", "속보", "단독",
        "오늘", "내일", "어제", "정부", "발표", "예정", "진행", "가능",
    }
    tokens: list[str] = []
    for text in texts:
        for raw in text.replace(",", " ").replace(".", " ").split():
            word = raw.strip("·…\"'()[]")
            if len(word) >= 2 and word not in stop and not word.isdigit():
                tokens.append(word)
    return [term for term, _ in Counter(tokens).most_common(limit)]


def _clean_title(title: str, source: str = "") -> str:
    cleaned = title.strip()
    for sep in (" - ", " – ", " — ", " | ", " · "):
        if sep not in cleaned:
            continue
        head, tail = cleaned.rsplit(sep, 1)
        tail = tail.strip()
        if not tail:
            continue
        if source and (tail == source or tail in source or source in tail):
            return head.strip()
        if len(tail) <= 24 and not re.search(r"[?!…]", tail):
            return head.strip()
    return cleaned


def _truncate(text: str, max_len: int = 36) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    cut = text[: max_len - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(",.") + "…"


def _unique_preserve(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = re.sub(r"\s+", "", item.lower())
        if key not in seen and item.strip():
            seen.add(key)
            result.append(item.strip())
    return result


def _clean_summary(summary: str, source: str, title: str) -> str:
    text = re.sub(r"\s+", " ", summary).strip()
    text = _clean_title(text, source)
    if source:
        for pattern in (f" {source}", f" · {source}", source):
            if text.endswith(pattern):
                text = text[: -len(pattern)].strip()
    title_norm = re.sub(r"[^\w가-힣]", "", title.lower())
    text_norm = re.sub(r"[^\w가-힣]", "", text.lower())
    if not text_norm or text_norm == title_norm or title_norm in text_norm:
        return ""
    return text


def _first_sentence(text: str) -> str:
    parts = re.split(r"(?<=[.!?。])\s+", text.strip())
    return parts[0] if parts else text.strip()


def _short_date(published_display: str) -> str:
    if len(published_display) >= 10 and published_display[4] == "-":
        return published_display[5:10]
    return published_display


def _link_label(source: str, url: str) -> str:
    if source and source != "출처 미상":
        return _truncate(source, 14)
    match = re.search(r"https?://(?:www\.)?([^/]+)", url)
    if match:
        domain = match.group(1)
        return domain.split(".")[0][:12] if "." in domain else domain[:12]
    return "원문"


def _short_url(url: str, max_len: int = 52) -> str:
    url = url.strip()
    if len(url) <= max_len:
        return url
    return url[: max_len - 1] + "…"


def _filter_terms(terms: list[str], items: list[dict[str, Any]]) -> list[str]:
    blocked: set[str] = set()
    for item in items:
        for word in re.split(r"[\s·\-|]+", item.get("source", "")):
            if len(word) >= 2:
                blocked.add(word.lower())
    return [t for t in terms if t.lower() not in blocked][:4]


def _build_three_line_summary(keyword: str, items: list[dict[str, Any]]) -> list[str]:
    cleaned_titles = _unique_preserve(
        [_clean_title(item["title"], item.get("source", "")) for item in items[:6]]
    )
    n = len(items)
    terms = _filter_terms(_top_terms(cleaned_titles, limit=6), items)

    line1 = (
        f"최근 7일간 '{keyword}' 관련 보도 {n}건이 수집되었으며, "
        f"정책·산업·시장 등 여러 영역에서 연쇄적으로 이슈가 이어지고 있습니다."
    )

    if len(cleaned_titles) >= 2:
        lead = _truncate(cleaned_titles[0], 42)
        second = _truncate(cleaned_titles[1], 42)
        if len(cleaned_titles) >= 3:
            third = _truncate(cleaned_titles[2], 36)
            line2 = f"핵심 화두는 「{lead}」, 「{second}」, 「{third}」 순으로 부각됩니다."
        else:
            line2 = f"핵심 화두는 「{lead}」와 「{second}」 두 축으로 압축됩니다."
    elif cleaned_titles:
        line2 = f"핵심 화두는 「{_truncate(cleaned_titles[0], 48)}」로 집중됩니다."
    else:
        line2 = "수집된 기사에서 뚜렷한 단일 화두를 특정하기 어렵습니다."

    if terms:
        line3 = (
            f"보도 전반에서 {', '.join(terms[:3])} 관련 논의가 반복되며, "
            f"후속 조치와 시장·여론 반응을 주시할 필요가 있습니다."
        )
    else:
        line3 = (
            "보도 내용이 다양한 세부 주제로 분산되어 있어, "
            "향후 후속 기사 흐름을 통해 논점이 재정리될 가능성이 큽니다."
        )

    return [line1, line2, line3]


def _build_overview(keyword: str, items: list[dict[str, Any]], terms: list[str]) -> str:
    n = len(items)
    dated = [
        item for item in items
        if item.get("published_display") and item["published_display"] != "날짜 미상"
    ]

    if not dated:
        timing = "보도 시점 정보는 일부 제한적이나"
    elif len(dated) >= 4:
        earliest = _short_date(dated[-1]["published_display"])
        latest = _short_date(dated[0]["published_display"])
        timing = f"{earliest}부터 {latest}까지 이슈가 지속적으로 갱신되었으며"
    else:
        timing = "최근 며칠 사이 보도가 집중적으로 쏟아졌으며"

    if terms:
        cluster = ", ".join(terms[:4])
        return (
            f"{timing}, '{keyword}' 관련 논의는 {cluster} 등 "
            f"서로 연관된 키워드군을 중심으로 확장되고 있습니다. "
            f"동일 키워드 내에서도 초기 보도(사실 전달)와 후속 보도(영향·대응 분석)가 "
            f"교차하는 양상이 나타나, 단순 사건 요약을 넘어 구조적 변화 신호로 해석할 여지가 있습니다."
        )

    return (
        f"{timing}, '{keyword}' 관련 {n}건의 보도는 단일 이벤트보다 "
        f"분산된 관심사가 동시에 부각되는 패턴을 보입니다. "
        f"향후 동일 키워드에 대한 추가 보도가 이어질 경우, "
        f"현재 분산된 논점 중 일부가 핵심 쟁점으로 수렴할 가능성을 염두에 두어야 합니다."
    )


def build_report(keyword: str, items: list[dict[str, Any]]) -> dict[str, Any]:
    if not items:
        return {
            "three_line_summary": [
                f"'{keyword}' 관련 최근 7일 내 주요 이슈를 찾지 못했습니다.",
                "키워드 표기를 바꾸거나 더 구체적인 검색어를 시도해 보세요.",
                "예: '인공지능 규제', '반도체 수출' 등",
            ],
            "overview": "검색 결과가 없습니다. 키워드를 바꾸거나 영문/한글 표기를 조정해 보세요.",
            "highlights": [],
            "sources": [],
        }

    titles = [_clean_title(item["title"], item.get("source", "")) for item in items]
    terms = _top_terms(titles)
    three_line_summary = _build_three_line_summary(keyword, items)
    overview = _build_overview(keyword, items, terms)

    highlights = []
    for idx, item in enumerate(items[:6], start=1):
        title_clean = _clean_title(item["title"], item.get("source", ""))
        body = _clean_summary(item.get("summary", ""), item.get("source", ""), title_clean)
        if not body:
            body = title_clean
        key_point = body[:180] + ("…" if len(body) > 180 else "")
        url = item["url"]
        highlights.append(
            {
                "rank": idx,
                "title": title_clean,
                "key_point": key_point,
                "source": item["source"],
                "link_label": _link_label(item["source"], url),
                "url": url,
                "url_short": _short_url(url),
                "published_display": item["published_display"],
                "date_short": _short_date(item["published_display"]),
            }
        )

    sources = []
    for idx, item in enumerate(items, start=1):
        url = item["url"]
        sources.append(
            {
                "index": idx,
                "title": _clean_title(item["title"], item.get("source", "")),
                "source": item["source"],
                "link_label": _link_label(item["source"], url),
                "url": url,
                "url_short": _short_url(url),
                "published_display": item["published_display"],
                "date_short": _short_date(item["published_display"]),
            }
        )

    return {
        "three_line_summary": three_line_summary,
        "overview": overview,
        "highlights": highlights,
        "sources": sources,
    }
