// CS 문의 탭 — 티켓 목록 + 대화 상세 + 답변 + 상태변경
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import styles from './Admin.module.css';

const STATUS_INFO = {
  open:        { label: '대기중', cls: 'ticketCardOpen' },
  in_progress: { label: '처리중', cls: 'ticketCardProgress' },
  resolved:    { label: '해결됨', cls: 'ticketCardResolved' },
};

const ISSUE_INFO = {
  bug:         { label: '버그',   cls: 'badgeBug' },
  feature:     { label: '기능요청', cls: 'badgeFeature' },
  integration: { label: '연동',   cls: 'badgeIntegration' },
};

function statusInfo(s)  { return STATUS_INFO[s]  || STATUS_INFO.open; }
function issueInfo(t)   { return ISSUE_INFO[t]   || { label: '기타', cls: 'badgeOther' }; }

function formatTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return '방금';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

export default function CSTab() {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [reply,    setReply]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { loadTickets(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.id]);

  async function loadTickets() {
    setLoading(true);
    try {
      const token = await getToken();
      const res   = await fetch('/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error('[CSTab] 티켓 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }

  async function patchTicket(id, body) {
    const token = await getToken();
    const res   = await fetch(`/api/admin/tickets/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ticket) {
      setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
      setSelected(data.ticket);
    }
    return data.ticket;
  }

  async function handleSendReply(closeTicket) {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await patchTicket(selected.id, {
        reply:  reply.trim(),
        status: closeTicket ? 'resolved' : undefined,
      });
      setReply('');
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!selected) return;
    setSending(true);
    try { await patchTicket(selected.id, { status: newStatus }); }
    finally { setSending(false); }
  }

  const counts = {
    all:         tickets.length,
    open:        tickets.filter(t => !t.status || t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
  };

  const filtered = tickets.filter(t => {
    if (filter === 'all')  return true;
    if (filter === 'open') return !t.status || t.status === 'open';
    return t.status === filter;
  });

  const FILTERS = [
    { key: 'all',         label: `전체 (${counts.all})` },
    { key: 'open',        label: `대기중 (${counts.open})` },
    { key: 'in_progress', label: `처리중 (${counts.in_progress})` },
    { key: 'resolved',    label: `해결됨 (${counts.resolved})` },
  ];

  return (
    <div>
      {/* 필터 바 */}
      <div className={styles.filterBar}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button className={styles.filterBtn} style={{ marginLeft: 'auto' }} onClick={loadTickets}>
          새로고침
        </button>
      </div>

      <div className={styles.csLayout}>

        {/* 좌측: 티켓 목록 */}
        <div className={styles.ticketList}>
          {loading && <div className={styles.loading}>로딩 중...</div>}
          {!loading && filtered.length === 0 && (
            <div className={styles.loading}>티켓이 없습니다.</div>
          )}
          {filtered.map(ticket => {
            const si = statusInfo(ticket.status);
            const ii = issueInfo(ticket.issue_type);
            return (
              <div
                key={ticket.id}
                className={[
                  styles.ticketCard,
                  styles[si.cls],
                  selected?.id === ticket.id ? styles.ticketCardActive : '',
                ].join(' ')}
                onClick={() => { setSelected(ticket); setReply(''); }}
              >
                <div className={styles.ticketMeta}>
                  <span className={styles[ii.cls]}>{ii.label}</span>
                  <span className={styles.statusLabel}>{si.label}</span>
                </div>
                <div className={styles.ticketEmail}>
                  {ticket.user_email || '이메일 미입력'}
                </div>
                <div className={styles.ticketTime}>{formatTime(ticket.created_at)}</div>
              </div>
            );
          })}
        </div>

        {/* 우측: 대화 상세 */}
        <div className={styles.detailPanel}>
          {!selected ? (
            <div className={styles.detailEmpty}>티켓을 선택하면 대화 내용이 표시됩니다.</div>
          ) : (
            <>
              {/* 상세 헤더 */}
              <div className={styles.detailHeader}>
                <span className={styles[issueInfo(selected.issue_type).cls]}>
                  {issueInfo(selected.issue_type).label}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {selected.user_email || '이메일 미입력'}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selected.status !== 'resolved' && (
                    <>
                      {(!selected.status || selected.status === 'open') && (
                        <button
                          className={styles.btnProgress}
                          onClick={() => handleStatusChange('in_progress')}
                          disabled={sending}
                          style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                          처리중
                        </button>
                      )}
                      <button
                        className={styles.btnResolve}
                        onClick={() => handleStatusChange('resolved')}
                        disabled={sending}
                        style={{ padding: '5px 12px', fontSize: 12 }}
                      >
                        완료
                      </button>
                    </>
                  )}
                  {selected.status === 'resolved' && (
                    <span style={{ fontSize: 12, color: '#38a169', fontWeight: 600 }}>해결됨</span>
                  )}
                </div>
              </div>

              {/* 메시지 버블 */}
              <div className={styles.detailMessages}>
                {(selected.messages || []).map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={i}>
                        <div className={styles.msgRole}>사용자</div>
                        <div className={styles.msgUser}>{msg.content}</div>
                      </div>
                    );
                  }
                  if (msg.role === 'assistant') {
                    return (
                      <div key={i}>
                        <div className={styles.msgRole}>CS 봇</div>
                        <div className={styles.msgCs}>{msg.content}</div>
                      </div>
                    );
                  }
                  if (msg.role === 'admin') {
                    return (
                      <div key={i}>
                        <div className={styles.msgRole}>관리자 {msg.timestamp ? `· ${formatTime(msg.timestamp)}` : ''}</div>
                        <div className={styles.msgAdmin}>{msg.content}</div>
                      </div>
                    );
                  }
                  return null;
                })}
                <div ref={bottomRef} />
              </div>

              {/* 답변 입력 */}
              {selected.status !== 'resolved' ? (
                <div className={styles.replyArea} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <textarea
                    className={styles.replyTextarea}
                    placeholder="답변을 입력하세요..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(false); }
                    }}
                    rows={2}
                    style={{ flex: 1, minHeight: 52, marginBottom: 0 }}
                  />
                  <button
                    className={styles.btnResolve}
                    onClick={() => handleSendReply(false)}
                    disabled={sending || !reply.trim()}
                    style={{ flexShrink: 0, padding: '0 20px', height: 52, borderRadius: 8, fontSize: 14 }}
                  >
                    {sending ? '...' : '전송'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#38a169', borderTop: '1px solid #f0f4fb' }}>
                  해결된 티켓입니다.
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
