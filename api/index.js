// Vercel Serverless Function — Express 앱을 서버리스로 노출
// 프론트엔드와 동일 도메인에서 /api/* 요청을 처리한다
require('../server/src/core/credentialStore').loadFromFile();
const app = require('../server/src/app');

module.exports = app;
