// 무신사 커넥터 — 조회·송장만 지원 (MVP), 수정은 파트너센터 링크 우회
// 인증: API Key (발급일로부터 1년 만료 — 갱신 알림 필요, FR-008)
// 공식 문서: https://developers.musinsa.com (파트너 신청 후 접근 가능)

const { withRetry } = require('../core/apiUtils');
const cred = require('../core/credentialStore');

const BASE_URL      = 'https://api.musinsa.com';
const PARTNER_CENTER = 'https://partners.musinsa.com';

async function musinsaFetch(method, path, query = '', body = null) {
  const API_KEY = cred.get('MUSINSA_API_KEY');
  if (!API_KEY) throw new Error('무신사 API Key가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');
  return withRetry(async () => {
    const url = `${BASE_URL}${path}${query ? '?' + query : ''}`;
    const options = {
      method,
      headers: {
        'x-api-key':    API_KEY,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
      // API Key 만료 감지 (401/403)
      if (res.status === 401 || res.status === 403) {
        throw new Error(`무신사 API Key가 만료되었거나 유효하지 않습니다. ${PARTNER_CENTER} 에서 갱신해 주세요.`);
      }
      const detail = await res.text().catch(() => '');
      throw new Error(`무신사 API 오류 (${res.status}): ${detail}`);
    }
    return res.json();
  });
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
async function query({ productId, value }) {
  const today     = new Date().toISOString().slice(0, 10);
  const startDate = value?.startDate || today;
  const endDate   = value?.endDate   || today;

  // 무신사 주문 조회 엔드포인트 (파트너 문서 기준, 실제 경로 확인 필요)
  const data   = await musinsaFetch('GET', '/v1/orders', `startDate=${startDate}&endDate=${endDate}`);
  const orders = (data.orders || data.content || []).map((o) => ({
    orderId:    o.orderId || o.id,
    status:     o.orderStatus || o.status,
    buyerName:  o.buyerName || o.orderer,
    totalPrice: o.totalPrice || o.paymentAmount,
    paidAt:     o.paidAt || o.paymentDate,
    items: (o.orderItems || o.items || []).map((i) => ({
      productName: i.productName || i.name,
      optionValue: i.optionValue || i.option,
      quantity:    i.quantity,
      price:       i.price || i.unitPrice,
    })),
  }));

  return { count: orders.length, orders };
}

// 무신사 수정은 MVP에서 파트너센터 링크 우회 (방화벽 platform_mismatch에서 먼저 차단됨)
async function price() {
  return { redirect: PARTNER_CENTER, message: '무신사 가격 수정은 파트너센터에서 직접 처리해 주세요.' };
}
async function stock() {
  return { redirect: PARTNER_CENTER, message: '무신사 재고 수정은 파트너센터에서 직접 처리해 주세요.' };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호가 없습니다.');
  if (!value?.courier)        throw new Error('택배사가 없습니다.');

  // 무신사 송장 전송 엔드포인트 (파트너 문서 기준)
  await musinsaFetch('POST', `/v1/orders/${orderId}/delivery`, '', {
    courierName:    value.courier,
    invoiceNumber:  String(value.trackingNumber),
  });

  return { orderId, trackingNumber: value.trackingNumber, courier: value.courier };
}

module.exports = { query, price, stock, invoice };
