# PICKIT MVP 구현 체크리스트

## 완료된 작업
- [x] `server/src/forecast/engine.js` 생성 (카테고리 무관 단일 예측 엔진)
- [x] `server/src/db/salesLog.js` — predictDepletion() 제거, 적재·조회 전용으로 정리
- [x] `server/src/api/routes.js` — /api/predict가 engine.runForecast() 호출
- [x] Vercel 배포 (weave-synchub.vercel.app)
- [x] landing/index.html → client/public/landing.html 이식 (iframe 방식)

---

## CS 챗봇 구현

### 1단계 — UI (API 없음)
- [ ] `client/src/components/CS/` 폴더 생성
- [ ] `client/src/components/CS/CSChatButton.jsx` — 플로팅 버튼
- [ ] `client/src/components/CS/CSChatWidget.jsx` — 채팅 팝업창
- [ ] `client/src/components/CS/CS.module.css` — 스타일 (CSS Modules)
- [ ] `client/src/App.jsx` — `<CSChatButton />` 추가 (항상 렌더)
- [ ] 로컬 확인: 버튼 토글, 인사 메시지, 유형 태그, 말풍선 스타일

### 2단계 — Claude API 연동
- [ ] `server/src/core/csAutoReply.js` — AI 1차 답변 + 에스컬레이션 판단
- [ ] `server/src/api/routes.js` — POST /api/cs/message 라우트 추가
- [ ] `client/src/components/CS/CSChatWidget.jsx` — 실제 API 호출 연결
- [ ] Claude API 오류 시 자동 에스컬레이션 처리 확인

### 3단계 — Supabase cs_tickets
- [ ] Supabase에 cs_tickets 테이블 생성 (SQL 마이그레이션)
- [ ] `server/src/core/csAutoReply.js` — 에스컬레이션 시 Supabase insert
- [ ] 저장 확인: 대화 JSON, issue_type, escalated_at

### 4단계 — 슬랙 알림 + 이메일 수집
- [ ] `server/src/core/slackNotify.js` — 슬랙 웹훅 전송
- [ ] csAutoReply.js에서 slackNotify 호출 (슬랙 실패해도 Supabase 저장 보장)
- [ ] CSChatWidget에 비로그인 이메일 수집 UI (에스컬레이션 직후 1회만)
- [ ] Vercel 환경 변수 SLACK_WEBHOOK_URL 설정

---

## FR-009 재고 자동 동기화 + stockMode 게이트 (보류)

### 1. 온보딩 StepStockMode 추가 (프론트)
- [ ] `client/src/components/Onboarding/StepStockMode.jsx` 신규 생성
- [ ] `client/src/components/Onboarding/StepStockMode.module.css` 신규 생성
- [ ] `client/src/components/Onboarding/index.jsx` — hasInventory=Yes면 StepStockMode 삽입
- [ ] pickit_onboarding에 stockMode('shared'|'split') 저장

### 2. stockMode 서버 전달
- [ ] `client/src/components/ChatWidget.jsx` — chat 요청 body에 stockMode 추가
- [ ] `server/src/api/routes.js` — /chat에서 stockMode 수신
- [ ] `server/src/core/llm.js` — chat() 파라미터에 stockMode 추가, handleToolCall에 전달
- [ ] `server/src/core/toolHandler.js` — handleToolCall에 stockMode 파라미터 추가

---

## FR-006 발주 예측 (보류)
- [ ] 분리 재고: 채널별 독립 예측
- [ ] 4개월(120일) 이내 소진 채널만 PredictionAlert 카드 표시
- [ ] /api/predict 자동 호출 로직 연결

---

## 구독 (가벼운 체험 관리)
- [ ] 온보딩 완료 시 체험 시작일(trialStartedAt) pickit_onboarding에 기록
- [ ] ChatWidget: 14일 경과 시 "체험 기간이 종료되었습니다" 배너 표시
