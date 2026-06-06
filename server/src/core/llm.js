// LLM 오케스트레이터: Anthropic Claude ↔ 방화벽 ↔ 커넥터를 연결하는 핵심 모듈
// 어댑터 규칙(규칙①): AI에게는 modify_product_data 하나만 노출
// 방화벽 규칙(규칙②): held 반환 시 API 호출 없이 프론트로 보류 상태 반환

const Anthropic = require('@anthropic-ai/sdk');
const { handleToolCall, TOOL_DEFINITION } = require('./toolHandler');
const cred = require('./credentialStore');

const SYSTEM_PROMPT = `당신은 PICKIT의 멀티채널 운영 어시스턴트입니다.
의류 셀러가 한국어로 말하면, 6개 쇼핑몰 채널의 주문·재고·가격·송장을 처리해 드립니다.

## 지원 채널
- 쿠팡(coupang), 네이버 스마트스토어(naver), 카페24(cafe24): 조회·수정·송장 전부 가능
- 무신사(musinsa), 에이블리(ably), 지그재그(zigzag): 조회·송장만 가능 (수정 불가)

## 도구 사용 규칙
- 사용자 요청을 파악해 modify_product_data 함수를 호출하세요.
- platform: 채널명 영문 소문자 (coupang, naver, cafe24, musinsa, ably, zigzag)
- action: query(조회), price(가격수정), stock(재고·품절), invoice(송장전송)
- confidence: 의도 파싱 확신도 0~100. 정보가 부족하면 85 미만으로 설정하세요.
- targetCount: 수정 대상 상품 수 (명시되지 않으면 1)
- rawQuery: 사용자 원본 메시지 그대로
- "전체", "모두", "싹 다", "일괄" 키워드가 있으면 targetCount를 5 이상으로 설정해 방화벽이 검토하게 하세요.
- 기간 언급 없는 조회는 당일(오늘) 데이터만 요청합니다.

## 응답 스타일
- 짧고 명확하게 한국어로 답합니다.
- 처리 결과는 숫자와 채널명을 포함해 구체적으로 알려줍니다.
- 모르는 것은 모른다고 하고, 셀러에게 확인을 요청합니다.`;

/**
 * 사용자 메시지를 Claude에 전달하고 결과를 반환한다.
 * @param {string} userMessage - 셀러가 입력한 메시지
 * @param {Array}  conversationHistory - 이전 대화 내역 (멀티턴 지원용)
 * @param {Array}  activeChannels - 사이드바에서 켜진 채널 목록 (비어 있으면 전체)
 */
async function chat(userMessage, conversationHistory = [], activeChannels = []) {
  const apiKey = cred.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return {
      reply: '⚙️ Anthropic API Key가 설정되지 않았습니다.\n\n왼쪽 사이드바 하단의 **설정(⚙)** 버튼을 눌러 API Key를 입력해 주세요.\n\nconsole.anthropic.com에서 발급받을 수 있습니다.',
    };
  }
  const client = new Anthropic({ apiKey });

  // 활성 채널에 따라 시스템 프롬프트를 동적으로 조합
  let systemPrompt = SYSTEM_PROMPT;
  if (activeChannels.length > 0) {
    systemPrompt +=
      `\n\n## 현재 활성화된 채널 (반드시 이 채널들만 처리할 것)\n` +
      `사용자가 사이드바에서 켠 채널: **${activeChannels.join(', ')}**\n` +
      `- 위 채널에 대한 요청만 modify_product_data로 실행하세요.\n` +
      `- 비활성 채널(목록에 없는 채널)에 대한 요청은 실행하지 말고 ` +
      `"[채널명]은 현재 꺼져 있어 처리하지 않았습니다."라고 명확히 알려주세요.\n` +
      `- "전체 채널" 또는 "모든 채널" 요청도 위 활성 채널만 대상으로 처리합니다.`;
  }

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 루프 중 발생한 excel/connectionError 를 누적 (end_turn 시 최종 응답에 포함)
  let pendingExcel       = null; // { excelData, filename }
  let connectionErrors   = [];   // [{ platform, message, link }, ...]

  // 수동 에이전틱 루프: 방화벽 보류 시 승인 게이트를 위해 직접 제어
  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      tools: [TOOL_DEFINITION],
      messages,
    });

    // Claude가 최종 답변을 텍스트로 전달
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      const reply     = textBlock?.text || '처리가 완료되었습니다.';
      return {
        reply,
        ...(pendingExcel    && { excelData: pendingExcel.excelData, filename: pendingExcel.filename }),
        ...(connectionErrors.length && { connectionErrors }),
      };
    }

    // Claude가 도구 호출을 요청
    if (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const result = await handleToolCall(toolUseBlock.input);

      // 방화벽 보류 → 프론트로 즉시 반환 (API 호출 금지)
      if (result.held) {
        return { held: true, reason: result.reason, type: result.type, link: result.link, toolInput: toolUseBlock.input };
      }

      // FR-005: 엑셀 데이터 캡처
      if (result.excelData) {
        pendingExcel = { excelData: result.excelData, filename: result.filename };
      }

      // FR-008: 연동 끊김 에러 누적
      if (result.connectionError) {
        connectionErrors.push({ platform: result.platform, message: result.message, link: result.link });
      }

      // 도구 실행 결과를 Claude에 다시 전달 → 루프 계속
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: JSON.stringify(result) }],
      });
    }
  }
}

module.exports = { chat };
