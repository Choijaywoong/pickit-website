// 네이버 스마트스토어 커넥터 — 조회·가격·재고·송장 전부 지원 (핵심 본진)
// 인증: Client Credentials (셀러 로그인 불필요, 서버끼리 자동 토큰 발급)
// 공식 문서: https://apicenter.commerce.naver.com/ko/basic/commerce-api

const crypto = require('crypto');
const { withRetry } = require('../core/apiUtils');
const cred = require('../core/credentialStore');

const BASE_URL = 'https://api.commerce.naver.com';

// 토큰 인메모리 캐시 (카페24와 달리 사용자 OAuth 없이 서버 자격증명만 사용)
let cachedToken = null; // { accessToken, expiresAt }

// ─── 토큰 발급 / 자동 갱신 ──────────────────────────────────────────────────
// 네이버 Commerce API 인증:
//   1. timestamp = 현재 Unix ms
//   2. signature = Base64(HMAC-SHA256(client_secret, client_id + "_" + timestamp))
//   3. POST /external/v1/oauth2/token → access_token 획득
async function getNaverToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId     = cred.get('NAVER_CLIENT_ID');
  const clientSecret = cred.get('NAVER_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('네이버 API 키가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');
  }

  const timestamp = Date.now();
  const password  = crypto
    .createHmac('sha256', clientSecret)
    .update(`${clientId}_${timestamp}`)
    .digest('base64');

  const res = await fetch(`${BASE_URL}/external/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:          clientId,
      timestamp:          String(timestamp),
      client_secret_sign: password,
      grant_type:         'client_credentials',
      type:               'SELF',
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`네이버 토큰 발급 실패 (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

// 모든 네이버 API 호출의 단일 진입점 (retry 포함)
async function naverFetch(method, path, query = '', body = null) {
  return withRetry(async () => {
    const token = await getNaverToken();
    const url   = `${BASE_URL}${path}${query ? '?' + query : ''}`;
    const options = {
      method,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (!res.ok) {
      // 401이면 토큰 만료 → 캐시 비우고 재시도 유도
      if (res.status === 401) { cachedToken = null; }
      const detail = await res.text().catch(() => '');
      throw new Error(`네이버 API 오류 (${res.status}): ${detail}`);
    }
    return res.json();
  });
}

// ─── 상품명 → 상품번호 변환 ─────────────────────────────────────────────────
async function resolveProductId(productId) {
  const str = String(productId).trim();
  if (/^\d+$/.test(str)) return { resolved: str };

  const data     = await naverFetch('GET', '/external/v1/products/search', `query=${encodeURIComponent(str)}&size=50`);
  const products = data.simpleProducts || [];

  const keywords = str.toLowerCase().split(/\s+/).filter(Boolean);
  const matched  = products.filter((p) => {
    const name = (p.name || '').toLowerCase();
    return keywords.every((kw) => name.includes(kw));
  });

  if (matched.length === 0) {
    throw new Error(`"${str}"와 일치하는 네이버 상품을 찾지 못했습니다. 상품명을 다시 확인해 주세요.`);
  }
  if (matched.length === 1) return { resolved: String(matched[0].id) };

  return {
    needsClarification: true,
    query: str,
    candidates: matched.slice(0, 10).map((p) => ({
      productId: String(p.id),
      name:      p.name,
      price:     p.salePrice,
    })),
  };
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
async function query({ productId, value }) {
  const today     = new Date().toISOString().slice(0, 10);
  const startDate = (value?.startDate || today) + 'T00:00:00.000Z';
  const endDate   = (value?.endDate   || today) + 'T23:59:59.999Z';

  const data   = await naverFetch('GET', '/external/v1/pay-order/seller/orders/query',
    `orderDateFrom=${encodeURIComponent(startDate)}&orderDateTo=${encodeURIComponent(endDate)}`);
  const orders = (data.data?.contents || []).map((o) => ({
    orderId:    o.orderId,
    status:     o.paymentDate ? '결제완료' : '미결제',
    buyerName:  o.ordererName,
    totalPrice: o.totalPayAmount,
    paidAt:     o.paymentDate,
    items: (o.productOrderList || []).map((i) => ({
      productName: i.productName,
      optionValue: i.optionContent,
      quantity:    i.quantity,
      price:       i.unitPrice,
    })),
  }));

  return { count: orders.length, orders };
}

// ─── action: price (가격 수정) ───────────────────────────────────────────────
async function price({ productId, value }) {
  if (!productId)       throw new Error('가격 수정에는 상품 번호 또는 상품명이 필요합니다.');
  if (!value?.newPrice) throw new Error('newPrice가 없습니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  // 현재 상품 정보 조회 후 가격만 수정
  const productData = await naverFetch('GET', `/external/v1/products/${resolution.resolved}`);
  const payload = {
    ...productData,
    salePrice: Number(value.newPrice),
  };
  await naverFetch('PUT', `/external/v1/products/${resolution.resolved}`, '', payload);

  return { productId: resolution.resolved, updatedPrice: value.newPrice };
}

// ─── action: stock (재고·품절 수정) ──────────────────────────────────────────
async function stock({ productId, value }) {
  if (!productId) throw new Error('재고 수정에는 상품 번호 또는 상품명이 필요합니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  // 옵션(variant) 목록 조회 후 키워드 매칭
  const productData = await naverFetch('GET', `/external/v1/products/${resolution.resolved}`);
  const options     = productData.detailAttribute?.optionInfo?.optionCombinations || [];
  const keywords    = (value?.optionLabel || '').toLowerCase().split(/\s+/).filter(Boolean);

  let matched = 0;
  options.forEach((opt) => {
    const label = [opt.optionName1, opt.optionName2].filter(Boolean).join(' ').toLowerCase();
    if (!keywords.length || keywords.every((kw) => label.includes(kw))) {
      opt.stockQuantity = value?.soldOut ? 0 : Number(value.quantity);
      matched++;
    }
  });

  if (keywords.length && matched === 0) {
    const available = options.map((o) => [o.optionName1, o.optionName2].filter(Boolean).join('/')).join(', ');
    throw new Error(`"${value.optionLabel}"에 해당하는 옵션을 찾지 못했습니다.\n사용 가능한 옵션: ${available}`);
  }

  await naverFetch('PUT', `/external/v1/products/${resolution.resolved}`, '', productData);
  return { productId: resolution.resolved, optionLabel: value?.optionLabel, soldOut: !!value?.soldOut, quantity: value?.soldOut ? 0 : value.quantity };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
const NAVER_COURIERS = {
  'CJ대한통운': 'CJ_LOGISTICS', CJ: 'CJ_LOGISTICS',
  한진: 'HANJIN', 한진택배: 'HANJIN',
  롯데: 'LOTTE', 롯데택배: 'LOTTE',
  로젠: 'LOGEN', 로젠택배: 'LOGEN',
  우체국: 'EPOST', 우체국택배: 'EPOST',
  경동: 'KDEXP', 경동택배: 'KDEXP',
};

async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호가 없습니다.');
  if (!value?.courier)        throw new Error('택배사가 없습니다.');

  await naverFetch('POST', `/external/v1/pay-order/seller/orders/${orderId}/shipping`, '', {
    deliveryCompany:   NAVER_COURIERS[value.courier] || value.courier,
    trackingNumber:    String(value.trackingNumber),
    dispatchDate:      new Date().toISOString().slice(0, 10).replace(/-/g, ''),
  });

  return { orderId, trackingNumber: value.trackingNumber, courier: value.courier };
}

module.exports = { query, price, stock, invoice };
