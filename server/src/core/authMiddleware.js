// JWT 인증 미들웨어 — Supabase Access Token 검증
// SUPABASE_URL 미설정 시(개발/오프라인 모드) 인증을 건너뜀

const { createClient } = require('@supabase/supabase-js');
const cred = require('./credentialStore');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Express 미들웨어: Authorization: Bearer <token> 검증
 * 성공 시 req.userId 설정 + 사용자 자격증명을 AsyncLocalStorage에 주입
 */
async function authMiddleware(req, res, next) {
  // Supabase 미설정 → 개발 모드, 인증 생략
  if (!supabase) return next();

  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const token = header.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: '인증에 실패했습니다. 다시 로그인해 주세요.' });

    req.userId = user.id;

    // AsyncLocalStorage에 사용자 자격증명 주입 — 커넥터가 get()으로 읽음
    await cred.runWithUserCredentials(user.id, next);
  } catch (err) {
    console.error('[auth] 토큰 검증 오류:', err.message);
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

module.exports = authMiddleware;
