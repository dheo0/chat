# 1:1 AI 법률 상담 채팅

Node.js 기반 1:1 실시간 법률 상담 채팅 애플리케이션입니다. Claude AI가 법률 상담사 역할을 합니다.

## 기술 스택

- **Backend**: Node.js, Express, Socket.io
- **AI**: Claude API (`claude-sonnet-4-6`)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## 주요 기능

- 실시간 채팅 (Socket.io 양방향 통신)
- AI 법률 상담 (민사·형사·노동·계약·가족·부동산·행정법)
- 세션별 대화 기록 관리
- 대화 초기화 기능
- 타이핑 인디케이터

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 입력

# 서버 실행
npm start
```

브라우저에서 `http://localhost:3000` 접속

## 환경변수

| 변수명 | 설명 |
|--------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `PORT` | 서버 포트 (기본값: 3000) |
