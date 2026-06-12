# 이슈 브리핑 (Issue Briefing)

키워드를 입력하면 **최근 7일 이내** 주요 이슈를 자동 수집하고, 한 줄 요약·핵심 내용·출처를 정리한 보고서를 웹에서 확인하거나 이메일로 받을 수 있는 웹 앱입니다.

## 기능

- 키워드 검색 및 **예시 키워드** 원클릭 검색
- 최근 7일 뉴스/이슈 자동 수집 (Google News RSS)
- **한 줄 요약** + 핵심 개요 + 주요 이슈 하이라이트
- **출처 명시** (매체, 게시일, 원문 링크)
- HTML 보고서 **이메일 발송**
- **AI 챗봇** (Gemini 2.5 Flash Lite) — 검색·보고서 해석, 사용법 안내

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

## 이메일 설정 (Gmail)

자세한 설정: [backend/GMAIL_SETUP.md](backend/GMAIL_SETUP.md)

```bash
cd backend
copy .env.example .env
# .env 에 Gmail 주소와 앱 비밀번호 입력
```

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
SMTP_FROM=your-email@gmail.com
```

[Gmail 앱 비밀번호](https://myaccount.google.com/apppasswords) 생성 후 `SMTP_PASSWORD`에 입력 (2단계 인증 필요).

## AI 챗봇 (Gemini)

모델: `gemini-2.5-flash-lite`

로컬 개발 시 `backend/.env`에 API 키 추가:

```env
GEMINI_API_KEY=your-gemini-api-key
```

**Vercel 배포** 시 프로젝트 설정 → Environment Variables에 `GEMINI_API_KEY`를 추가하세요.

화면 우하단 **채팅 버튼**으로 AI 어시스턴트를 열 수 있습니다. 검색 후 생성된 보고서 요약을 컨텍스트로 활용합니다.

## Vercel 배포

### 1. Vercel 프로젝트 설정 (중요)

GitHub `keynews` 저장소를 연결한 뒤 **Settings → General**에서:

| 항목 | 값 |
|------|-----|
| **Root Directory** | *(비워 두기 — 저장소 루트)* |
| **Framework Preset** | **Other** |
| **Build Command** | *(비워 두기 — 빌드 불필요)* |
| **Output Directory** | *(비워 두기 — `public/` 자동 사용)* |
| **Install Command** | *(비워 두기)* |

정적 파일은 저장소 루트의 `public/` 폴더에 있습니다. Vercel이 빌드 없이 자동 배포합니다.

> Root Directory가 `frontend`로 되어 있으면 Vite `npm run build`가 실행되며 **실패**합니다. 반드시 **루트(`.`)** 로 두세요.

### 2. 환경 변수

Settings → Environment Variables:

- `GEMINI_API_KEY` — Gemini API 키

### 3. 배포

```bash
vercel
# 또는 GitHub push 시 자동 배포
```

- 정적 UI: `public/` (빌드 없이 Git에 포함)
- 챗봇 API: `api/chat.py` (서버리스)

- Vercel 배포본: **이슈 검색 + AI 챗봇** (이메일 발송은 미지원)

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/examples` | 예시 키워드 목록 |
| POST | `/api/search` | `{ "keyword": "..." }` — 이슈 수집 및 보고서 생성 (Vercel 지원) |
| POST | `/api/send-email` | `{ "keyword": "...", "email": "..." }` — 이메일 발송 |
| GET | `/api/chat/status` | Gemini API 키 설정 여부 |
| POST | `/api/chat` | `{ "messages": [...], "keyword": "...", "report_context": "..." }` — AI 챗봇 |

## 프로젝트 구조

```
issue-report-app/
├── backend/
│   ├── main.py                 # FastAPI 서버 + 웹 UI 제공
│   └── services/
│       ├── news_collector.py   # Google News RSS 수집
│       ├── summarizer.py       # 한 줄 요약·핵심 정리
│       ├── gemini_chat.py      # Gemini AI 챗봇
│       └── email_sender.py     # HTML 이메일 발송
├── public/                     # HTML/CSS/JS (Vercel + 로컬 공용)
│   ├── index.html
│   └── static/
├── lib/                        # Vercel API 공용 로직 (Node.js)
├── api/
│   ├── search.js               # Vercel 이슈 검색
│   ├── examples.js             # Vercel 예시 키워드
│   ├── chat.js                 # Vercel AI 챗봇
│   └── email/status.js         # Vercel 이메일 상태 (미지원 안내)
└── frontend/                   # (선택) React + Vite 버전
```

## 참고

- 뉴스 데이터는 Google News RSS를 사용하며, 네트워크 환경에 따라 수집 결과가 달라질 수 있습니다.
- 이메일 발송 없이 웹에서만 결과를 확인할 수 있습니다.
