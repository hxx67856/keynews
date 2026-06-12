# 이슈 브리핑 (Issue Briefing)

키워드를 입력하면 **최근 7일 이내** 주요 이슈를 자동 수집하고, 한 줄 요약·핵심 내용·출처를 정리한 보고서를 웹에서 확인하거나 이메일로 받을 수 있는 웹 앱입니다.

## 기능

- 키워드 검색 및 **예시 키워드** 원클릭 검색
- 최근 7일 뉴스/이슈 자동 수집 (Google News RSS)
- **한 줄 요약** + 핵심 개요 + 주요 이슈 하이라이트
- **출처 명시** (매체, 게시일, 원문 링크)
- HTML 보고서 **이메일 발송**

## 실행 방법 (Python만 필요)

```bash
cd issue-report-app/backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env
# .env 파일에 SMTP 설정 입력 (이메일 발송 시 필요)

uvicorn main:app --reload --port 8000
```

브라우저에서 **http://localhost:8000** 접속

## 이메일 설정

`backend/.env` 파일 예시:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

Gmail 사용 시 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 생성해 `SMTP_PASSWORD`에 입력하세요.

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/examples` | 예시 키워드 목록 |
| POST | `/api/search` | `{ "keyword": "..." }` — 이슈 수집 및 보고서 생성 |
| POST | `/api/send-email` | `{ "keyword": "...", "email": "..." }` — 이메일 발송 |

## 프로젝트 구조

```
issue-report-app/
├── backend/
│   ├── main.py                 # FastAPI 서버 + 웹 UI 제공
│   ├── static/                 # HTML/CSS/JS 프론트엔드
│   └── services/
│       ├── news_collector.py   # Google News RSS 수집
│       ├── summarizer.py       # 한 줄 요약·핵심 정리
│       └── email_sender.py     # HTML 이메일 발송
└── frontend/                   # (선택) React + Vite 버전
```

## 참고

- 뉴스 데이터는 Google News RSS를 사용하며, 네트워크 환경에 따라 수집 결과가 달라질 수 있습니다.
- 이메일 발송 없이 웹에서만 결과를 확인할 수 있습니다.
