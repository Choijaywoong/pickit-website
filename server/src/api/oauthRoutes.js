// 카페24 OAuth 2.0 인증 흐름
// 카페24 공식 문서: https://developers.cafe24.com/app/front/app/develop/oauth/intro
//
// 흐름 요약:
//   1. GET /api/oauth/cafe24/start?mallId=xxx  → 카페24 로그인 페이지로 리다이렉트
//   2. 셀러가 허용 → 카페24가 /api/oauth/cafe24/callback?code=...&mall_id=xxx 로 리다이렉트
//   3. 서버가 code → access_token 교환 후 tokenStore에 저장
//   4. 프론트에 성공 메시지 전달

const express = require('express');
const router = express.Router();
const { saveToken } = require('../core/tokenStore');

// 카페24가 허용할 권한 범위
// mall.read_order/write_order: 주문 조회·수정·송장
// mall.read_product/write_product: 상품(가격·재고) 조회·수정
const CAFE24_SCOPES = [
  'mall.read_order',
  'mall.write_order',
  'mall.read_product',
  'mall.write_product',
  'mall.read_shipment',
  'mall.write_shipment',
].join(',');

// CSRF 방어용 state 임시 저장 (MVP: 메모리, 실서비스: Redis 또는 세션)
const pendingStates = new Map(); // state → mallId

// ─── 1단계: 카페24 로그인 페이지로 보내기 ───────────────────────────────────
// 프론트에서 호출: GET /api/oauth/cafe24/start?mallId=데모몰아이디
router.get('/cafe24/start', (req, res) => {
  const { mallId } = req.query;
  if (!mallId) return res.status(400).json({ error: 'mallId가 필요합니다.' });

  const clientId = process.env.CAFE24_CLIENT_ID;
  const redirectUri = process.env.CAFE24_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: '.env에 CAFE24_CLIENT_ID, CAFE24_REDIRECT_URI를 설정해 주세요.' });
  }

  // CSRF 방어: state = 무작위 문자열
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  pendingStates.set(state, mallId);
  // state는 10분 후 자동 만료
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  const authUrl =
    `https://${mallId}.cafe24api.com/api/v2/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(CAFE24_SCOPES)}` +
    `&state=${state}`;

  res.redirect(authUrl);
});

// ─── 2단계: 카페24가 code를 들고 돌아옴 ────────────────────────────────────
// 카페24 앱 설정의 'Redirect URI' 항목에 이 URL을 등록해야 함
// 예: http://localhost:4000/api/oauth/cafe24/callback
router.get('/cafe24/callback', async (req, res) => {
  const { code, state, mall_id: mallId, error } = req.query;

  // 카페24에서 에러 반환 (셀러가 취소 등)
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?oauth=failed&reason=${error}`);
  }

  // state 검증 (CSRF 방어)
  if (!state || !pendingStates.has(state)) {
    return res.status(400).json({ error: '유효하지 않은 state입니다. 다시 연결을 시도해 주세요.' });
  }
  const expectedMallId = pendingStates.get(state);
  pendingStates.delete(state);

  if (expectedMallId !== mallId) {
    return res.status(400).json({ error: '쇼핑몰 ID가 일치하지 않습니다.' });
  }

  // ─── 3단계: code → access_token 교환 ─────────────────────────────────────
  try {
    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    const redirectUri = process.env.CAFE24_REDIRECT_URI;

    // 카페24 토큰 엔드포인트: Basic Auth (base64(clientId:clientSecret))
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Cafe24 OAuth] 토큰 교환 실패:', errText);
      return res.status(502).json({ error: '카페24 토큰 발급 실패', detail: errText });
    }

    const tokenData = await tokenRes.json();
    // tokenData: { access_token, refresh_token, expires_at, issued_at, client_id, mall_id, scopes }
    // 카페24 access_token 유효시간: 2시간

    saveToken('cafe24', mallId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in ?? 7200, // 기본 2시간
    });

    console.log(`[Cafe24 OAuth] ${mallId} 연결 완료`);

    // 프론트로 성공 리다이렉트
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?oauth=success&mall_id=${mallId}`);
  } catch (err) {
    console.error('[Cafe24 OAuth] 예외:', err.message);
    res.status(500).json({ error: '토큰 교환 중 서버 오류가 발생했습니다.' });
  }
});

// ─── 토큰 갱신 (access_token 만료 시 refresh_token으로 재발급) ────────────────
// cafe24.js 커넥터가 API 호출 전에 이 함수를 통해 유효한 토큰을 가져감
async function refreshCafe24Token(mallId) {
  const { getToken, saveToken: save, isExpired } = require('../core/tokenStore');
  const tokenData = getToken('cafe24', mallId);

  if (!tokenData) throw new Error(`카페24 토큰 없음: ${mallId} — 연동 설정이 필요합니다.`);
  if (!isExpired(tokenData)) return tokenData.accessToken; // 아직 유효

  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`카페24 토큰 갱신 실패: ${await res.text()}`);

  const data = await res.json();
  save('cafe24', mallId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 7200,
  });

  return data.access_token;
}

module.exports = router;
module.exports.refreshCafe24Token = refreshCafe24Token;
