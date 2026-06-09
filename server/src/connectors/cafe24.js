// 카페24 커넥터 — 조회·가격·재고·송장 전부 지원 (핵심 본진)
// 공식 문서: https://developers.cafe24.com/docs/api/admin/
//
// 호출 흐름: toolHandler → cafe24[action]() → cafe24Fetch() → 카페24 REST API
// 인증: Bearer 토큰 (OAuth 2.0, 2시간 만료) → 만료 임박 시 refreshCafe24Token()이 자동 갱신

const { refreshCafe24Token } = require('../api/oauthRoutes');
const cred = require('../core/credentialStore');

const API_VERSION = '2024-06-01'; // 카페24 API 버전 헤더 (필수)

// 한국어 택배사 이름 → 카페24 shipping_company_code 매핑
const COURIER_CODES = {
  'CJ대한통운': '0001', CJ: '0001',
  한진: '0002', 한진택배: '0002',
  롯데: '0005', 롯데택배: '0005',
  로젠: '0006', 로젠택배: '0006',
  우체국: '0011', 우체국택배: '0011',
  경동: '0015', 경동택배: '0015',
  드림: '0017', 드림택배: '0017',
};

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

async function getHeaders(mallId) {
  const token = await refreshCafe24Token(mallId);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Cafe24-Api-Version': API_VERSION,
  };
}

// 모든 카페24 API 호출이 이 함수를 거침 → 에러 처리 일원화
async function cafe24Fetch(path, options = {}, mallId = cred.get('CAFE24_MALL_ID')) {
  if (!mallId) throw new Error('카페24 Mall ID가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');

  const headers = await getHeaders(mallId);
  const url = `https://${mallId}.cafe24api.com/api/v2/admin${path}`;

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { detail = await res.text(); }
    throw new Error(`카페24 API 오류 (${res.status}): ${detail}`);
  }

  return res.json();
}

// ─── 상품명 → 상품번호 변환 헬퍼 ────────────────────────────────────────────
// productId가 순수 숫자이면 그대로 사용.
// 문자열(상품명)이면 카페24 상품 검색 API를 호출해 매칭.
//
// 반환:
//   { resolved: '123' }                              → 단일 매칭, 진행 가능
//   { needsClarification: true, query, candidates }  → 복수 매칭, 사용자 재확인 필요
async function resolveProductId(productId, mallId = cred.get('CAFE24_MALL_ID')) {
  const str = String(productId).trim();

  // 숫자(또는 "상품번호:옵션코드" 형식)이면 검색 생략
  if (/^\d+(:\S+)?$/.test(str)) return { resolved: str };

  // 상품명으로 부분 검색
  const params = new URLSearchParams({ product_name: str, limit: 50 });
  const data = await cafe24Fetch(`/products?${params}`, {}, mallId);
  const products = data.products || [];

  if (products.length === 0) {
    throw new Error(
      `"${str}"와 일치하는 상품을 찾지 못했습니다. 상품명을 다시 확인해 주세요.`
    );
  }

  if (products.length === 1) {
    return { resolved: String(products[0].product_no) };
  }

  // 복수 매칭 → Claude가 이 결과를 받아 사용자에게 선택지를 제시함
  return {
    needsClarification: true,
    query: str,
    candidates: products.slice(0, 10).map((p) => ({
      productId: String(p.product_no),
      name:      p.product_name,
      price:     p.price,
    })),
  };
}

// ─── 옵션 자동 매칭 헬퍼 ────────────────────────────────────────────────────
// "블랙 L" 같은 자연어 키워드로 카페24 variants_code를 찾아줌
async function findVariantByLabel(productNo, optionLabel, mallId = cred.get('CAFE24_MALL_ID')) {
  const data = await cafe24Fetch(`/products/${productNo}/variants`, {}, mallId);
  const variants = data.variants || [];

  const keywords = optionLabel.toLowerCase().split(/\s+/).filter(Boolean);

  const matched = variants.find((v) => {
    const optionStr = (v.options || [])
      .map((o) => String(o.option_value))
      .join(' ')
      .toLowerCase();
    return keywords.every((kw) => optionStr.includes(kw));
  });

  if (!matched) {
    const available = variants
      .map((v) => (v.options || []).map((o) => o.option_value).join(' / '))
      .join(', ');
    throw new Error(
      `"${optionLabel}"에 해당하는 옵션을 찾지 못했습니다.\n사용 가능한 옵션: ${available}`
    );
  }

  return matched.variants_code;
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
// value?: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', status: 'N00' }
// 기간 미지정 시 오늘만 조회 (규칙③: 서버 보호용 기본값 필터)
async function query({ productId, value }) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = value?.startDate || today;
  const endDate   = value?.endDate   || today;

  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (value?.status) params.set('order_status', value.status);

  const data = await cafe24Fetch(`/orders?${params}`);

  const orders = (data.orders || []).map((o) => ({
    orderId:    o.order_id,
    status:     o.order_status,
    buyerName:  o.buyer_name,
    totalPrice: o.payment_amount,
    paidAt:     o.paid_date,
    items: (o.items || []).map((i) => ({
      productName: i.product_name,
      optionValue: i.option_value,
      quantity:    i.quantity,
      price:       i.product_price,
    })),
  }));

  return { count: orders.length, orders };
}

// ─── action: price (가격 수정) ───────────────────────────────────────────────
// productId: 상품 번호 또는 상품명 (부분 일치 검색 지원)
// value: { newPrice: number, currentPrice: number }
async function price({ productId, value }) {
  if (!productId) throw new Error('가격 수정에는 상품 번호 또는 상품명이 필요합니다.');
  if (!value?.newPrice) throw new Error('newPrice가 없습니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  const data = await cafe24Fetch(`/products/${resolution.resolved}`, {
    method: 'PUT',
    body: JSON.stringify({
      shop_no: 1,
      product: { price: String(value.newPrice) },
    }),
  });

  return {
    productId:     resolution.resolved,
    previousPrice: value.currentPrice,
    updatedPrice:  data.product?.price,
  };
}

// ─── action: stock (재고·품절 수정) ──────────────────────────────────────────
// productId: 상품 번호 또는 상품명 (부분 일치 검색 지원)
// value: { quantity: number, optionLabel: string } 또는 { soldOut: true, optionLabel: string }
//   optionLabel 예시: "블랙 L", "화이트 XL"
async function stock({ productId, value }) {
  if (!productId) throw new Error('재고 수정에는 상품 번호 또는 상품명이 필요합니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  const [productNo, explicitCode] = resolution.resolved.split(':');

  let variantCode = explicitCode;
  if (!variantCode) {
    if (!value?.optionLabel) {
      throw new Error('옵션을 알 수 없습니다. 예: "블랙 L 재고 0으로 해줘"처럼 색상과 사이즈를 함께 말씀해 주세요.');
    }
    variantCode = await findVariantByLabel(productNo, value.optionLabel);
  }

  const body = value?.soldOut
    ? { variant: { display_soldout: 'T', quantity: 0 } }
    : { variant: { quantity: Number(value.quantity) } };

  await cafe24Fetch(`/products/${productNo}/variants/${variantCode}`, {
    method: 'PUT',
    body: JSON.stringify({ shop_no: 1, ...body }),
  });

  return {
    productNo,
    variantCode,
    optionLabel: value?.optionLabel,
    soldOut:     !!value?.soldOut,
    quantity:    value?.soldOut ? 0 : value.quantity,
  };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
// productId: 카페24 주문번호 (예: "20240601-0000001") — 주문번호는 검색 불필요
// value: { trackingNumber: string, courier: string }
async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호(orderId)가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호(trackingNumber)가 없습니다.');
  if (!value?.courier)        throw new Error('택배사(courier)가 없습니다.');

  const courierCode = COURIER_CODES[value.courier] ?? value.courier;

  await cafe24Fetch(`/orders/${orderId}/shipments`, {
    method: 'POST',
    body: JSON.stringify({
      request: [{
        order_id:              orderId,
        tracking_no:           String(value.trackingNumber),
        shipping_company_code: courierCode,
      }],
    }),
  });

  return {
    orderId,
    trackingNumber: value.trackingNumber,
    courier:        value.courier,
    courierCode,
  };
}

// ─── getStock (재고 조회) ─────────────────────────────────────────────────────
// FR-009 자동 동기화용: 현재 채널 재고를 읽어 다른 채널 push 값으로 사용
async function getStock({ productId, optionLabel }) {
  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return [];

  const [productNo] = resolution.resolved.split(':');
  const data        = await cafe24Fetch(`/products/${productNo}/variants`);
  const variants    = data.variants || [];
  const keywords    = (optionLabel || '').toLowerCase().split(/\s+/).filter(Boolean);

  return variants
    .filter((v) => {
      if (!keywords.length) return true;
      const label = (v.options || []).map((o) => String(o.option_value)).join(' ').toLowerCase();
      return keywords.every((kw) => label.includes(kw));
    })
    .map((v) => ({
      optionLabel: (v.options || []).map((o) => o.option_value).join(' / ') || '전체',
      quantity:    v.quantity ?? 0,
    }));
}

module.exports = { query, price, stock, invoice, getStock };
