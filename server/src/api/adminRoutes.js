// 관리자 전용 API — CS 티켓 조회·답변·상태변경 (서비스 롤 키로 RLS 우회)
const express    = require('express');
const router     = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { sendEmail }    = require('../core/sendEmail');

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// JWT → admin 여부 확인 미들웨어
async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: '인증 필요' });
  const token = auth.slice(7);

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: 'Supabase 미설정' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: '유효하지 않은 토큰' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  req.adminUserId = user.id;
  next();
}

// GET /api/admin/tickets — 전체 CS 티켓 (최신순)
router.get('/tickets', requireAdmin, async (req, res) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('cs_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tickets: data });
});

// PATCH /api/admin/tickets/:id — 답변 추가 + 상태 변경
// body: { status?, reply? }
router.patch('/tickets/:id', requireAdmin, async (req, res) => {
  const { id }           = req.params;
  const { status, reply } = req.body;
  const supabase         = getServiceClient();

  const { data: ticket, error: fetchErr } = await supabase
    .from('cs_tickets')
    .select('messages, user_email, user_id')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(404).json({ error: '티켓을 찾을 수 없습니다.' });

  const updates = {};

  if (reply?.trim()) {
    const msgs = Array.isArray(ticket.messages) ? ticket.messages : [];
    updates.messages = [
      ...msgs,
      { role: 'admin', content: reply.trim(), timestamp: new Date().toISOString() },
    ];
  }

  if (status) {
    updates.status = status;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('cs_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 답변이 있고 유저 이메일이 있으면 알림 발송 (실패해도 응답에 영향 없음)
  if (reply?.trim() && ticket.user_email) {
    const resolvedNote = (status === 'resolved')
      ? '<p style="color:#38a169;font-weight:600;">이 문의는 해결됨으로 처리되었습니다.</p>'
      : '';
    sendEmail({
      to:      ticket.user_email,
      subject: '[PICKIT] CS 문의에 답변이 도착했습니다',
      html:    buildCsReplyHtml({ reply: reply.trim(), resolvedNote }),
    }).catch(() => {});
  }

  res.json({ ticket: data });
});

function buildCsReplyHtml({ reply, resolvedNote }) {
  return `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a202c;">CS 문의 답변 안내</h2>
      <p style="color:#4a5568;">안녕하세요, PICKIT 고객센터입니다. 문의하신 내용에 답변을 드립니다.</p>
      <div style="margin:20px 0;padding:16px;background:#f7fafc;border-radius:8px;border-left:4px solid #4299e1;">
        <p style="color:#2d3748;white-space:pre-wrap;margin:0;">${reply.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
      ${resolvedNote}
      <p style="color:#718096;font-size:13px;">추가 문의사항이 있으시면 PICKIT 서비스 내 CS 채팅으로 다시 문의해 주세요.</p>
    </div>
  `;
}

// GET /api/admin/metrics — 사업 운영 지표 전체
router.get('/metrics', requireAdmin, async (req, res) => {
  const supabase = getServiceClient();

  // 병렬 조회
  const [profilesRes, activityRes, ticketsRes, paymentsRes, subsRes] = await Promise.all([
    supabase.from('profiles').select('id, created_at, role').eq('role', 'user'),
    supabase.from('activity_log').select('user_id, action, created_at').order('created_at', { ascending: false }),
    supabase.from('cs_tickets').select('id, created_at, status, escalated_at, resolved_at, issue_type'),
    supabase.from('payments').select('id, user_id, amount, status, plan, paid_at').eq('status', 'completed'),
    supabase.from('subscriptions').select('id, user_id, amount, status, plan, billing_cycle, started_at, cancelled_at'),
  ]);

  const profiles  = profilesRes.data  || [];
  const activity  = activityRes.data  || [];
  const tickets   = ticketsRes.data   || [];
  const payments  = paymentsRes.data  || [];
  const subs      = subsRes.data      || [];

  // ── 가입자 지표 ──────────────────────────────────────────────────────────────
  const now       = new Date();
  const msDay     = 86400000;
  const msWeek    = msDay * 7;

  function dayKey(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function weekKey(iso) {
    const d = new Date(iso);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - startOfYear) / msDay + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
  }

  // 최근 30일 일별 신규 가입
  const signupByDay = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * msDay);
    signupByDay[dayKey(d.toISOString())] = 0;
  }
  profiles.forEach(p => {
    const k = dayKey(p.created_at);
    if (signupByDay[k] !== undefined) signupByDay[k]++;
  });

  // 최근 12주 주별 신규 가입
  const signupByWeek = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now - i * msWeek);
    signupByWeek[weekKey(d.toISOString())] = 0;
  }
  profiles.forEach(p => {
    const k = weekKey(p.created_at);
    if (signupByWeek[k] !== undefined) signupByWeek[k]++;
  });

  const thisWeekStart  = new Date(now - 7  * msDay);
  const thisMonthStart = new Date(now - 30 * msDay);
  const newThisWeek    = profiles.filter(p => new Date(p.created_at) >= thisWeekStart).length;
  const newThisMonth   = profiles.filter(p => new Date(p.created_at) >= thisMonthStart).length;

  // ── 활성 유저 (DAU) ──────────────────────────────────────────────────────────
  const dauByDay = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * msDay);
    dauByDay[dayKey(d.toISOString())] = new Set();
  }
  activity.forEach(a => {
    const k = dayKey(a.created_at);
    if (dauByDay[k]) dauByDay[k].add(a.user_id);
  });

  // ── 리텐션 (Day-1, Day-7, Day-30) ───────────────────────────────────────────
  // 각 유저의 첫 활동일 기준으로 N일 후에도 활동했는지 계산
  const activityByUser = {};
  activity.forEach(a => {
    if (!activityByUser[a.user_id]) activityByUser[a.user_id] = [];
    activityByUser[a.user_id].push(new Date(a.created_at).getTime());
  });

  const retentionCohort = { d1: 0, d7: 0, d30: 0, base: 0 };
  profiles.forEach(p => {
    const joined  = new Date(p.created_at).getTime();
    const sessions = (activityByUser[p.id] || []).sort();
    if (!sessions.length) return;
    retentionCohort.base++;
    if (sessions.some(t => t >= joined + msDay     && t <= joined + 2  * msDay)) retentionCohort.d1++;
    if (sessions.some(t => t >= joined + 6  * msDay && t <= joined + 8  * msDay)) retentionCohort.d7++;
    if (sessions.some(t => t >= joined + 28 * msDay && t <= joined + 32 * msDay)) retentionCohort.d30++;
  });

  // ── 이벤트 유형별 사용 현황 ───────────────────────────────────────────────────
  const eventCounts = {};
  activity.forEach(a => {
    eventCounts[a.action] = (eventCounts[a.action] || 0) + 1;
  });

  // ── 매출 지표 ─────────────────────────────────────────────────────────────────
  const totalRevenue   = payments.reduce((s, p) => s + p.amount, 0);

  // 이번 달 실제 결제액
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthPaid  = payments
    .filter(p => new Date(p.paid_at) >= monthStart)
    .reduce((s, p) => s + p.amount, 0);

  // MRR — 현재 active 구독 월 환산 합계
  const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'trial');
  const mrr = activeSubs.reduce((s, sub) => {
    const monthly = sub.billing_cycle === 'annual' ? Math.round(sub.amount / 12) : sub.amount;
    return s + monthly;
  }, 0);

  // 이번 달 예상 매출 = 이미 결제된 금액 + 남은 날에 비례한 MRR
  const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays    = now.getDate();
  const remainingDays  = daysInMonth - elapsedDays;
  const projectedExtra = mrr > 0 ? Math.round(mrr * remainingDays / daysInMonth) : 0;
  const projectedMonth = thisMonthPaid + projectedExtra;

  // ARPU — 유료 유저 1인당 평균 월 지출
  const payingUsers = new Set(activeSubs.map(s => s.user_id)).size;
  const arpu        = payingUsers > 0 ? Math.round(mrr / payingUsers) : 0;

  // 플랜별 분포
  const planCounts = {};
  activeSubs.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });

  // 월별 매출 추이 (최근 6개월)
  const revenueByMonth = {};
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    revenueByMonth[key] = 0;
  }
  payments.forEach(p => {
    const d   = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (revenueByMonth[key] !== undefined) revenueByMonth[key] += p.amount;
  });

  // ── CS 지표 ──────────────────────────────────────────────────────────────────
  const resolvedTickets  = tickets.filter(t => t.status === 'resolved');
  const avgResolveMs     = resolvedTickets.length
    ? resolvedTickets.reduce((s, t) => s + (new Date(t.resolved_at) - new Date(t.escalated_at)), 0) / resolvedTickets.length
    : null;

  res.json({
    users: {
      total:        profiles.length,
      newThisWeek,
      newThisMonth,
      dailySignups: Object.entries(signupByDay).map(([date, count]) => ({ date, count })),
      weeklySignups: Object.entries(signupByWeek).map(([week, count]) => ({ week, count })),
    },
    activity: {
      totalEvents: activity.length,
      uniqueUsers: new Set(activity.map(a => a.user_id)).size,
      dau: Object.entries(dauByDay).map(([date, set]) => ({ date, dau: set.size })),
      eventBreakdown: Object.entries(eventCounts).map(([event, count]) => ({ event, count })),
    },
    retention: retentionCohort,
    revenue: {
      total:          totalRevenue,
      mrr,
      thisMonth:      thisMonthPaid,
      projected:      projectedMonth,
      arpu,
      payingUsers,
      planBreakdown:  Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
      monthly:        Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount })),
    },
    cs: {
      total:              tickets.length,
      open:               tickets.filter(t => !t.status || t.status === 'open').length,
      resolved:           resolvedTickets.length,
      resolutionRate:     tickets.length ? Math.round(resolvedTickets.length / tickets.length * 100) : 0,
      avgResolutionHours: avgResolveMs ? Math.round(avgResolveMs / 3600000 * 10) / 10 : null,
      dailyTickets:       (() => {
        const map = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now - i * msDay);
          map[dayKey(d.toISOString())] = 0;
        }
        tickets.forEach(t => { const k = dayKey(t.created_at); if (map[k] !== undefined) map[k]++; });
        return Object.entries(map).map(([date, count]) => ({ date, count }));
      })(),
    },
  });
});

module.exports = router;
