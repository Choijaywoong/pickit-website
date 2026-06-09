# PICKIT MVP — 컨텍스트 노트

## FR-006 발주 예측 엔진

### 핵심 결정 사항
- 단일 엔진, 카테고리 입력 없음 (규칙 ⑤) — 2026-06-09 확정
- LLM은 숫자를 만지지 않는다 (규칙 ⑥) — /api/predict는 LLM 루프 밖
- 콜드 스타트: A안(예측 보류) 채택. "데이터 누적 중 — 약 N일 후 예측 시작"
- B안(유사 상품 평균): Phase 2+ 보류
- 사용기한 보정 레이어: Phase 2+, engine.js 출력 후처리로 분리
- 계절성 보정: Phase 2+ (1년+ 데이터 필요)

### 추세 계수 설계
- 기준 120일, 추세 30일, clamp 0.5~2.0
- 최근 30일 판매 없으면 trendFactor = 1.0 (중립)

### 파일 의존 관계
```
routes.js → forecast/engine.js → db/salesLog.js(getDailySalesRate)
```

---

## FR-009 재고 자동 동기화

### stockMode 도입 — 2026-06-09 확정
- 온보딩 hasInventory=Yes일 때만 stockMode 질문
- stockMode: 'shared'(공유 창고) | 'split'(채널별 분리)
- hasInventory=No → stockMode 없음 (동기화 비활성)
- 전역 stockMode 하나. 상품 단위 예외는 Phase 2.

### 동기화 게이트 로직
- stockMode==='shared' → 판매 감지 후 getStock → syncStock 자동 호출
- stockMode==='split' → 동기화 비활성. 조회·송장·가격수정 등 나머지 기능은 정상
- 게이트 위치: toolHandler.js (query 후, logOrdersBatch 바로 다음)

### 마스터 재고 방식: 소스 채널 getStock 실시간 조회 확정
- 판매 발생 채널에서 현재 재고 API 조회 후 다른 채널에 push
- 이유: PICKIT이 재고 숫자를 직접 계산하지 않아 틀릴 위험이 없음
- 커넥터 3개(coupang, naver, cafe24)에 getStock() 추가 필요

### syncStock 호출 방식
- query 결과에서 유니크 (productId, optionLabel) 추출
- 소스 채널 getStock → 현재 재고 조회
- 다른 핵심 2채널에 push
- 실패는 무시 (logOrdersBatch 패턴 — 동기화 실패가 조회를 막으면 안 됨)
- 멱등성 보장: 같은 쿼리를 두 번 해도 현재 재고를 두 번 push할 뿐, 이중 차감 없음

### stockMode 전달 경로
- 클라이언트 localStorage → chat 요청 body → routes.js → llm.js → toolHandler.js

---

## FR-006 발주 예측 파이프 연결 — 2026-06-09 완료

### 파이프 흐름
```
chat(query) → toolHandler → buildPredictions() → llm.js 누적 → chat 응답 predictions[] → ChatWidget PredictionAlert
```

### 핵심 결정
- 트리거: query action + stockMode !== null (hasInventory 셀러 proxy)
- 제품 식별: orders[].items[].productName 에서 유니크 추출
- currentStock: connector.getStock() 실시간 조회 (클라이언트가 알 필요 없음)
- 4개월(120일) 필터: daysLeft > 120인 카드는 표시 안 함
- 정렬: daysLeft 오름차순 (긴급 순)
- 데이터 포맷: { productName, option, daysLeft, recommendQty } — PredictionAlert 스펙 그대로
- shared/split 모두 동일 로직 (split은 채널별 독립 예측이 자연스럽게 됨)
- best-effort: 예측 실패해도 chat 응답 자체는 정상 반환

### 파일 의존 관계 (최종)
```
toolHandler.js → forecast/engine.js
toolHandler.js → connectors/[platform].getStock()
llm.js  → toolHandler.js (predictions[] 누적)
ChatWidget.jsx → data.predictions → PredictionAlert
```

---

## FR-006 × FR-009 교차 — 분리 재고 currentStock 처리 (미확정)

공유 재고: getStock(sourceChannel) = 전체 재고. 단일 예측.
분리 재고: 채널별 재고가 다름. currentStock을 어떻게 줄지 오너 결정 대기 중.

확정 (2026-06-09):
  A. 채널별 독립 예측 채택
  - 채널마다 getStock → 채널별 판매 속도(sales_log per-platform)로 각각 예측
  - 카드 폭발 방지: 4개월(120일) 이내 소진 채널만 알림 표시 (공유 재고 AC와 동일 기준)
  - 여유 채널은 표시하지 않음
  B 탈락 이유: 합산이 "먼저 소진되는 채널" 정보를 뭉갬
  C 탈락 이유: 데이터가 있는데 기능을 포기하는 것

---

## 온보딩 플로우 (최신)

```
hasInventory 질문
  ├─ No  → 채널 선택 → API 키 입력 → 완료 (stockMode 없음)
  └─ Yes → stockMode 질문 → 채널 선택 → API 키 입력 → 완료
```

저장 구조 (pickit_onboarding):
```json
{
  "hasInventory": true,
  "stockMode": "shared",   // hasInventory=Yes일 때만 존재
  "channels": ["coupang", "naver"],
  "trialStartedAt": "2026-06-09"
}
```

---

## 구독 (MVP 최소 구현)
- 온보딩 완료 시 trialStartedAt 기록 (localStorage)
- ChatWidget: 14일 경과 시 배너 표시
- PG 결제 연동: PMF 검증 후 Phase 2
