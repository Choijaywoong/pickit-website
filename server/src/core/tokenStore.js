// OAuth 토큰 저장소
// MVP: 서버 메모리(Map)에 저장 → 서버 재시작 시 초기화됨
// TODO(Post-MVP): PostgreSQL encrypted_tokens 테이블로 마이그레이션
//   columns: platform, mall_id, access_token (encrypted), refresh_token (encrypted), expires_at

const store = new Map(); // key: `${platform}:${mallId}`, value: { accessToken, refreshToken, expiresAt }

function tokenKey(platform, mallId) {
  return `${platform}:${mallId}`;
}

function saveToken(platform, mallId, { accessToken, refreshToken, expiresIn }) {
  store.set(tokenKey(platform, mallId), {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

function getToken(platform, mallId) {
  return store.get(tokenKey(platform, mallId)) || null;
}

function isExpired(tokenData) {
  // 만료 5분 전부터 갱신 대상으로 처리
  return Date.now() >= tokenData.expiresAt - 5 * 60 * 1000;
}

function hasToken(platform, mallId) {
  const t = getToken(platform, mallId);
  return !!t;
}

module.exports = { saveToken, getToken, isExpired, hasToken };
