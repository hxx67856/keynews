# Gmail 이메일 발송 설정

## 1. Google 계정 준비

1. [Google 계정](https://myaccount.google.com/) 접속
2. **보안** → **2단계 인증** 켜기 (필수)

## 2. 앱 비밀번호 생성

1. [앱 비밀번호](https://myaccount.google.com/apppasswords) 페이지 열기
2. 앱 이름: `Issue Briefing` (아무 이름 가능)
3. **만들기** 클릭
4. 표시되는 **16자리 비밀번호** 복사 (공백 없이 입력해도 됨)

## 3. `.env` 파일 수정

`backend/.env` 파일을 열고 아래 두 항목만 본인 정보로 변경:

```env
SMTP_USER=본인@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=본인@gmail.com
```

`SMTP_FROM`은 보통 `SMTP_USER`와 동일하게 설정합니다.

## 4. 서버 재시작

```bash
cd backend
.venv\Scripts\uvicorn main:app --reload --port 8000
```

## 5. 확인

- 브라우저: http://localhost:8000/api/email/status  
  → `"configured": true` 이면 OK
- 웹에서 키워드 검색 → 이메일 입력 → **이메일로 보고서 받기**

## 자주 발생하는 오류

| 증상 | 해결 |
|------|------|
| **535 BadCredentials** | 앱 비밀번호 **재생성** 후 `.env` 갱신 (일반 비밀번호 불가) |
| SMTP 설정이 없습니다 | `.env` 파일 경로·값 확인 후 서버 재시작 |
| Authentication failed | 2단계 인증 활성화 여부 확인 |
| 메일이 스팸함으로 | 정상 동작 시에도 스팸함 확인 |

### 535 오류일 때 (가장 흔함)

1. [앱 비밀번호](https://myaccount.google.com/apppasswords) 페이지에서 **기존 비밀번호 삭제**
2. **새 앱 비밀번호** 생성 (16자리)
3. `backend/.env` 의 `SMTP_PASSWORD=` 에 붙여넣기
4. 서버 재시작
5. http://localhost:8000/api/email/test 로 인증 테스트 (POST)

```bash
curl -X POST http://localhost:8000/api/email/test
```
