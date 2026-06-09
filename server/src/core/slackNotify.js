// 슬랙 웹훅 알림 — CS 에스컬레이션 발생 시 담당자 채널로 전송
// 전송 실패해도 호출한 쪽(Supabase 저장 등)에 영향 없음

const ISSUE_LABEL = {
  bug:         '🐛 버그 신고',
  feature:     '💡 기능 제안',
  integration: '🔗 연동 문의',
  other:       '기타',
};

/**
 * 에스컬레이션 발생 시 슬랙 채널로 알림을 전송한다.
 * 실패 시 조용히 로그만 남기고 넘어간다.
 */
async function notifyEscalation({ issueType, userEmail, reason, messages, ticketId }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return; // 환경변수 미설정이면 조용히 스킵

  const typeLabel    = ISSUE_LABEL[issueType] ?? '기타';
  const userDisplay  = userEmail || '비로그인 유저';
  const now          = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const lastUserMsg  = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const dashboardUrl = process.env.ADMIN_DASHBOARD_URL || '(대시보드 URL 미설정)';

  const text = [
    '🚨 *PICKIT CS 에스컬레이션*',
    '',
    `유형: ${typeLabel}`,
    `유저: ${userDisplay}`,
    `이유: ${reason}`,
    `시각: ${now}`,
    `티켓 ID: ${ticketId ?? '(저장 실패)'}`,
    '',
    `마지막 메시지: "${lastUserMsg.slice(0, 200)}"`,
    '',
    `<${dashboardUrl}|대시보드에서 확인하기>`,
  ].join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    if (!res.ok) console.error('[slackNotify] 전송 실패:', res.status);
  } catch (err) {
    console.error('[slackNotify] 네트워크 오류:', err.message);
  }
}

module.exports = { notifyEscalation };
