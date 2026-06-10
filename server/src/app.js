// Express 앱 팩토리 — listen() 없이 라우터만 구성 (Vercel 서버리스 및 로컬 개발 공용)
const express = require('express');
const cors    = require('cors');
const routes         = require('./api/routes');
const oauthRoutes    = require('./api/oauthRoutes');
const settingsRoutes = require('./api/settingsRoutes');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api', routes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => res.json({ service: 'PICKIT API', status: 'ok' }));

// 404 핸들러 — 존재하지 않는 라우트는 JSON으로 반환
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// 전역 에러 핸들러 — 처리되지 않은 예외를 JSON으로 반환
app.use((err, req, res, _next) => {
  console.error('[PICKIT ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

module.exports = app;
