// 주기적 알림 크론 엔드포인트 — Vercel Cron이 매일 09:00 UTC에 호출
const express          = require('express');
const router           = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { sendEmail }    = require('../core/sendEmail');

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/cron/check-expiry
// 무신사 API 키 만료 30일 전부터 7일 간격으로 이메일 알림
router.get('/check-expiry', async (req, res) => {
  // CRON_SECRET이 설정돼 있으면 검증 (Vercel이 자동으로 Bearer 헤더를 붙여줌)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (auth !== cronSecret) {
      return res.status(401).json({ error: '인증 실패' });
    }
  }

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: 'Supabase 미설정' });

  const now         = new Date();
  const in30Days    = new Date(now.getTime() + 30 * 86400000).toISOString();
  const ago7Days    = new Date(now.getTime() - 7  * 86400000).toISOString();

  // 30일 이내 만료, 아직 안 만료, 7일 이내 알림 없는 무신사 키 조회
  const { data: creds, error } = await supabase
    .from('channel_credentials')
    .select('id, user_id, expires_at, last_reminded_at, profiles!inner(email)')
    .eq('channel', 'musinsa')
    .eq('is_active', true)
    .not('expires_at', 'is', null)
    .lte('expires_at', in30Days)
    .gt('expires_at', now.toISOString())
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${ago7Days}`);

  if (error) {
    console.error('[cron/check-expiry] 조회 실패:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const sent = [];
  for (const cred of creds || []) {
    const email    = cred.profiles?.email;
    if (!email) continue;

    const expiresAt = new Date(cred.expires_at);
    const daysLeft  = Math.ceil((expiresAt - now) / 86400000);

    await sendEmail({
      to:      email,
      subject: `[PICKIT] 무신사 API 키 만료 ${daysLeft}일 전 — 갱신이 필요합니다`,
      html:    buildMusinsaHtml({ daysLeft, expiresAt }),
    });

    await supabase
      .from('channel_credentials')
      .update({ last_reminded_at: now.toISOString() })
      .eq('id', cred.id);

    sent.push({ userId: cred.user_id, email, daysLeft });
    console.log(`[cron] 무신사 만료 알림 발송: ${email} (${daysLeft}일 남음)`);
  }

  res.json({ sent: sent.length, details: sent });
});

function buildMusinsaHtml({ daysLeft, expiresAt }) {
  const expireStr = expiresAt.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const urgency = daysLeft <= 7 ? '#e53e3e' : '#dd6b20';
  return `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a202c;">무신사 API 키 갱신 안내</h2>
      <p style="color:#4a5568;">안녕하세요, PICKIT을 이용해 주셔서 감사합니다.</p>
      <div style="margin:20px 0;padding:16px;background:#fff5f5;border-radius:8px;border-left:4px solid ${urgency};">
        <strong style="color:${urgency};">연동하신 무신사 API 키가 ${daysLeft}일 후(${expireStr})에 만료됩니다.</strong>
      </div>
      <p style="color:#4a5568;">
        만료 전에 갱신하지 않으면 무신사 주문 조회·송장 전송이 중단됩니다.
      </p>
      <div style="margin:20px 0;padding:16px;background:#f7fafc;border-radius:8px;">
        <strong>갱신 방법.</strong><br/><br/>
        1. 무신사 파트너센터 접속 → 마이페이지 → API 관리<br/>
        2. 새 API 키 발급<br/>
        3. PICKIT → 채널 설정 → 무신사 재연동
      </div>
      <p style="color:#718096;font-size:13px;">문의사항은 PICKIT 고객센터로 연락해 주세요.</p>
    </div>
  `;
}

module.exports = router;
