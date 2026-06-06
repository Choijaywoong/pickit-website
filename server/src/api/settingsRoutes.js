const router = require('express').Router();
const cred   = require('../core/credentialStore');

// GET /api/settings/credentials — 키 설정 여부만 반환 (값은 노출 금지)
router.get('/credentials', (req, res) => {
  res.json(cred.getStatus());
});

// POST /api/settings/credentials — 자격증명 저장 (즉시 반영, 재시작 불필요)
router.post('/credentials', (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: '잘못된 요청 형식입니다.' });
    }
    cred.set(body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[settings] 자격증명 저장 실패:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
