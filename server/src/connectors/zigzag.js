// 지그재그 커넥터 — GraphQL API 사용
// MVP 지원: 조회·송장·가격·재고 (취소·반품·교환·문의는 파트너센터 직접)
// 공식 문서: https://partner.zigzag.kr/developer (파트너 신청 후 접근)

const { withRetry } = require('../core/apiUtils');
const cred = require('../core/credentialStore');

const GRAPHQL_URL    = 'https://api.zigzag.kr/graphql';
const PARTNER_CENTER = 'https://partner.zigzag.kr';

// GraphQL 공통 호출 헬퍼
async function gql(query, variables = {}) {
  const API_KEY = cred.get('ZIGZAG_API_KEY');
  if (!API_KEY) throw new Error('지그재그 API Key가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');
  return withRetry(async () => {
    const res = await fetch(GRAPHQL_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`지그재그 API 오류 (${res.status}): ${detail}`);
    }
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(`지그재그 GraphQL 오류: ${json.errors.map((e) => e.message).join(', ')}`);
    }
    return json.data;
  });
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
async function query({ productId, value }) {
  const today     = new Date().toISOString().slice(0, 10);
  const startDate = value?.startDate || today;
  const endDate   = value?.endDate   || today;

  const data = await gql(`
    query GetOrders($filter: OrderFilter!) {
      orders(filter: $filter) {
        id
        status
        ordererName
        totalPrice
        orderedAt
        items {
          productName
          optionValue
          quantity
          price
        }
      }
    }
  `, {
    filter: { startDate, endDate },
  });

  const orders = (data?.orders || []).map((o) => ({
    orderId:    o.id,
    status:     o.status,
    buyerName:  o.ordererName,
    totalPrice: o.totalPrice,
    paidAt:     o.orderedAt,
    items:      o.items || [],
  }));

  return { count: orders.length, orders };
}

// ─── action: price (가격 수정) ───────────────────────────────────────────────
// 지그재그는 GraphQL mutation으로 가격 수정 가능 (CLAUDE.md: API 확인 전까지 링크 우회)
async function price({ productId, value }) {
  // TODO: 지그재그 파트너 API에서 가격 수정 mutation 확인 후 구현
  // mutation { updateProductPrice(productId: $id, price: $price) { success } }
  return {
    redirect: PARTNER_CENTER,
    message:  '지그재그 가격 수정은 파트너센터에서 직접 처리해 주세요.',
  };
}

// ─── action: stock (재고·품절 수정) ──────────────────────────────────────────
async function stock({ productId, value }) {
  // TODO: 지그재그 파트너 API에서 재고 수정 mutation 확인 후 구현
  return {
    redirect: PARTNER_CENTER,
    message:  '지그재그 재고 수정은 파트너센터에서 직접 처리해 주세요.',
  };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호가 없습니다.');
  if (!value?.courier)        throw new Error('택배사가 없습니다.');

  await gql(`
    mutation SendInvoice($orderId: ID!, $courier: String!, $trackingNumber: String!) {
      sendShipment(orderId: $orderId, courier: $courier, trackingNumber: $trackingNumber) {
        success
      }
    }
  `, {
    orderId:        String(orderId),
    courier:        value.courier,
    trackingNumber: String(value.trackingNumber),
  });

  return { orderId, trackingNumber: value.trackingNumber, courier: value.courier };
}

module.exports = { query, price, stock, invoice };
