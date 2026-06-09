// 지표 탭 — Weave 서비스 사업 운영 지표 (매출·가입자·활성유저·리텐션·CS)
import { useState, useEffect } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../../supabase';
import styles from './Admin.module.css';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

// 날짜 레이블을 간결하게 (2026-06-09 → 6/9)
function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}
// 주차 레이블 (2026-W23 → W23)
function shortWeek(w) { return w.split('-')[1]; }
// 월 레이블 (2026-06 → 6월)
function shortMonth(m) { return `${parseInt(m.split('-')[1])}월`; }
// 금액 포맷 (1234567 → 1,234,567원 / 큰 값은 만 단위)
function fmtKRW(n) {
  if (n === 0)       return '0원';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (n >= 10000)    return `${(n / 10000).toFixed(1)}만원`;
  return `${n.toLocaleString()}원`;
}

const PLAN_COLORS = { starter: '#1A6FD4', growth: '#38a169', enterprise: '#d69e2e', trial: '#718096' };

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={color ? { color } : {}}>
        {value ?? '—'}
      </div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#bbb', fontSize: 13 }}>
      {text}
    </div>
  );
}

export default function MetricsTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res   = await fetch('/api/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.error) { setError(json.error); return; }
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className={styles.loading}>지표 로딩 중...</div>;
  if (error)   return <div className={styles.loading} style={{ color: '#e53e3e' }}>오류: {error}</div>;
  if (!data)   return null;

  const { users, activity, retention, cs, revenue } = data;

  // 리텐션 퍼센트 계산
  const ret = (n) => retention.base
    ? Math.round(n / retention.base * 100)
    : null;

  const retentionChartData = [
    { name: 'D1 리텐션',  value: ret(retention.d1)  ?? 0 },
    { name: 'D7 리텐션',  value: ret(retention.d7)  ?? 0 },
    { name: 'D30 리텐션', value: ret(retention.d30) ?? 0 },
  ];

  const hasActivity = activity.totalEvents > 0;

  const hasRevenue = revenue.total > 0 || revenue.mrr > 0;

  return (
    <div>

      {/* ══ 매출 섹션 ════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.05em' }}>
        매출
      </div>
      <div className={styles.metricsGrid} style={{ marginBottom: 20 }}>
        <SummaryCard
          label="MRR (월 반복 매출)"
          value={fmtKRW(revenue.mrr)}
          sub={`유료 유저 ${revenue.payingUsers}명`}
          color="#1A6FD4"
        />
        <SummaryCard
          label="이번 달 실 매출"
          value={fmtKRW(revenue.thisMonth)}
          sub="이번 달 확정 결제 합산"
        />
        <SummaryCard
          label="이번 달 예상 매출"
          value={fmtKRW(revenue.projected)}
          sub="실 매출 + MRR 잔여 일수 추산"
          color={revenue.projected > revenue.thisMonth ? '#38a169' : undefined}
        />
        <SummaryCard
          label="ARPU"
          value={revenue.payingUsers ? fmtKRW(revenue.arpu) : '—'}
          sub="유료 유저 1인당 월 평균"
        />
      </div>

      <div className={styles.chartsGrid} style={{ marginBottom: 28 }}>
        {/* 월별 매출 추이 */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitle}>월별 매출 추이 (최근 6개월)</div>
          {!hasRevenue ? (
            <EmptyState text="결제 시스템 연결 후 자동으로 집계됩니다." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={revenue.monthly.map(d => ({ ...d, month: shortMonth(d.month) }))}
                margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38a169" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38a169" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 10000 ? `${v/10000}만` : v} />
                <Tooltip formatter={(v) => [fmtKRW(v), '매출']} />
                <Area type="monotone" dataKey="amount" stroke="#38a169" fill="url(#gGreen)" strokeWidth={2} dot={false} name="매출" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 플랜별 분포 */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>플랜별 구독 분포</div>
          {revenue.planBreakdown.length === 0 ? (
            <EmptyState text="구독 데이터 없음" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={revenue.planBreakdown}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  label={({ plan, percent }) => `${plan} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {revenue.planBreakdown.map((entry, i) => (
                    <Cell key={i} fill={PLAN_COLORS[entry.plan] ?? '#718096'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}명`, '구독자']} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 누적 매출 */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>누적 매출 요약</div>
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: '누적 총 매출',        value: fmtKRW(revenue.total) },
              { label: '현재 MRR',            value: fmtKRW(revenue.mrr) },
              { label: '유료 구독자',          value: `${revenue.payingUsers}명` },
              { label: 'ARPU',                value: revenue.payingUsers ? fmtKRW(revenue.arpu) : '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #f0f4fb', paddingBottom: 8 }}>
                <span style={{ color: '#888' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 유저·참여 섹션 ══════════════════════════════════════════════ */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.05em' }}>
        유저 & 참여
      </div>
      {/* ── 요약 카드 ─────────────────────────────────────────────────── */}
      <div className={styles.metricsGrid}>
        <SummaryCard label="총 가입자" value={users.total} sub="누적" />
        <SummaryCard label="이번 주 신규" value={users.newThisWeek} sub="최근 7일" color="#1A6FD4" />
        <SummaryCard
          label="활성 유저 (오늘)"
          value={activity.dau.at(-1)?.dau ?? 0}
          sub={hasActivity ? `누적 ${activity.uniqueUsers}명` : '세션 수집 중'}
          color="#38a169"
        />
        <SummaryCard
          label="CS 해결률"
          value={cs.total ? `${cs.resolutionRate}%` : '—'}
          sub={`총 ${cs.total}건 / 해결 ${cs.resolved}건`}
          color={cs.resolutionRate >= 80 ? '#38a169' : '#d69e2e'}
        />
      </div>

      <div className={styles.chartsGrid}>

        {/* ── 신규 가입자 추이 (30일) ──────────────────────────────────── */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitle}>신규 가입자 추이 (최근 30일)</div>
          {users.total === 0 ? (
            <EmptyState text="아직 가입자가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={users.dailySignups.map(d => ({ ...d, date: shortDate(d.date) }))}
                margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1A6FD4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1A6FD4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}명`, '신규 가입']} />
                <Area type="monotone" dataKey="count" stroke="#1A6FD4" fill="url(#gBlue)" strokeWidth={2} dot={false} name="신규 가입" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── DAU 추이 (30일) ──────────────────────────────────────────── */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitle}>일별 활성 유저 DAU (최근 30일)</div>
          {!hasActivity ? (
            <EmptyState text="아직 활동 데이터가 수집되지 않았습니다. 유저가 앱을 사용하면 자동 집계됩니다." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activity.dau.map(d => ({ ...d, date: shortDate(d.date) }))}
                margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}명`, 'DAU']} />
                <Bar dataKey="dau" fill="#1A6FD4" radius={[3, 3, 0, 0]} maxBarSize={28} name="DAU" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 리텐션 ──────────────────────────────────────────────────── */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>리텐션 (가입 후 재방문율)</div>
          {!hasActivity || retention.base === 0 ? (
            <EmptyState text="리텐션 데이터 수집 중" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={retentionChartData}
                  margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, '재방문율']} />
                  <Bar dataKey="value" fill="#38a169" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {retentionChartData.map((_, i) => (
                      <Cell key={i} fill={['#1A6FD4', '#38a169', '#d69e2e'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4 }}>
                기준 샘플: {retention.base}명
              </div>
            </>
          )}
        </div>

        {/* ── 주별 신규 가입자 ─────────────────────────────────────────── */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>주별 신규 가입 (최근 12주)</div>
          {users.total === 0 ? (
            <EmptyState text="아직 가입자가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={users.weeklySignups.map(d => ({ ...d, week: shortWeek(d.week) }))}
                margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}명`, '신규 가입']} />
                <Bar dataKey="count" fill="#1A6FD4" radius={[3, 3, 0, 0]} maxBarSize={24} name="신규 가입" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 이벤트 유형별 사용 현황 ─────────────────────────────────── */}
        {hasActivity && activity.eventBreakdown.length > 0 && (
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>기능 사용 현황</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                layout="vertical"
                data={activity.eventBreakdown.sort((a, b) => b.count - a.count)}
                margin={{ top: 4, right: 24, bottom: 0, left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="event" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [`${v}회`, '사용 횟수']} />
                <Bar dataKey="count" fill="#1A6FD4" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── CS 운영 현황 ─────────────────────────────────────────────── */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>CS 일별 접수 (최근 30일)</div>
          {cs.total === 0 ? (
            <EmptyState text="CS 문의가 아직 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cs.dailyTickets.map(d => ({ ...d, date: shortDate(d.date) }))}
                margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}건`, 'CS 접수']} />
                <Line type="monotone" dataKey="count" stroke="#e53e3e" strokeWidth={2} dot={false} name="CS 접수" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
