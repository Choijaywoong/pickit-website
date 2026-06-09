const router       = require('express').Router();
const cred         = require('../core/credentialStore');
const authMiddleware = require('../core/authMiddleware');
const connectors   = require('../connectors');
const { createClient } = require('@supabase/supabase-js');

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// 무신사 API 키 저장 시 channel_credentials에 만료일 기록 (1년 만료 정책)
async function trackMusinsaExpiry(userId) {
  const supabase = getServiceClient();
  if (!supabase || !userId) return;
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 86400000).toISOString();
  await supabase
    .from('channel_credentials')
    .upsert(
      { user_id: userId, channel: 'musinsa', connected_at: now.toISOString(), expires_at: expiresAt, is_active: true },
      { onConflict: 'user_id,channel' }
    );
}

// 채널별 필수 API 키 목록
const CHANNEL_REQUIRED_KEYS = {
  coupang: ['COUPANG_VENDOR_ID', 'COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY'],
  naver:   ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'],
  cafe24:  ['CAFE24_MALL_ID'],
  musinsa: ['MUSINSA_API_KEY'],
  ably:    ['ABLY_API_KEY'],
  zigzag:  ['ZIGZAG_API_KEY'],
};

// 모든 /api/settings/* 요청은 인증 필요
router.use(authMiddleware);

// GET /api/settings/credentials — 키 설정 여부만 반환 (값은 노출 금지)
router.get('/credentials', async (req, res) => {
  try {
    const status = await cred.getStatus(req.userId || null);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/credentials — 자격증명 저장 (즉시 반영)
router.post('/credentials', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: '잘못된 요청 형식입니다.' });
    }
    await cred.set(body, req.userId || null);

    // 무신사 API 키가 포함되면 만료 추적 테이블에 기록
    if (body.MUSINSA_API_KEY && req.userId) {
      trackMusinsaExpiry(req.userId).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[settings] 자격증명 저장 실패:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/channel-status — 채널별 연동 상태 반환
// 'ok': 필수 키 전부 있음 / 'missing': 일부 없음 / 'demo': 데모 모드
router.get('/channel-status', async (req, res) => {
  try {
    const demoMode = process.env.DEMO_MODE === 'true';
    if (demoMode) {
      const demoStatus = {};
      Object.keys(CHANNEL_REQUIRED_KEYS).forEach((ch) => { demoStatus[ch] = 'demo'; });
      return res.json(demoStatus);
    }

    const stored = await cred.getStatus(req.userId || null);
    const result = {};

    Object.entries(CHANNEL_REQUIRED_KEYS).forEach(([channel, keys]) => {
      const allPresent = keys.every((k) => stored[k] || cred.get(k));
      result[channel] = allPresent ? 'ok' : 'missing';
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-connection — 실제 API 호출로 연결 확인
router.post('/test-connection', async (req, res) => {
  const { platform } = req.body;
  const connector = connectors[platform];

  if (!connector) {
    return res.status(400).json({ ok: false, reason: '알 수 없는 채널입니다.' });
  }
  if (typeof connector.test !== 'function') {
    return res.status(400).json({ ok: false, reason: '이 채널은 테스트를 지원하지 않습니다.' });
  }

  try {
    await connector.test();
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, reason: err.message });
  }
});

module.exports = router;
