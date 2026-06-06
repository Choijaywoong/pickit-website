require('dotenv').config();

// 저장된 자격증명을 process.env에 덮어쓰기 (커넥터 로드 전에 먼저 실행)
require('./src/core/credentialStore').loadFromFile();

const express = require('express');
const cors = require('cors');
const routes = require('./src/api/routes');
const oauthRoutes = require('./src/api/oauthRoutes');
const settingsRoutes = require('./src/api/settingsRoutes');
const { initTable } = require('./src/db/salesLog');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/settings', settingsRoutes);

// 루트 접속 시 안내 (프론트는 localhost:5173에서 실행)
app.get('/', (req, res) => {
  res.send('PICKIT API 서버입니다. 프론트엔드는 <a href="http://localhost:5173">http://localhost:5173</a> 에서 실행하세요.');
});

app.listen(PORT, async () => {
  console.log(`PICKIT 서버 실행 중: http://localhost:${PORT}`);
  // sales_log 테이블 초기화 (없으면 생성)
  initTable().catch((err) =>
    console.warn('[sales_log] DB 초기화 실패 (DB 미연결 상태일 수 있음):', err.message)
  );
});
