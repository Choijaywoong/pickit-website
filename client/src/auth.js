// 모듈 레벨 토큰 스토어
// App에서 로그인 성공 시 setAuthToken() 호출 → 이후 모든 fetch가 이 토큰을 헤더에 포함
let _token = null;

export const setAuthToken = (token) => { _token = token; };
export const getAuthToken = () => _token;

// fetch 래퍼: 자동으로 Authorization 헤더 추가
export function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  return fetch(url, { ...options, headers });
}
