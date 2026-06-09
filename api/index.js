// Vercel Serverless Function — Express 앱을 서버리스로 노출
// 프론트엔드와 동일 도메인에서 /api/* 요청을 처리한다
require('../server/src/core/credentialStore').loadFromFile();
const { initTable } = require('../server/src/db/salesLog');
const app = require('../server/src/app');

// 콜드 스타트 시 DB 테이블 초기화 (이미 있으면 무시)
initTable().catch(() => {});

module.exports = app;
