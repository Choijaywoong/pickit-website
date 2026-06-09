# PICKIT MVP 구현 체크리스트

## 완료된 작업
- [x] `server/src/forecast/engine.js` 생성 (카테고리 무관 단일 예측 엔진)
- [x] `server/src/db/salesLog.js` — predictDepletion() 제거, 적재·조회 전용으로 정리
- [x] `server/src/api/routes.js` — /api/predict가 engine.runForecast() 호출

---

## FR-009 재고 자동 동기화 + stockMode 게이트

### 0. PRD.md 갱신 (코드 전에 먼저)
- [ ] FR-001 상세 동작: 공유/분리 재고 후속 질문 추가 (hasInventory=Yes일 때만)
- [ ] FR-001 AC: 공유→동기화 활성, 분리→동기화 비활성(나머지 기능 정상) 추가
- [ ] FR-009 상세: "공유 재고 모드에서만 자동 push" 명시
- [ ] FR-009 AC: "공유 재고 모드 전제" 조건 수정
- [ ] 7절 채널별 지원 범위: "상품 단위 공유/분리 예외 = Phase 2" 한 줄
- [ ] 8절 스코프 Out-of-Scope: "상품 단위 재고 모드 예외 = Phase 2" 추가

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

### 3. 커넥터 getStock() 추가 (핵심 3사만)
- [ ] `server/src/connectors/coupang.js` — getStock({ productId, optionLabel }) 추가
- [ ] `server/src/connectors/naver.js` — getStock({ productId, optionLabel }) 추가
- [ ] `server/src/connectors/cafe24.js` — getStock({ productId, optionLabel }) 추가

### 4. 판매 감지 → 자동 syncStock
- [ ] `server/src/core/toolHandler.js` — query 결과에서 유니크 (productId, optionLabel) 추출
- [ ] stockMode==='shared'일 때만 getStock → syncStock 자동 호출
- [ ] syncStock 실패는 조용히 무시 (FR-005 logOrdersBatch 패턴 동일)

### 5. 동작 확인
- [ ] 공유 재고 셀러: query 후 자동 syncStock 호출 로그 확인
- [ ] 분리 재고 셀러: syncStock 호출 없음, 나머지 기능 정상
- [ ] 서버 기동 오류 없음

---

## FR-006 발주 예측 파이프 연결 (stockMode 결정 + 분리재고 처리 결정 후 진행)

### 6. 게이트 + 호출 경로
- [ ] `client/src/components/ChatWidget.jsx` — hasInventory=false 셀러는 PredictionAlert 비활성
- [ ] 분리 재고: 채널별 독립 예측 (A안 확정 2026-06-09)
- [ ] shared: 전체 기준 단일 예측 / split: 채널별 getStock → 채널별 runForecast
- [ ] 4개월(120일) 이내 소진 채널만 PredictionAlert 카드 표시
- [ ] /api/predict 자동 호출 로직 연결 (대화 시작 시 또는 query 완료 후)

---

## 구독 (가벼운 체험 관리)
- [ ] 온보딩 완료 시 체험 시작일(trialStartedAt) pickit_onboarding에 기록
- [ ] ChatWidget: 14일 경과 시 "체험 기간이 종료되었습니다" 배너 표시
