// AI(LLM)에게 노출되는 단 하나의 함수: modify_product_data
// AI는 platform 값만 넘기고, 실제 채널 API 호출은 connectors/ 에서 처리
// → 채널 추가 시 connectors/ 에 파일 하나만 추가하면 됨 (AI 코드 무변경)

const { checkSafetyGuardrail, PARTNER_CENTER_LINKS } = require('./guardrail');
const connectors = require('../connectors');
const { logOrdersBatch } = require('../db/salesLog');
const { syncStock } = require('./stockSync');
const { runForecast } = require('../forecast/engine');

// 읽기 전용 액션: 방화벽 write 검사 제외
const READ_ACTIONS = ['query', 'export'];

const TOOL_DEFINITION = {
  name: 'modify_product_data',
  description: '쇼핑몰 채널의 상품 정보(가격·재고·송장·조회·엑셀추출)를 처리한다.',
  input_schema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['coupang', 'naver', 'cafe24', 'musinsa', 'ably', 'zigzag'],
        description: '처리할 채널명',
      },
      productId: {
        type: 'string',
        description: '상품 ID 또는 상품명 (조회·export는 생략 가능)',
      },
      action: {
        type: 'string',
        enum: ['query', 'export', 'price', 'stock', 'invoice'],
        description: 'query=조회, export=엑셀추출(사용자가 엑셀/다운로드 요청 시), price=가격수정, stock=재고/품절, invoice=송장전송',
      },
      value: {
        type: 'object',
        description: 'action에 따른 값. query/export:{startDate,endDate,status} / price:{newPrice,currentPrice} / stock:{quantity,optionLabel} 또는 {soldOut:true,optionLabel} / invoice:{trackingNumber,courier}',
      },
      targetCount: {
        type: 'number',
        description: '수정 대상 상품 수 (범위 방화벽 판단용)',
      },
      rawQuery: {
        type: 'string',
        description: '사용자 원본 입력 (일괄 키워드 감지용)',
      },
      confidence: {
        type: 'number',
        description: '의도 파싱 확신도 0~100',
      },
    },
    required: ['platform', 'action'],
  },
};

// FR-006: query 결과에서 발주 예측 생성 (stockMode !== null = hasInventory 셀러만)
// 주문 목록의 상품명으로 getStock → runForecast, 4개월(120일) 이내 소진 건만 반환
// best-effort — 실패 무시, PredictionAlert 카드 데이터로 사용
async function buildPredictions(platform, orders) {
  const connector = connectors[platform];
  if (!connector?.getStock) return [];

  const seen = new Set();
  const products = [];
  for (const order of orders) {
    for (const item of (order.items || [])) {
      if (item.productName && !seen.has(item.productName)) {
        seen.add(item.productName);
        products.push(item.productName);
      }
    }
  }
  if (!products.length) return [];

  const predictions = [];
  await Promise.allSettled(
    products.map(async (productName) => {
      const stocks = await connector.getStock({ productId: productName }).catch(() => []);
      await Promise.allSettled(
        stocks.map(async ({ optionLabel, quantity }) => {
          const forecast = await runForecast({ platform, productId: productName, currentStock: quantity }).catch(() => []);
          const relevant = forecast.filter(
            (f) => f.status === 'ok' && f.daysLeft != null && f.daysLeft <= 120
          );
          relevant.forEach((f) => {
            predictions.push({
              productName,
              option:       f.optionLabel !== '전체' ? f.optionLabel : null,
              daysLeft:     f.daysLeft,
              recommendQty: f.recommendOrder,
              isUrgent:     f.isUrgent,
              platform,
            });
          });
        })
      );
    })
  );
  predictions.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  return predictions;
}

// FR-009: shared 재고 모드에서 query 후 현재 재고를 다른 채널로 자동 동기화
// best-effort — 실패 전부 무시, 메인 응답 지연 없음
async function autoSyncAfterQuery(platform, orders) {
  const connector = connectors[platform];
  if (!connector?.getStock) return;

  const seen  = new Set();
  const pairs = [];
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const key = `${item.productName}||${item.optionValue || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ productId: item.productName, optionLabel: item.optionValue || '' });
      }
    }
  }
  if (!pairs.length) return;

  await Promise.allSettled(
    pairs.map(async ({ productId, optionLabel }) => {
      const stocks = await connector.getStock({ productId, optionLabel }).catch(() => []);
      await Promise.allSettled(
        stocks.map(({ optionLabel: ol, quantity }) =>
          syncStock({ sourcePlatform: platform, productId, optionLabel: ol, newQuantity: quantity })
        )
      );
    })
  );
}

// 에러 메시지에서 연동 끊김 여부 판단 (FR-008)
function detectConnectionError(platform, message) {
  const isAuthErr = /401|403|만료|expired|invalid.*key|api.key/i.test(message);
  const isEnvMissing = /\.env에/.test(message);
  if (isAuthErr || isEnvMissing) {
    return {
      connectionError: true,
      platform,
      message: isEnvMissing
        ? `[${platform}] 연동 설정이 필요합니다. 우측 설정 메뉴에서 API 키를 입력해 주세요.`
        : `[${platform}] 연동이 만료되었습니다. 우측 설정 메뉴에서 다시 연결해 주세요.`,
      link: PARTNER_CENTER_LINKS[platform] || null,
    };
  }
  return null;
}

async function handleToolCall({ platform, productId, action, value, targetCount, rawQuery, confidence, stockMode }) {
  // 방화벽 (읽기 전용 액션은 write 검사 건너뜀)
  const guardResult = checkSafetyGuardrail({
    action: READ_ACTIONS.includes(action) ? 'query' : action,
    platform,
    newPrice:     value?.newPrice,
    currentPrice: value?.currentPrice,
    targetCount,
    rawQuery,
    confidence,
  });

  if (guardResult.isDangerous) return { held: true, ...guardResult };

  const connector = connectors[platform];
  if (!connector) return { error: true, message: `지원하지 않는 채널입니다: ${platform}` };

  try {
    // export: query를 실행한 뒤 excelReady 플래그로 감싸서 반환
    if (action === 'export') {
      const queryResult = await connector.query({ productId, value });
      const ym       = new Date().toISOString().slice(0, 7).replace('-', '_');
      const filename  = `${ym}_${platform}_주문내역.xlsx`;
      return { success: true, platform, action: 'export', excelData: queryResult, filename };
    }

    const result = await connector[action]({ productId, value });

    // FR-006: query/export 결과의 주문 목록을 sales_log에 자동 적재
    if ((action === 'query' || action === 'export') && result.orders) {
      logOrdersBatch(platform, result.orders).catch(() => {});
      // FR-009: shared 모드에서만 자동 재고 동기화
      if (stockMode === 'shared') {
        autoSyncAfterQuery(platform, result.orders).catch(() => {});
      }
    }

    // FR-006: 발주 예측 (hasInventory 셀러만 — stockMode !== null 이 proxy)
    // split: 채널별 독립 예측, shared: 소스 채널 기준 단일 예측
    let predictions = null;
    if (stockMode !== null && action === 'query' && result.orders?.length) {
      predictions = await buildPredictions(platform, result.orders).catch(() => null);
    }

    return {
      success: true, platform, action, result,
      ...(predictions?.length && { predictions }),
    };

  } catch (err) {
    // FR-008: 연동 끊김 감지 → 구조화된 connectionError 반환
    const connErr = detectConnectionError(platform, err.message);
    if (connErr) return connErr;
    return { error: true, platform, message: err.message };
  }
}

module.exports = { handleToolCall, TOOL_DEFINITION };
