require('dotenv').config();

// 저장된 자격증명을 process.env에 덮어쓰기 (커넥터 로드 전에 먼저 실행)
require('./src/core/credentialStore').loadFromFile();

const app = require('./src/app');
const { initTable } = require('./src/db/salesLog');

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`PICKIT 서버 실행 중: http://localhost:${PORT}`);
  initTable().catch((err) =>
    console.warn('[sales_log] DB 초기화 실패 (DB 미연결 상태일 수 있음):', err.message)
  );
});
