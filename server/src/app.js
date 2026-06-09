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

module.exports = app;
