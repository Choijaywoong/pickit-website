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
  console.log('[slackNotify] URL 존재:', !!webhookUrl, '/ URL 앞 20자:', webhookUrl?.slice(0, 20));
  if (!webhookUrl) {
    console.error('[slackNotify] SLACK_WEBHOOK_URL 환경변수 없음 — 스킵');
    return;
  }

  const typeLabel   = ISSUE_LABEL[issueType] ?? '기타';
  const userDisplay = userEmail || '비로그인 유저';
  const now         = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';

  const lines = [
    '🚨 *PICKIT CS 에스컬레이션*',
    '',
    `*유형:* ${typeLabel}`,
    `*유저:* ${userDisplay}`,
    `*이유:* ${reason}`,
    `*시각:* ${now}`,
    `*티켓 ID:* ${ticketId ?? '(저장 실패)'}`,
    '',
    `*마지막 메시지:* "${lastUserMsg.slice(0, 200)}"`,
  ];

  const dashboardUrl = process.env.ADMIN_DASHBOARD_URL;
  if (dashboardUrl) lines.push('', `<${dashboardUrl}|대시보드에서 확인하기>`);

  const text = lines.join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const body = await res.text();
    console.log('[slackNotify] 응답 status:', res.status, '/ body:', body);
    if (!res.ok) console.error('[slackNotify] 전송 실패:', res.status, body);
    else console.log('[slackNotify] 전송 성공');
  } catch (err) {
    console.error('[slackNotify] 네트워크 오류:', err.message);
  }
}

module.exports = { notifyEscalation };
