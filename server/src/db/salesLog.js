// sales_log: 상품별 집계 판매량 시계열 테이블
// 개인정보 없음. 발주 예측(FR-006)의 데이터 원천.
// MVP 배포 즉시 적재 시작 필수 — 늦으면 예측 기능 영구 불가

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sales_log (
    id            SERIAL PRIMARY KEY,
    platform      VARCHAR(20)  NOT NULL,
    product_id    VARCHAR(100) NOT NULL,
    order_id      VARCHAR(100),
    option_id     VARCHAR(100),
    option_label  VARCHAR(200),
    quantity      INTEGER      NOT NULL DEFAULT 1,
    sale_date     DATE         NOT NULL,
    recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (platform, order_id)
  );
  CREATE INDEX IF NOT EXISTS idx_sales_log_product ON sales_log (platform, product_id, sale_date);
`;

async function initTable() {
  await pool.query(CREATE_TABLE_SQL);
  console.log('sales_log 테이블 준비 완료');
}

// 주문 처리 완료 시 적재 (order_id 기준 중복 무시)
async function logSale({ platform, productId, orderId, optionId, optionLabel, quantity, saleDate }) {
  await pool.query(
    `INSERT INTO sales_log (platform, product_id, order_id, option_id, option_label, quantity, sale_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (platform, order_id) DO NOTHING`,
    [platform, productId, orderId || null, optionId, optionLabel, quantity, saleDate]
  );
}

// 쿼리 결과의 주문 목록을 일괄 적재 (query 액션 후 자동 호출)
async function logOrdersBatch(platform, orders = []) {
  for (const order of orders) {
    for (const item of order.items || []) {
      await logSale({
        platform,
        productId:   item.productId || 'unknown',
        orderId:     order.orderId,
        optionLabel: item.optionValue,
        quantity:    item.quantity || 1,
        saleDate:    order.paidAt ? order.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      }).catch(() => {}); // 개별 실패는 무시 (적재 실패가 조회 응답을 막으면 안 됨)
    }
  }
}

// 발주 예측용: 최근 N일 판매 속도
async function getDailySalesRate({ platform, productId, days = 120 }) {
  const { rows } = await pool.query(
    `SELECT option_id, option_label,
            SUM(quantity) AS total,
            COUNT(DISTINCT sale_date) AS active_days
     FROM sales_log
     WHERE platform = $1 AND product_id = $2
       AND sale_date >= CURRENT_DATE - $3
     GROUP BY option_id, option_label`,
    [platform, productId, days]
  );
  return rows;
}

// FR-006: 재고 소진 예측
// currentStock: 현재 재고 수량 (셀러가 제공하거나 채널 API로 조회)
async function predictDepletion({ platform, productId, currentStock, days = 120 }) {
  const salesData = await getDailySalesRate({ platform, productId, days });

  if (salesData.length === 0) {
    return { status: 'no_data', message: '아직 판매 데이터가 없습니다. 데이터가 누적되면 예측이 가능합니다.' };
  }

  return salesData.map((row) => {
    const dailyRate = row.active_days > 0 ? row.total / row.active_days : 0;

    if (dailyRate === 0) {
      return { optionLabel: row.option_label, dailyRate: 0, depletionDate: null, message: '판매 이력이 없습니다.' };
    }

    const daysLeft      = Math.floor(currentStock / dailyRate);
    const depletionDate = new Date(Date.now() + daysLeft * 86_400_000).toISOString().slice(0, 10);
    const isUrgent      = daysLeft <= 30; // 30일 이내면 긴급

    return {
      optionLabel:    row.option_label || '전체',
      dailyRate:      parseFloat(dailyRate.toFixed(2)),
      daysLeft,
      depletionDate,
      isUrgent,
      recommendOrder: Math.ceil(dailyRate * 90), // 90일치 권장 발주량
    };
  });
}

module.exports = { initTable, logSale, logOrdersBatch, getDailySalesRate, predictDepletion };
