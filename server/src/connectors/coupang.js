// 쿠팡 커넥터 — 조회·가격·재고·송장 전부 지원 (핵심 본진)
// 인증: HMAC-SHA256 서명 (OAuth 없음, Access Key + Secret Key 방식)
// 공식 문서: https://developers.coupangbiz.com/

const crypto = require('crypto');
const { withRetry } = require('../core/apiUtils');
const cred = require('../core/credentialStore');

const BASE_URL = 'https://api-gateway.coupang.com';

// ─── 인증 헬퍼 ──────────────────────────────────────────────────────────────
// 쿠팡 datetime 형식: YYMMDDTHHMMSSZ (2자리 연도)
function makeDateTime() {
  const now = new Date();
  const p   = (n) => String(n).padStart(2, '0');
  const yy  = String(now.getUTCFullYear()).slice(2);
  return `${yy}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

function generateAuth(method, path, query = '') {
  const secretKey = cred.get('COUPANG_SECRET_KEY');
  const accessKey = cred.get('COUPANG_ACCESS_KEY');
  const datetime  = makeDateTime();
  const message   = `${datetime}\n${method}\n${path}\n${query}`;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
    'Content-Type': 'application/json;charset=UTF-8',
  };
}

// 모든 쿠팡 API 호출의 단일 진입점 (retry 포함)
async function coupangFetch(method, path, query = '', body = null) {
  const vendorId  = cred.get('COUPANG_VENDOR_ID');
  const accessKey = cred.get('COUPANG_ACCESS_KEY');
  const secretKey = cred.get('COUPANG_SECRET_KEY');
  if (!vendorId || !accessKey || !secretKey) {
    throw new Error('쿠팡 API 키가 설정되지 않았습니다. 설정 > 채널 연결에서 입력해 주세요.');
  }
  return withRetry(async () => {
    const headers = generateAuth(method, path, query);
    const url     = `${BASE_URL}${path}${query ? '?' + query : ''}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`쿠팡 API 오류 (${res.status}): ${detail}`);
    }
    return res.json();
  });
}

// ─── 상품명 → 상품번호 변환 ─────────────────────────────────────────────────
// 쿠팡은 상품명 직접 검색 API가 없어서 승인 상품 목록을 가져와 클라이언트 필터링
async function resolveProductId(productId) {
  const str = String(productId).trim();
  if (/^\d+$/.test(str)) return { resolved: str };

  const path = `/v2/providers/openapi/apis/api/v4/vendors/${cred.get('COUPANG_VENDOR_ID')}/products`;
  const data = await coupangFetch('GET', path, 'status=APPROVED&maxPerPage=100');
  const products = data.data || [];

  const keywords = str.toLowerCase().split(/\s+/).filter(Boolean);
  const matched  = products.filter((p) => {
    const name = (p.sellerProductName || '').toLowerCase();
    return keywords.every((kw) => name.includes(kw));
  });

  if (matched.length === 0) {
    throw new Error(`"${str}"와 일치하는 쿠팡 상품을 찾지 못했습니다. 상품명을 다시 확인해 주세요.`);
  }
  if (matched.length === 1) return { resolved: String(matched[0].sellerProductId) };

  return {
    needsClarification: true,
    query: str,
    candidates: matched.slice(0, 10).map((p) => ({
      productId: String(p.sellerProductId),
      name:      p.sellerProductName,
      price:     p.salePrice,
    })),
  };
}

// ─── action: query (주문 조회) ───────────────────────────────────────────────
// 쿠팡 주문 날짜 형식: YYYYMMDDHHmm
async function query({ productId, value }) {
  const today     = new Date();
  const fmt       = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const startDate = value?.startDate ? value.startDate.replace(/-/g, '') : fmt(today);
  const endDate   = value?.endDate   ? value.endDate.replace(/-/g, '')   : fmt(today);

  const path = `/v2/providers/openapi/apis/api/v4/vendors/${cred.get('COUPANG_VENDOR_ID')}/ordersheets`;
  const qs   = `createdAtFrom=${startDate}0000&createdAtTo=${endDate}2359&status=INSTRUCT`;

  const data   = await coupangFetch('GET', path, qs);
  const orders = (data.data || []).map((o) => ({
    orderId:    o.orderId,
    status:     o.status,
    buyerName:  o.orderer?.name,
    totalPrice: o.totalPrice,
    paidAt:     o.paidAt,
    items: (o.orderItems || []).map((i) => ({
      productName: i.productName,
      optionValue: i.itemOption,
      quantity:    i.shippingCount,
      price:       i.salePrice,
    })),
  }));

  return { count: orders.length, orders };
}

// ─── action: price (가격 수정) ───────────────────────────────────────────────
// 쿠팡은 부분 수정 불가 → 전체 상품 데이터를 가져와서 가격만 바꿔 PUT
async function price({ productId, value }) {
  if (!productId)       throw new Error('가격 수정에는 상품 번호 또는 상품명이 필요합니다.');
  if (!value?.newPrice) throw new Error('newPrice가 없습니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  const path        = `/v2/providers/openapi/apis/api/v4/vendors/${cred.get('COUPANG_VENDOR_ID')}/products/${resolution.resolved}`;
  const productData = await coupangFetch('GET', path);
  const payload     = { ...productData.data };

  (payload.items || []).forEach((item) => { item.salePrice = Number(value.newPrice); });
  await coupangFetch('PUT', path, '', payload);

  return { productId: resolution.resolved, updatedPrice: value.newPrice };
}

// ─── action: stock (재고·품절 수정) ──────────────────────────────────────────
// 쿠팡 옵션 키워드 매칭 후 해당 item의 수량 수정
async function stock({ productId, value }) {
  if (!productId) throw new Error('재고 수정에는 상품 번호 또는 상품명이 필요합니다.');

  const resolution = await resolveProductId(productId);
  if (resolution.needsClarification) return resolution;

  const path        = `/v2/providers/openapi/apis/api/v4/vendors/${cred.get('COUPANG_VENDOR_ID')}/products/${resolution.resolved}`;
  const productData = await coupangFetch('GET', path);
  const payload     = { ...productData.data };

  const keywords = (value?.optionLabel || '').toLowerCase().split(/\s+/).filter(Boolean);
  let   matched  = 0;

  (payload.items || []).forEach((item) => {
    const label = (item.optionName || '').toLowerCase();
    // optionLabel 없으면 전체 적용, 있으면 키워드 매칭
    if (!keywords.length || keywords.every((kw) => label.includes(kw))) {
      item.maximumBuyCount = value?.soldOut ? 0 : Number(value.quantity);
      matched++;
    }
  });

  if (keywords.length && matched === 0) {
    const available = (payload.items || []).map((i) => i.optionName).join(', ');
    throw new Error(`"${value.optionLabel}"에 해당하는 옵션을 찾지 못했습니다.\n사용 가능한 옵션: ${available}`);
  }

  await coupangFetch('PUT', path, '', payload);
  return { productId: resolution.resolved, optionLabel: value?.optionLabel, soldOut: !!value?.soldOut, quantity: value?.soldOut ? 0 : value.quantity };
}

// ─── action: invoice (송장 전송) ─────────────────────────────────────────────
const COUPANG_COURIERS = {
  'CJ대한통운': 'CJ대한통운', CJ: 'CJ대한통운',
  한진: '한진택배', 한진택배: '한진택배',
  롯데: '롯데택배', 롯데택배: '롯데택배',
  로젠: '로젠택배', 로젠택배: '로젠택배',
  우체국: '우체국택배', 우체국택배: '우체국택배',
  경동: '경동택배', 경동택배: '경동택배',
};

async function invoice({ productId: orderId, value }) {
  if (!orderId)               throw new Error('송장 전송에는 주문번호가 필요합니다.');
  if (!value?.trackingNumber) throw new Error('운송장 번호가 없습니다.');
  if (!value?.courier)        throw new Error('택배사가 없습니다.');

  const path = `/v2/providers/openapi/apis/api/v4/vendors/${cred.get('COUPANG_VENDOR_ID')}/orders/${orderId}/invoices`;
  await coupangFetch('POST', path, '', {
    deliveryCompanyCode: COUPANG_COURIERS[value.courier] || value.courier,
    invoiceNumber:       String(value.trackingNumber),
  });

  return { orderId, trackingNumber: value.trackingNumber, courier: value.courier };
}

module.exports = { query, price, stock, invoice };
