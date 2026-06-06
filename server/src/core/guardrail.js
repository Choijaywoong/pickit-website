// 방화벽: AI가 만든 수정 값이 실제 API로 나가기 직전 반드시 통과해야 하는 안전장치
// isDangerous: true 반환 시 → 실행 Hold → 채팅창에 [최종 승인] / [취소] 버튼 렌더

const BULK_KEYWORDS = ['전체', '모두', '싹다', '싹 다', '일괄'];
const MAX_TARGETS = 5;
const PRICE_CHANGE_LIMIT = 0.2; // ±20%
const MIN_CONFIDENCE = 85;

// 의류 버티컬 3사는 수정 미지원 (MVP)
const WRITE_UNSUPPORTED_PLATFORMS = ['musinsa', 'ably', 'zigzag'];
const PARTNER_CENTER_LINKS = {
  musinsa: 'https://partners.musinsa.com',
  ably: 'https://sellers.a-bly.com',
  zigzag: 'https://partner.zigzag.kr',
};

/**
 * @param {Object} params
 * @param {string} params.action        - 'price' | 'stock' | 'invoice' | 'query'
 * @param {string} params.platform      - 'coupang' | 'naver' | 'cafe24' | 'musinsa' | 'ably' | 'zigzag'
 * @param {number} [params.newPrice]    - 수정할 가격 (action='price'일 때)
 * @param {number} [params.currentPrice] - 현재 가격 (방화벽 비교용)
 * @param {number} [params.targetCount] - 수정 대상 상품 수
 * @param {string} [params.rawQuery]    - 원본 자연어 명령 (범위 키워드 감지용)
 * @param {number} [params.confidence]  - LLM 의도 파싱 확신도 (0~100)
 * @returns {{ isDangerous: boolean, reason: string, type: string, link?: string }}
 */
function checkSafetyGuardrail({ action, platform, newPrice, currentPrice, targetCount, rawQuery, confidence }) {
  // ① 플랫폼 불일치 방화벽: 미지원 채널에 수정 요청
  if (action !== 'query' && WRITE_UNSUPPORTED_PLATFORMS.includes(platform)) {
    return {
      isDangerous: true,
      type: 'platform_mismatch',
      reason: `현재 ${platform}은(는) 직접 수정을 지원하지 않습니다. 아래 링크에서 직접 처리해 주세요.`,
      link: PARTNER_CENTER_LINKS[platform],
    };
  }

  // ② 금액 방화벽: ±20% 초과 or 0원 이하
  if (action === 'price' && currentPrice != null && newPrice != null) {
    const changeRatio = Math.abs(newPrice - currentPrice) / currentPrice;
    if (newPrice <= 0 || changeRatio > PRICE_CHANGE_LIMIT) {
      return {
        isDangerous: true,
        type: 'price',
        reason: `가격 변경 폭이 기존가 대비 ${Math.round(changeRatio * 100)}%입니다. (허용 범위: ±20%) 정말 진행하시겠습니까?`,
      };
    }
  }

  // ③ 범위 방화벽: 대상 5개 이상 or 일괄 키워드
  if (targetCount != null && targetCount >= MAX_TARGETS) {
    return {
      isDangerous: true,
      type: 'scope',
      reason: `수정 대상이 ${targetCount}개입니다. 5개 이상 일괄 수정은 승인 후 진행됩니다.`,
    };
  }
  if (rawQuery && BULK_KEYWORDS.some((kw) => rawQuery.includes(kw))) {
    return {
      isDangerous: true,
      type: 'scope',
      reason: `'${rawQuery}'에 일괄 수정 키워드가 포함되어 있습니다. 범위를 확인 후 승인해 주세요.`,
    };
  }

  // ④ 맥락 이해 방화벽: 확신도 85% 미만
  if (confidence != null && confidence < MIN_CONFIDENCE) {
    return {
      isDangerous: true,
      type: 'confidence',
      reason: `명령 의도가 명확하지 않습니다 (확신도: ${confidence}%). 어떤 상품을 어떻게 바꾸실지 조금 더 구체적으로 말씀해 주세요.`,
    };
  }

  return { isDangerous: false };
}

module.exports = { checkSafetyGuardrail, PARTNER_CENTER_LINKS };
