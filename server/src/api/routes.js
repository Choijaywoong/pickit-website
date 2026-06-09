const express = require('express');
const router  = express.Router();
const { handleToolCall }              = require('../core/toolHandler');
const { chat }                        = require('../core/llm');
const { csAutoReply }                 = require('../core/csAutoReply');
const { saveTicket, updateTicketEmail } = require('../db/csTickets');
const { notifyEscalation }              = require('../core/slackNotify');
const { getDailySalesRate, checkDbHealth } = require('../db/salesLog');
const { runForecast } = require('../forecast/engine');
const { syncStock }                   = require('../core/stockSync');
const authMiddleware                  = require('../core/authMiddleware');
const connectors                      = require('../connectors');
const adminRoutes                     = require('./adminRoutes');
const cronRoutes                      = require('./cronRoutes');

router.use('/admin', adminRoutes);
router.use('/cron',  cronRoutes);

// 헬스체크 — 인증 불필요
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PICKIT' });
});

// DB 헬스체크 — sales_log 연결 및 적재 현황 확인
router.get('/health/db', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ connected: false, reason: 'DATABASE_URL 환경변수가 설정되지 않았습니다.' });
  }
  try {
    const result = await checkDbHealth();
    res.json({ ...result, databaseUrl: process.env.DATABASE_URL.replace(/:\/\/.*@/, '://***@') });
  } catch (err) {
    res.status(503).json({ connected: false, reason: err.message });
  }
});

// 채팅·Tool·예측·재고동기화·송장은 인증 필요
router.use(['/chat', '/tool/execute', '/predict', '/sync-stock', '/sales-log', '/invoice'], authMiddleware);

// ── FR-004: 송장 미처리 주문 조회 ────────────────────────────────────────────
// POST /api/invoice/pending  body: { channels: ['coupang', 'naver', ...] }
// 각 채널의 오늘 주문을 병렬 조회 → 아직 배송 처리 안 된 건만 반환
router.post('/invoice/pending', async (req, res) => {
  const { channels = [] } = req.body;
  if (!channels.length) return res.status(400).json({ error: 'channels가 필요합니다.' });

  const settled = await Promise.allSettled(
    channels.map(async (channel) => {
      const connector = connectors[channel];
      if (!connector?.query) return [];
      const result = await connector.query({ value: {} }); // 기본값: 오늘 주문
      return (result.orders || []).map((order) => ({
        id:            String(order.orderId),
        orderId:       String(order.orderId),
        channel,
        productName:   order.items?.[0]?.productName || '상품',
        option:        order.items?.[0]?.optionValue  || '',
        quantity:      order.items?.[0]?.quantity     || 1,
        // 쿠팡 로켓배송(ROCKET) 등 플랫폼 위탁 주문은 platform으로 분류
        deliveryType:  detectDeliveryType(channel, order),
        courier:       '',
        trackingNumber: '',
        status:        'pending',
      }));
    })
  );

  const orders = settled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter(Boolean);

  res.json({ orders });
});

// ── FR-004: 송장 일괄 전송 ────────────────────────────────────────────────────
// POST /api/invoice/send
// body: { orders: [{ orderId, channel, courier, trackingNumber }] }
router.post('/invoice/send', async (req, res) => {
  const { orders } = req.body;
  if (!orders?.length) return res.status(400).json({ error: 'orders가 필요합니다.' });

  const settled = await Promise.allSettled(
    orders.map(async (order) => {
      const connector = connectors[order.channel];
      if (!connector?.invoice) throw new Error(`${order.channel}: invoice 미지원`);
      await connector.invoice({
        productId: order.orderId,
        value: { courier: order.courier, trackingNumber: order.trackingNumber },
      });
      return { orderId: order.orderId, channel: order.channel, success: true };
    })
  );

  const results = settled.map((r, i) => ({
    orderId:  orders[i].orderId,
    channel:  orders[i].channel,
    success:  r.status === 'fulfilled',
    error:    r.status === 'rejected' ? r.reason.message : undefined,
  }));

  res.json({ results });
});

// 플랫폼 위탁 배송 여부 판별 (채널·주문 데이터 기반)
function detectDeliveryType(channel, order) {
  if (channel === 'coupang') {
    // 쿠팡 로켓배송: 주문 상태 또는 배송사 코드로 구분
    const status = (order.status || '').toUpperCase();
    if (status.includes('ROCKET') || status.includes('NFA')) return 'platform';
  }
  return 'self';
}

// ── CS 1차 자동 답변 (인증 불필요 — 비로그인 유저도 접근) ──────────────────────
// POST /api/cs/message  body: { message, issueType?, history? }
router.post('/cs/message', async (req, res) => {
  const { message, issueType, history } = req.body;
  if (!message) return res.status(400).json({ error: '메시지가 없습니다.' });
  try {
    const result = await csAutoReply({ message, history: history || [], issueType });

    if (result.escalate) {
      // 에스컬레이션 시 cs_tickets에 저장 (슬랙 알림은 4단계에서 추가)
      const fullMessages = [
        ...(history || []),
        { role: 'user', content: message },
      ];
      // 1) Supabase 저장 (반드시 먼저 — 슬랙 실패해도 저장은 보장)
      const ticketId = await saveTicket({
        userId:    req.userId || null,
        issueType: issueType || 'other',
        messages:  fullMessages,
        reason:    result.reason,
      });

      // 2) 슬랙 알림 (await — 서버리스 함수는 res.json() 직후 종료되므로 반드시 await)
      try {
        await notifyEscalation({
          issueType: issueType || 'other',
          userEmail: null,
          reason:    result.reason,
          messages:  fullMessages,
          ticketId,
        });
      } catch {}

      return res.json({ escalate: true, ticketId });
    }

    res.json(result);
  } catch (err) {
    console.error('[/api/cs/message 오류]', err.message);
    res.json({ escalate: true, reason: '서버 오류 — 수동 처리 필요' });
  }
});

// CS 티켓 이메일 업데이트 (비로그인 유저가 에스컬레이션 후 이메일 입력 시)
// PATCH /api/cs/ticket/:id/email  body: { email }
router.patch('/cs/ticket/:id/email', async (req, res) => {
  const { id }    = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email이 필요합니다.' });
  await updateTicketEmail(id, email);
  res.json({ ok: true });
});

// 채팅 메시지 처리 (프론트 ChatWidget → 여기로 POST)
router.post('/chat', async (req, res) => {
  const { message, history, activeChannels, stockMode } = req.body;
  if (!message) return res.status(400).json({ error: '메시지가 없습니다.' });
  try {
    const result = await chat(message, history || [], activeChannels || [], stockMode || null);
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
// GET /api/predict?platform=coupang&productId=123&currentStock=50
router.get('/predict', async (req, res) => {
  const { platform, productId, currentStock } = req.query;
  if (!platform || !productId) {
    return res.status(400).json({ error: 'platform, productId가 필요합니다.' });
  }
  if (currentStock == null) {
    return res.status(400).json({ error: 'currentStock(현재 재고 수량)이 필요합니다.' });
  }
  try {
    const prediction = await runForecast({
      platform,
      productId,
      currentStock: Number(currentStock),
    });
    res.json({ platform, productId, prediction });
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
