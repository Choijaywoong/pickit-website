// Resend API로 이메일 발송 — RESEND_API_KEY 환경변수 필요
// 설정 없으면 콘솔 경고만 내고 조용히 스킵 (앱 흐름에 영향 없음)
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[sendEmail] RESEND_API_KEY 미설정 — 이메일 발송 건너뜀');
    return { skipped: true };
  }
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `PICKIT <${from}>`, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[sendEmail] 발송 실패:', body);
      return { error: body };
    }
    return { ok: true };
  } catch (err) {
    console.error('[sendEmail] 네트워크 오류:', err.message);
    return { error: err.message };
  }
}

module.exports = { sendEmail };
