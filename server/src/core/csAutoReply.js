// CS 1차 자동 답변 엔진 — Claude가 에스컬레이션 여부를 판단하고, 실패 시에도 에스컬레이션으로 안전 처리
const Anthropic = require('@anthropic-ai/sdk');
const cred      = require('./credentialStore');

const CS_SYSTEM_PROMPT = `You are a customer support agent for PICKIT, a Korean multi-channel e-commerce operations service.
PICKIT helps clothing sellers manage orders, inventory, and shipping across 6 platforms:
Coupang, Naver Smart Store, Cafe24, Musinsa, Ably, Zigzag — all via natural language chat commands.

Key features:
- Unified order lookup across all channels
- Bulk out-of-stock and price updates
- Bulk invoice (tracking number) submission
- Inventory auto-sync
- Order prediction alerts (for sellers with inventory)

Answer in Korean. Be concise and friendly.
If you cannot resolve the issue or it requires human intervention (account issues, billing, bugs requiring investigation), respond with exactly this JSON:
{"escalate": true, "reason": "한 줄 이유"}

Otherwise respond with plain text answer only.`;

/**
 * CS 메시지에 대해 AI 1차 답변을 생성한다.
 * @returns {{ reply: string } | { escalate: true, reason: string }}
 */
async function csAutoReply({ message, history = [], issueType = null }) {
  const apiKey = cred.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // API 키 없으면 바로 에스컬레이션
    return { escalate: true, reason: 'AI 미설정 — 수동 처리 필요' };
  }

  const client = new Anthropic({ apiKey });

  // history는 [{role, content}] 형태로 이미 전달됨 (cs 역할은 assistant로 변환)
  const messages = [
    ...history
      .filter(m => m.role === 'user' || m.role === 'cs')
      .map(m => ({
        role:    m.role === 'cs' ? 'assistant' : 'user',
        content: m.content,
      })),
    { role: 'user', content: message },
  ];

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     CS_SYSTEM_PROMPT,
      messages,
    });

    const text = response.content.find(b => b.type === 'text')?.text?.trim() ?? '';

    // JSON 에스컬레이션 판단: {"escalate": true, "reason": "..."} 파싱 시도
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.escalate === true) {
          return { escalate: true, reason: parsed.reason ?? '담당자 확인 필요' };
        }
      } catch {
        // JSON 파싱 실패 → 일반 텍스트로 처리
      }
    }

    return { reply: text || '죄송합니다, 답변을 생성하지 못했습니다.' };
  } catch (err) {
    console.error('[csAutoReply] Claude API 오류:', err.message);
    // API 호출 실패 → 자동 에스컬레이션 (Claude 없어도 CS 수집은 되어야 함)
    return { escalate: true, reason: 'AI 응답 오류 — 수동 처리 필요' };
  }
}

module.exports = { csAutoReply };
