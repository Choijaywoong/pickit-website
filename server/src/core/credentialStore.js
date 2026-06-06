// 자격증명 스토어: 설정 UI → 여기 저장 → 각 커넥터가 get()으로 읽음
// credentials.json에 파일로 유지 (서버 재시작 후에도 유지)
// 절대 프론트엔드나 git에 노출 금지 (규칙⑤, .gitignore에 추가)

const fs   = require('fs');
const path = require('path');

const CRED_FILE = path.join(__dirname, '../../credentials.json');

// 인메모리 스토어 (파일에서 로드 후 최신 값 유지)
const store = {};

/**
 * 서버 시작 시 한 번 호출 — credentials.json → process.env + 인메모리 스토어
 * 이후 connectors가 get()으로 읽을 때 최신 값 반환
 */
function loadFromFile() {
  try {
    const data = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
    Object.entries(data).forEach(([k, v]) => {
      if (v) {
        store[k] = v;
        // process.env도 갱신해두면 oauthRoutes 등 기존 코드도 호환
        process.env[k] = v;
      }
    });
    console.log('[credentials] 저장된 자격증명 로드 완료');
  } catch {
    // 파일 없음 = 최초 실행, 정상
  }
}

/**
 * 특정 키 값을 읽는다.
 * 우선순위: 인메모리(설정 UI) → process.env(.env 파일)
 */
function get(key) {
  return store[key] || process.env[key] || '';
}

/**
 * 새 자격증명을 저장한다.
 * - 인메모리 + process.env 갱신 (재시작 없이 즉시 반영)
 * - credentials.json에 파일로 유지
 */
function set(credentials) {
  const existing = readFile();
  const merged   = { ...existing };

  Object.entries(credentials).forEach(([k, v]) => {
    if (typeof v === 'string') {
      merged[k]     = v;
      store[k]      = v;
      process.env[k] = v;
    }
  });

  fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * 저장된 키 목록과 "설정됨 여부"만 반환 (값은 프론트에 노출하지 않음)
 */
function getStatus() {
  const data   = readFile();
  const status = {};
  Object.keys(data).forEach((k) => {
    status[k] = !!data[k];
  });
  return status;
}

function readFile() {
  try { return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8')); }
  catch { return {}; }
}

module.exports = { loadFromFile, get, set, getStatus };
