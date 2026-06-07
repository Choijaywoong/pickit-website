const router       = require('express').Router();
const cred         = require('../core/credentialStore');
const authMiddleware = require('../core/authMiddleware');

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

module.exports = router;
