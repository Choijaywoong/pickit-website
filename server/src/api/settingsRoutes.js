const router       = require('express').Router();
const cred         = require('../core/credentialStore');
const authMiddleware = require('../core/authMiddleware');

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

module.exports = router;
