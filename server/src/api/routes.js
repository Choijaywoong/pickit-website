const express = require('express');
const router  = express.Router();
const { handleToolCall }              = require('../core/toolHandler');
const { chat }                        = require('../core/llm');
const { predictDepletion, getDailySalesRate } = require('../db/salesLog');
const { syncStock }                   = require('../core/stockSync');

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PICKIT' });
});

// 채팅 메시지 처리 (프론트 ChatWidget → 여기로 POST)
router.post('/chat', async (req, res) => {
  const { message, history, activeChannels } = req.body;
  if (!message) return res.status(400).json({ error: '메시지가 없습니다.' });
  try {
    const result = await chat(message, history || [], activeChannels || []);
    res.json(result);
  } catch (err) {
    console.error('[/api/chat 오류]', err.message);
    res.status(500).json({ error: 'LLM 처리 중 오류가 발생했습니다.' });
  }
});

// Tool 직접 실행 (방화벽 통과 후 승인 시 재호출용)
router.post('/tool/execute', async (req, res) => {
  try {
    const result = await handleToolCall(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FR-006: 발주 예측 (재고 소진 예측일 + 권장 발주량)
// GET /api/predict?platform=coupang&productId=123&currentStock=50&days=120
router.get('/predict', async (req, res) => {
  const { platform, productId, currentStock, days = 120 } = req.query;
  if (!platform || !productId) {
    return res.status(400).json({ error: 'platform, productId가 필요합니다.' });
  }
  if (currentStock == null) {
    return res.status(400).json({ error: 'currentStock(현재 재고 수량)이 필요합니다.' });
  }
  try {
    const result = await predictDepletion({
      platform,
      productId,
      currentStock: Number(currentStock),
      days:         Number(days),
    });
    res.json({ platform, productId, prediction: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FR-009: 재고 동기화 (수동 트리거)
// POST /api/sync-stock
// body: { sourcePlatform, productId, optionLabel, newQuantity, targetPlatforms? }
router.post('/sync-stock', async (req, res) => {
  const { sourcePlatform, productId, optionLabel, newQuantity, targetPlatforms } = req.body;
  if (!sourcePlatform || !productId || newQuantity == null) {
    return res.status(400).json({ error: 'sourcePlatform, productId, newQuantity가 필요합니다.' });
  }
  try {
    const results = await syncStock({ sourcePlatform, productId, optionLabel, newQuantity, targetPlatforms });
    res.json({ synced: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 판매 이력 조회 (개발·디버그용)
router.get('/sales-log', async (req, res) => {
  const { platform, productId, days = 30 } = req.query;
  if (!platform || !productId) {
    return res.status(400).json({ error: 'platform, productId가 필요합니다.' });
  }
  try {
    const rows = await getDailySalesRate({ platform, productId, days: Number(days) });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
