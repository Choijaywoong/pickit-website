// sales_log: 상품별 집계 판매량 시계열 테이블
// 개인정보 없음. 발주 예측(FR-006)의 데이터 원천.
// MVP 배포 즉시 적재 시작 필수 — 늦으면 예측 기능 영구 불가
// pg 직접 연결 대신 supabase service client 사용 (Vercel 서버리스 호환)

const { createClient } = require('@supabase/supabase-js');

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// 주문 처리 완료 시 적재 (order_id 기준 중복 무시)
async function logSale({ platform, productId, orderId, optionId, optionLabel, quantity, saleDate }) {
  const supabase = getClient();
  const { error } = await supabase
    .from('sales_log')
    .upsert(
      {
        platform,
        product_id:   productId,
        order_id:     orderId || null,
        option_id:    optionId   || null,
        option_label: optionLabel || null,
        quantity:     quantity || 1,
        sale_date:    saleDate,
      },
      { onConflict: 'platform,order_id', ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

// 쿼리 결과의 주문 목록을 일괄 적재 (query 액션 후 자동 호출)
async function logOrdersBatch(platform, orders = []) {
  for (const order of orders) {
    for (const item of order.items || []) {
      await logSale({
        platform,
        productId:   item.productName || item.productId || 'unknown',
        orderId:     order.orderId,
        optionLabel: item.optionValue,
        quantity:    item.quantity || 1,
        saleDate:    order.paidAt ? order.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      }).catch(() => {}); // 개별 실패는 무시 (적재 실패가 조회 응답을 막으면 안 됨)
    }
  }
}

// 발주 예측용: 최근 N일 판매 속도 (PostgreSQL RPC 함수 호출)
async function getDailySalesRate({ platform, productId, days = 120 }) {
  const supabase = getClient();
  const { data, error } = await supabase
    .rpc('get_daily_sales_rate', {
      p_platform:   platform,
      p_product_id: productId,
      p_days:       days,
    });
  if (error) throw new Error(error.message);
  return data || [];
}

// DB 연결 + 테이블 존재 여부 확인 (헬스체크용)
async function checkDbHealth() {
  const supabase = getClient();
  const { count, error } = await supabase
    .from('sales_log')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return { connected: true, totalRows: count ?? 0 };
}

module.exports = { logSale, logOrdersBatch, getDailySalesRate, checkDbHealth };
