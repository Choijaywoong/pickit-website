// 발주 예측 코어 엔진 — 카테고리 무관, 결정론적 통계 계산
// LLM은 이 출력을 자연어로 설명만 한다. 숫자 계산은 여기서만.

const { getDailySalesRate } = require('../db/salesLog');

const MIN_ACTIVE_DAYS = 14;  // 이 일수 미만이면 콜드 스타트 (예측 보류)
const BASE_WINDOW     = 120; // 기준 속도 계산 윈도우 (일)
const TREND_WINDOW    = 30;  // 추세 보정 단기 윈도우 (일)
const TREND_MIN       = 0.5; // 추세 계수 하한 — 절반 미만 폭락은 이상치
const TREND_MAX       = 2.0; // 추세 계수 상한 — 2배 초과 급등은 이상치
const RECOMMEND_DAYS  = 90;  // 권장 발주량 기준 일수

/**
 * runForecast — 상품 옵션별 재고 소진 예측을 반환한다.
 *
 * 반환값 status 종류:
 *   'no_data'     — sales_log에 해당 상품 데이터가 전혀 없음
 *   'cold_start'  — 데이터가 있지만 MIN_ACTIVE_DAYS 미만 (예측 보류)
 *   'ok'          — 정상 예측 결과
 *
 * 왜 카테고리 입력이 없나?
 *   계절성·추세 보정값을 hardcode하면 카테고리가 바뀔 때마다 코드를 열어야 한다.
 *   대신 sales_log 데이터 자체에서 추세를 계산한다 — 카테고리는 입력이 아니라 데이터의 결과.
 */
async function runForecast({ platform, productId, currentStock }) {
  // 장기(120일)·단기(30일) 데이터를 동시에 조회해서 추세를 뽑는다
  const [longData, recentData] = await Promise.all([
    getDailySalesRate({ platform, productId, days: BASE_WINDOW }),
    getDailySalesRate({ platform, productId, days: TREND_WINDOW }),
  ]);

  // 해당 상품 데이터 자체가 없음
  if (longData.length === 0) {
    return [{
      status:          'no_data',
      daysUntilReady:  MIN_ACTIVE_DAYS,
      message:         `데이터 누적 중 — 약 ${MIN_ACTIVE_DAYS}일 후 예측 시작`,
    }];
  }

  // 옵션별로 각각 계산
  return longData.map((baseRow) => {
    const activeDays = Number(baseRow.active_days);

    // 콜드 스타트: 데이터는 있지만 아직 신뢰할 수 없는 수준
    if (activeDays < MIN_ACTIVE_DAYS) {
      const daysUntilReady = MIN_ACTIVE_DAYS - activeDays;
      return {
        status:          'cold_start',
        optionLabel:     baseRow.option_label || '전체',
        activeDays,
        daysUntilReady,
        message:         `데이터 누적 중 — 약 ${daysUntilReady}일 후 예측 시작`,
      };
    }

    // 기준 속도: 120일 이동평균 (일 판매량)
    const baseDailyRate = Number(baseRow.total) / activeDays;

    // 추세 계수: 최근 30일 일평균 ÷ 120일 일평균
    // → 최근 잘 팔리면 1.2, 덜 팔리면 0.8 — hardcode 없이 데이터에서 자동 산출
    const recentRow = recentData.find((r) => r.option_id === baseRow.option_id);
    let trendFactor = 1.0; // 최근 30일 데이터 없으면 중립(1.0)으로 처리
    if (recentRow && Number(recentRow.active_days) > 0) {
      const recentDailyRate = Number(recentRow.total) / Number(recentRow.active_days);
      const rawFactor = recentDailyRate / baseDailyRate;
      trendFactor = Math.max(TREND_MIN, Math.min(TREND_MAX, rawFactor));
    }

    const adjustedRate  = baseDailyRate * trendFactor;
    const daysLeft      = adjustedRate > 0 ? Math.floor(currentStock / adjustedRate) : null;
    const depletionDate = daysLeft != null
      ? new Date(Date.now() + daysLeft * 86_400_000).toISOString().slice(0, 10)
      : null;

    return {
      status:         'ok',
      optionLabel:    baseRow.option_label || '전체',
      baseDailyRate:  parseFloat(baseDailyRate.toFixed(2)),
      trendFactor:    parseFloat(trendFactor.toFixed(2)),
      adjustedRate:   parseFloat(adjustedRate.toFixed(2)),
      daysLeft,
      depletionDate,
      isUrgent:       daysLeft != null && daysLeft <= 30,
      recommendOrder: Math.ceil(adjustedRate * RECOMMEND_DAYS),
    };
  });
}

module.exports = { runForecast };
