// FR-009: 재고 자동 동기화 — 한 채널 판매 발생 시 다른 채널 재고 차감
// 방식: PICKIT → 각 채널로 재고를 밀어주는 단방향(Push) 동기화
// 지원: 쿠팡·네이버·카페24 (핵심 본진, write API 확인 완료)
// 보류: 무신사·에이블리·지그재그 (write API 확인 중)

const connectors = require('../connectors');

const SYNC_SUPPORTED = ['coupang', 'naver', 'cafe24'];

/**
 * 특정 채널에서 판매된 상품의 재고를 다른 채널에 동기화
 * @param {object} params
 * @param {string} params.sourcePlatform - 판매가 발생한 채널
 * @param {string} params.productId      - 상품명 또는 번호
 * @param {string} params.optionLabel    - 옵션 (예: "블랙 L")
 * @param {number} params.newQuantity    - 동기화할 재고 수량
 * @param {string[]} params.targetPlatforms - 동기화 대상 채널 목록 (미지정 시 핵심 본진 전체)
 */
async function syncStock({ sourcePlatform, productId, optionLabel, newQuantity, targetPlatforms }) {
  const targets = (targetPlatforms || SYNC_SUPPORTED).filter(
    (p) => p !== sourcePlatform && SYNC_SUPPORTED.includes(p)
  );

  const results = await Promise.allSettled(
    targets.map((platform) =>
      connectors[platform].stock({
        productId,
        value: { quantity: newQuantity, optionLabel },
      }).then((res) => ({ platform, success: true, result: res }))
    )
  );

  return results.map((r, i) => ({
    platform: targets[i],
    success:  r.status === 'fulfilled',
    result:   r.status === 'fulfilled' ? r.value.result : undefined,
    error:    r.status === 'rejected'  ? r.reason?.message : undefined,
  }));
}

module.exports = { syncStock, SYNC_SUPPORTED };
