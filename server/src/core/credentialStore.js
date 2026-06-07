// 자격증명 스토어
// 우선순위: AsyncLocalStorage(요청별 유저 자격증명) → 인메모리 → process.env
//
// 멀티유저 지원:
//   - Supabase 설정 시: user_credentials 테이블에 유저별 저장
//   - 미설정 시: credentials.json 파일 (단일 유저, 개발용)
//
// AsyncLocalStorage를 사용해 커넥터 코드 수정 없이 요청별 자격증명 격리

const fs   = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const { createClient }      = require('@supabase/supabase-js');

// ─── 파일 기반 스토어 (Supabase 미사용 시 폴백) ───────────────────────────────
const CRED_FILE = path.join(__dirname, '../../credentials.json');
const memStore  = {};

function readFile() {
  try { return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8')); }
  catch { return {}; }
}

function loadFromFile() {
  try {
    const data = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
    Object.entries(data).forEach(([k, v]) => {
      if (v) { memStore[k] = v; process.env[k] = v; }
    });
    console.log('[credentials] 저장된 자격증명 로드 완료');
  } catch {
    // 파일 없음 = 최초 실행, 정상
  }
}

// ─── Supabase 기반 스토어 (설정 시 사용) ─────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── AsyncLocalStorage — 요청별 유저 자격증명 격리 ───────────────────────────
const als = new AsyncLocalStorage();

/**
 * 해당 유저의 자격증명을 Supabase에서 읽어 ALS 컨텍스트에 주입하고 fn 실행
 * authMiddleware에서 호출
 */
async function runWithUserCredentials(userId, fn) {
  if (!supabase) return fn(); // Supabase 미설정: 파일 기반 폴백

  const { data, error } = await supabase
    .from('user_credentials')
    .select('key, value')
    .eq('user_id', userId);

  const userCreds = {};
  if (!error && data) {
    data.forEach(({ key, value }) => { userCreds[key] = value; });
  }

  return als.run(userCreds, fn);
}

// ─── 읽기 ─────────────────────────────────────────────────────────────────────
/**
 * 자격증명 값 읽기
 * 우선순위: ALS(요청별 유저 creds) → 인메모리(파일 기반) → process.env
 */
function get(key) {
  const userStore = als.getStore();
  if (userStore && userStore[key]) return userStore[key];
  return memStore[key] || process.env[key] || '';
}

// ─── 쓰기 ─────────────────────────────────────────────────────────────────────
/**
 * 자격증명 저장
 * userId 있으면 Supabase DB, 없으면 파일 기반
 */
async function set(credentials, userId = null) {
  if (supabase && userId) {
    // Supabase: 유저별 저장
    const rows = Object.entries(credentials)
      .filter(([, v]) => typeof v === 'string' && v)
      .map(([key, value]) => ({ user_id: userId, key, value }));

    if (!rows.length) return;

    const { error } = await supabase
      .from('user_credentials')
      .upsert(rows, { onConflict: 'user_id,key' });

    if (error) throw new Error(error.message);
  } else {
    // 파일 기반 (개발 모드)
    const existing = readFile();
    const merged   = { ...existing };
    Object.entries(credentials).forEach(([k, v]) => {
      if (typeof v === 'string') {
        merged[k]      = v;
        memStore[k]    = v;
        process.env[k] = v;
      }
    });
    fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2), 'utf8');
  }
}

// ─── 상태 조회 ────────────────────────────────────────────────────────────────
/**
 * 저장된 키 목록과 "설정됨 여부"만 반환 (값 노출 금지)
 * userId 있으면 Supabase, 없으면 파일 기반
 */
async function getStatus(userId = null) {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('user_credentials')
      .select('key')
      .eq('user_id', userId);

    if (error) return {};
    const status = {};
    (data || []).forEach(({ key }) => { status[key] = true; });
    return status;
  }

  // 파일 기반
  const data = readFile();
  const status = {};
  Object.keys(data).forEach((k) => { status[k] = !!data[k]; });
  return status;
}

module.exports = { loadFromFile, get, set, getStatus, runWithUserCredentials };
