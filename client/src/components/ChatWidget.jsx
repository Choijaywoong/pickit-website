import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWidget.module.css';
import SettingsModal from './SettingsModal';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const QUICK_ACTIONS = [
  '오늘 쿠팡 주문 보여줘',
  '오늘 전체 채널 주문 조회해줘',
  '이번 달 주문 엑셀로 뽑아줘',
  '블랙 L 재고 품절 처리해줘',
];

// 전체 6개 채널 목록 (연결 여부와 무관하게 항상 표시)
const ALL_CHANNELS = [
  { id: 'coupang', label: '쿠팡',              color: '#E50029' },
  { id: 'naver',   label: '네이버',             color: '#03C75A' },
  { id: 'cafe24',  label: '카페24',             color: '#2563EB' },
  { id: 'musinsa', label: '무신사',             color: '#222222' },
  { id: 'ably',    label: '에이블리',            color: '#FF6B9D' },
  { id: 'zigzag',  label: '지그재그',            color: '#FF5A5A' },
];

// FR-005: 서버 JSON → 셀러 PC에서 xlsx 생성 (규칙④)
function downloadExcel(excelData, filename) {
  const orders = excelData.orders || [];
  const rows = orders.flatMap((o) =>
    (o.items || []).map((i) => ({
      주문번호: o.orderId,
      구매자:   o.buyerName,
      결제일시: o.paidAt,
      주문상태: o.status,
      상품명:   i.productName,
      옵션:     i.optionValue,
      수량:     i.quantity,
      단가:     i.price,
      결제금액: o.totalPrice,
    }))
  );
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '주문내역');
  XLSX.writeFile(wb, filename);
}

export default function ChatWidget() {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [showSettings, setShowSettings]   = useState(false);

  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  // 온보딩에서 저장한 채널 목록 읽기
  const onboarding = JSON.parse(localStorage.getItem('pickit_onboarding') || '{}');
  const connectedChannels = onboarding.channels || [];

  // 활성화된 채널: 연결된 채널 중 사용자가 켜둔 것만 (처음엔 전부 ON)
  const [activeChannels, setActiveChannels] = useState(connectedChannels);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // textarea 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  function addMsg(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  function newConversation() {
    setMessages([]);
    setPendingAction(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    // addMsg 호출 전에 history를 먼저 스냅샷 (현재 messages 기준)
    // user/assistant 메시지만, UI 전용 필드 제거, 최근 20개로 제한 (토큰 절약)
    const history = messages
      .filter((m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        !m.isError &&
        !m.isConnectionError &&
        typeof m.content === 'string' &&
        m.content.trim()
      )
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-20);

    addMsg({ role: 'user', content: msg });
    setLoading(true);

    try {
      const res  = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, activeChannels, history }),
      });
      const data = await res.json();

      // 서버 에러 (400, 500 등)
      if (!res.ok) {
        addMsg({
          role: 'assistant',
          content: data.error || '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          isError: true,
        });
        return;
      }

      // 방화벽 보류
      if (data.held) {
        setPendingAction(data);
        addMsg({ role: 'assistant', content: data.reason, isDangerous: true, pendingData: data });
        return;
      }

      // FR-005: 엑셀 → 자동 다운로드
      if (data.excelData) {
        downloadExcel(data.excelData, data.filename);
        addMsg({ role: 'assistant', content: data.reply, excelFilename: data.filename });
      } else {
        addMsg({ role: 'assistant', content: data.reply || '처리가 완료되었습니다.' });
      }

      // FR-008: 연동 끊김
      if (data.connectionErrors?.length) {
        data.connectionErrors.forEach((e) =>
          addMsg({ role: 'assistant', content: e.message, isConnectionError: true, link: e.link })
        );
      }
    } catch {
      addMsg({ role: 'assistant', content: '서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요.', isError: true });
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChannels, messages]);

  async function confirmAction() {
    if (!pendingAction) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/tool/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingAction.toolInput, _confirmed: true }),
      });
      const data = await res.json();
      addMsg({
        role: 'assistant',
        content: data.error ? `처리 실패: ${data.message}` : '✅ 승인 완료. 처리되었습니다.',
      });
      setPendingAction(null);
    } catch {
      addMsg({ role: 'assistant', content: '처리 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }

  function cancelAction() {
    setPendingAction(null);
    addMsg({ role: 'assistant', content: '취소되었습니다.' });
  }

  // 채널 블록 토글: 연결된 채널만 켜고 끌 수 있다
  function toggleChannel(id) {
    if (!connectedChannels.includes(id)) return;
    setActiveChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.layout}>

      {/* ── 사이드바 ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.sidebarTop}>
          {/* 브랜드 */}
          <div className={styles.brand}>
            <div className={styles.brandLogo}>P</div>
            <div>
              <div className={styles.brandName}>PICKIT</div>
              <div className={styles.brandSub}>멀티채널 AI 운영</div>
            </div>
          </div>

          <button className={styles.newChatBtn} onClick={newConversation}>
            <span>+</span> 새 대화
          </button>
        </div>

        <div className={styles.sidebarBody}>
          <p className={styles.sectionLabel}>
            채널 선택
            {activeChannels.length > 0 && (
              <span className={styles.activeCount}>{activeChannels.length}개 활성</span>
            )}
          </p>

          <div className={styles.channelBlocks}>
            {ALL_CHANNELS.map((ch) => {
              const isConnected = connectedChannels.includes(ch.id);
              const isActive    = isConnected && activeChannels.includes(ch.id);

              // 블록 상태에 따른 클래스
              let blockClass = styles.chBlock;
              if (!isConnected)      blockClass += ` ${styles.chBlockUnlinked}`;
              else if (isActive)     blockClass += ` ${styles.chBlockOn}`;
              else                   blockClass += ` ${styles.chBlockOff}`;

              return (
                <button
                  key={ch.id}
                  className={blockClass}
                  style={isActive ? {
                    borderColor: ch.color,
                    backgroundColor: `${ch.color}18`, // 채널 색상 ~10% 투명도 배경
                  } : undefined}
                  onClick={() => toggleChannel(ch.id)}
                  disabled={!isConnected}
                  title={!isConnected ? '온보딩에서 선택되지 않은 채널입니다' : isActive ? '클릭하면 비활성화됩니다' : '클릭하면 활성화됩니다'}
                >
                  {/* 채널 컬러 점 */}
                  <span
                    className={styles.chDot}
                    style={{ background: isConnected ? ch.color : '#D1D5DB' }}
                  />

                  {/* 채널명 */}
                  <span className={styles.chLabel}>{ch.label}</span>

                  {/* 상태 표시 */}
                  {!isConnected ? (
                    <span className={styles.chBadgeUnlinked}>미연결</span>
                  ) : (
                    <span
                      className={`${styles.chToggle} ${isActive ? styles.chToggleOn : ''}`}
                      style={isActive ? { background: ch.color } : undefined}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 사이드바 하단: 설정 버튼 */}
        <div className={styles.sidebarFooter}>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M6.02 1.5a.5.5 0 00-.49.4l-.23 1.13A5.5 5.5 0 003.7 3.96l-1.1-.4a.5.5 0 00-.6.23l-1.5 2.6a.5.5 0 00.12.64l.9.72a5.5 5.5 0 000 1.5l-.9.72a.5.5 0 00-.12.64l1.5 2.6a.5.5 0 00.6.23l1.1-.4a5.5 5.5 0 001.6.93l.22 1.13a.5.5 0 00.49.4h3a.5.5 0 00.49-.4l.23-1.13a5.5 5.5 0 001.6-.93l1.1.4a.5.5 0 00.6-.23l1.5-2.6a.5.5 0 00-.12-.64l-.9-.72a5.5 5.5 0 000-1.5l.9-.72a.5.5 0 00.12-.64l-1.5-2.6a.5.5 0 00-.6-.23l-1.1.4a5.5 5.5 0 00-1.6-.93L9.48 1.9a.5.5 0 00-.49-.4h-3zm.98 1h1l.2 1.02.5.22a4.5 4.5 0 011.3.76l.44.35.98-.36.5.87-.8.64.07.54a4.5 4.5 0 010 1.2l-.07.54.8.64-.5.87-.98-.36-.44.35a4.5 4.5 0 01-1.3.76l-.5.22-.2 1.02h-1l-.2-1.02-.5-.22a4.5 4.5 0 01-1.3-.76l-.44-.35-.98.36-.5-.87.8-.64-.07-.54a4.5 4.5 0 010-1.2l.07-.54-.8-.64.5-.87.98.36.44-.35a4.5 4.5 0 011.3-.76l.5-.22.2-1.02z" fill="currentColor"/>
            </svg>
            채널 연결 설정
          </button>
        </div>
      </aside>

      {/* 설정 모달 */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── 메인 영역 ── */}
      <main className={styles.main}>

        {/* 상단 바 */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)} title="사이드바 열기/닫기">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="13" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
          <span className={styles.topbarTitle}>PICKIT Assistant</span>
        </header>

        {/* 메시지 영역 */}
        <div className={styles.messagesArea}>
          {isEmpty ? (
            /* 빈 상태: 환영 화면 */
            <div className={styles.emptyState}>
              <div className={styles.emptyLogo}>P</div>
              <h2 className={styles.emptyTitle}>무엇을 도와드릴까요?</h2>
              <p className={styles.emptyDesc}>
                주문 조회, 재고 수정, 송장 전송을<br />말 한마디로 처리하세요.
              </p>
              <div className={styles.quickGrid}>
                {QUICK_ACTIONS.map((q) => (
                  <button key={q} className={styles.quickBtn} onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 메시지 목록 */
            <div className={styles.msgList}>
              {messages.map((msg, i) => (
                <div key={i} className={`${styles.msgRow} ${styles[msg.role]}`}>

                  {/* AI 아바타 */}
                  {msg.role === 'assistant' && (
                    <div className={styles.avatar}>P</div>
                  )}

                  {/* 말풍선 */}
                  <div className={`
                    ${styles.bubble}
                    ${msg.isDangerous       ? styles.bubbleDanger     : ''}
                    ${msg.isConnectionError ? styles.bubbleConnection : ''}
                    ${msg.isError           ? styles.bubbleError      : ''}
                  `}>
                    {msg.role === 'assistant' ? (
                      <div className={styles.bubbleMarkdown}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className={styles.bubbleText}>{msg.content}</p>
                    )}

                    {/* 엑셀 다운로드 완료 뱃지 */}
                    {msg.excelFilename && (
                      <div className={styles.excelBadge}>
                        <span>📥</span> {msg.excelFilename} 저장 완료
                      </div>
                    )}

                    {/* 연동 끊김 링크 */}
                    {msg.isConnectionError && msg.link && (
                      <a href={msg.link} target="_blank" rel="noreferrer" className={styles.linkBtn}>
                        연동 설정 페이지 바로가기 →
                      </a>
                    )}

                    {/* 파트너센터 우회 링크 */}
                    {msg.pendingData?.link && !msg.isConnectionError && (
                      <a href={msg.pendingData.link} target="_blank" rel="noreferrer" className={styles.linkBtn}>
                        파트너센터 바로가기 →
                      </a>
                    )}

                    {/* 방화벽 승인 버튼 */}
                    {msg.isDangerous && !msg.pendingData?.link && (
                      <div className={styles.approvalRow}>
                        <button className={styles.btnApprove} onClick={confirmAction}>
                          최종 승인하기
                        </button>
                        <button className={styles.btnCancel} onClick={cancelAction}>
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 로딩 중 타이핑 애니메이션 */}
              {loading && (
                <div className={`${styles.msgRow} ${styles.assistant}`}>
                  <div className={styles.avatar}>P</div>
                  <div className={styles.bubble}>
                    <div className={styles.typingDots}>
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className={styles.inputWrap}>
          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              rows={1}
              disabled={loading}
              placeholder="주문 조회, 재고 수정, 송장 전송... 무엇이든 말씀하세요"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="전송 (Enter)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 15V3M9 3L4 8M9 3L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>Enter로 전송 &middot; Shift+Enter로 줄바꿈</p>
        </div>
      </main>
    </div>
  );
}
