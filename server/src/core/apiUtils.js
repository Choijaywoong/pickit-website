// 비기능 요구사항: 외부 API 실패 시 최대 3회 재시도 후 에러 처리 (PRD 5-1)
// 모든 채널 커넥터가 이 함수를 통해 fetch를 호출함

/**
 * fn 실행 실패 시 최대 maxRetries회까지 재시도.
 * 재시도 간격: 500ms → 1000ms (선형 백오프)
 */
async function withRetry(fn, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
