// 에이블리 커넥터 — 조회·송장만 지원 (MVP), 수정은 셀러스 센터 링크 우회
// 주의: '셀러스(Sellers)' 입점 타입만 API 연동 가능 (온보딩 시 필수 안내)
// 주의: 연동 이전 주문 소급 조회 불가
// 공식 문서: https://developers.a-bly.com (셀러스 파트너만 접근 가능)

const { withRetry } = require('../core/apiUtils');
const cred = require('../core/credentialStore');

const BASE_URL       = 'https://api.a-bly.com';
const PARTNER_CENTER = 'https://sellers.a-bly.com';

async function ablyFetch(method, path, query = '', body = null) {
  const API_KEY = cred.get('ABLY_API_KEY');
  if (!API_KEY) throw new Error('에이블리 API Key가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');
  return withRetry(async () => {
    const url = `${BASE_URL}${path}${query ? '?' + query : ''}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`에이블리 API 오류 (${res.status}): ${detail}`);
    }
    return res.json();
  });
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
async function query({ productId, value }) {
  const today     = new Date().toISOString().slice(0, 10);
  const startDate = value?.startDate || today;
  const endDate   = value?.endDate   || today;

  // 에이블리 주문 조회 엔드포인트 (셀러스 API 문서 기준)
  const data   = await ablyFetch('GET', '/v1/orders', `startDate=${startDate}&endDate=${endDate}`);
  const orders = (data.orders || data.items || []).map((o) => ({
    orderId:    o.orderId || o.id,
    status:     o.status || o.orderStatus,
    buyerName:  o.buyerName || o.ordererName,
    totalPrice: o.totalPrice || o.paymentAmount,
    paidAt:     o.paidAt || o.orderedAt,
    items: (o.orderItems || o.products || []).map((i) => ({
      productName: i.productName || i.name,
      optionValue: i.optionValue || i.option,
      quantity:    i.quantity    || i.count,
      price:       i.price       || i.salePrice,
    })),
  }));

  return { count: orders.length, orders };
}

async function price() {
  return { redirect: PARTNER_CENTER, message: '에이블리 가격 수정은 셀러스 센터에서 직접 처리해 주세요.' };
}
async function stock() {
  return { redirect: PARTNER_CENTER, message: '에이블리 재고 수정은 셀러스 센터에서 직접 처리해 주세요.' };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호가 없습니다.');
  if (!value?.courier)        throw new Error('택배사가 없습니다.');

  await ablyFetch('POST', `/v1/orders/${orderId}/shipment`, '', {
    courierName:   value.courier,
    trackingNumber: String(value.trackingNumber),
  });

  return { orderId, trackingNumber: value.trackingNumber, courier: value.courier };
}

module.exports = { query, price, stock, invoice };
