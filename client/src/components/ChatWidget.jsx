import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWidget.module.css';
import { logActivity } from '../logActivity';
import SettingsPanel      from './SettingsPanel';
import FirewallToast      from './FirewallToast';
import ResultPanel        from './ResultPanel';
import InvoicePanel       from './InvoicePanel';
import FileCard           from './FileCard';
import ConnectionBanner   from './ConnectionBanner';
import PredictionAlert    from './PredictionAlert';
import { showToast }      from './Toast';
import WeaveLogo          from './WeaveLogo';
import { authFetch }      from '../auth';
import { supabase }       from '../supabase';
import { useLanguage }    from '../i18n';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// QUICK_ACTIONS는 useLanguage()를 통해 컴포넌트 안에서 가져옴

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
  const { lang, setLang, t } = useLanguage();
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(() => window.innerWidth > 768);
  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [settingsInitChannel, setSettingsInitChannel] = useState(null);
  const [panelData, setPanelData]         = useState(null);  // ResultPanel 데이터
  const [panelOpen, setPanelOpen]         = useState(false); // ResultPanel 열림 여부
  const [panelMode, setPanelMode]         = useState('order'); // 'order' | 'excel' | 'invoice'
  const [invoiceOrders, setInvoiceOrders] = useState(null);  // InvoicePanel 주문 데이터
  const [connErrors, setConnErrors]       = useState([]);    // 연동 끊김 에러 목록
  const [predictions, setPredictions]     = useState([]);    // 발주 예측 알림

  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  // 온보딩에서 저장한 설정 읽기
  const onboarding = JSON.parse(localStorage.getItem('pickit_onboarding') || '{}');
  const connectedChannels = onboarding.channels || [];
  const hasInventory      = onboarding.hasInventory ?? false;
  const stockMode         = onboarding.stockMode ?? null; // 'shared' | 'split' | null

  // 활성화된 채널: 연결된 채널 중 사용자가 켜둔 것만 (처음엔 전부 ON)
  const [activeChannels, setActiveChannels] = useState(connectedChannels);
  const [channelSectionOpen, setChannelSectionOpen] = useState(true);
  const [chatSectionOpen, setChatSectionOpen]       = useState(true);
  const [chatHistory, setChatHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pickit_chat_history') || '[]'); }
    catch { return []; }
  });
  const [currentChatId, setCurrentChatId] = useState(() => Date.now().toString());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ConnectionBanner "다시 연결하기" → 설정 패널의 특정 채널 탭으로 열기
  useEffect(() => {
    function handleOpenSettings(e) {
      setSettingsInitChannel(e.detail?.tab || null);
      setSettingsOpen(true);
    }
    window.addEventListener('pickit-open-settings', handleOpenSettings);
    return () => window.removeEventListener('pickit-open-settings', handleOpenSettings);
  }, []);

  // 데모 패널에서 보내는 mock 메시지 수신
  useEffect(() => {
    function handleDemo(e) {
      const { userMsg, responses, orders, filename } = e.detail;
      if (userMsg) setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
      responses.forEach((resp) => {
        setMessages((prev) => [...prev, resp]);
        if (resp.isDangerous) {
          setPendingAction({
            toolInput:    {},
            channels:     resp.channels     || '전체',
            productCount: resp.productCount || '—',
            changeDesc:   resp.changeDesc   || '—',
            firewallType: resp.firewallType || '방화벽',
          });
        }
      });
      // 주문/엑셀 더미 데이터 → 마지막 assistant 메시지에 fileData 주입
      if (orders && orders.length && filename) {
        const mode = filename.includes('리포트') || filename.includes('엑셀') ? 'excel' : 'orders';
        const panelInfo = { orders, filename, mode };
        setPanelData(panelInfo);
        // 가장 마지막 assistant 메시지에 fileData를 붙임
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === 'assistant') {
              copy[i] = { ...copy[i], fileData: { orders, filename, count: orders.length, mode } };
              break;
            }
          }
          return copy;
        });
      }
    }
    window.addEventListener('pickit-demo', handleDemo);
    return () => window.removeEventListener('pickit-demo', handleDemo);
  }, []);

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

  function saveChatToHistory() {
    if (messages.length === 0) return;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg?.content?.slice(0, 28) || '새 대화';
    const entry = {
      id: currentChatId,
      title,
      messages: messages.slice(0, 50).map((m) => ({ role: m.role, content: m.content })),
      createdAt: Date.now(),
    };
    setChatHistory((prev) => {
      const updated = [entry, ...prev.filter((c) => c.id !== currentChatId)].slice(0, 20);
      try { localStorage.setItem('pickit_chat_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function newConversation() {
    saveChatToHistory();
    setCurrentChatId(Date.now().toString());
    setMessages([]);
    setPendingAction(null);
    setPanelData(null);
    setPanelOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function loadConversation(entry) {
    saveChatToHistory();
    setCurrentChatId(entry.id);
    setMessages(entry.messages || []);
    setPendingAction(null);
    setPanelData(null);
    setPanelOpen(false);
  }

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    logActivity('message_sent');

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

    // 송장 키워드 감지 → /api/invoice/pending으로 실제 주문 조회 후 InvoicePanel 오픈
    if (/송장/.test(msg)) {
      setLoading(true);
      try {
        const res  = await authFetch(`${API_BASE}/invoice/pending`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ channels: activeChannels }),
        });
        const data = await res.json();
        const orders     = data.orders || [];
        const selfOrders = orders.filter((o) => o.deliveryType === 'self');
        addMsg({
          role: 'assistant',
          content: `오늘 미처리 주문 ${selfOrders.length}건입니다. 우측에서 송장 번호를 입력해 주세요.`,
        });
        setInvoiceOrders(orders);
        setPanelMode('invoice');
        setPanelOpen(true);
      } catch {
        addMsg({ role: 'assistant', content: '주문 조회 중 오류가 발생했습니다. 채널 연동 상태를 확인해 주세요.', isError: true });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const res  = await authFetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, activeChannels, history, stockMode }),
      });

      // 401은 auth.js가 이미 'pickit-session-expired' 이벤트로 처리
      if (res.status === 401) { setLoading(false); return; }

      const data = await res.json();

      // 서버 에러 (400, 500 등) — 에러 유형별 메시지
      if (!res.ok) {
        const errText = data.error || '';
        let content;
        if (/API Key|설정되지 않았/.test(errText)) {
          content = t('errNoApiKey');
        } else if (/연동이 만료|401|403/.test(errText)) {
          content = t('errChannelAuth');
        } else if (/LLM|AI|Claude/.test(errText)) {
          content = t('errLlm');
        } else {
          content = errText || t('errUnexpected');
        }
        addMsg({ role: 'assistant', content, isError: true });
        return;
      }

      // 방화벽 보류
      if (data.held) {
        setPendingAction({
          ...data,
          channels:     data.channels     || '—',
          productCount: data.productCount || '—',
          changeDesc:   data.changeDesc   || '—',
          firewallType: data.firewallType || '방화벽',
        });
        addMsg({ role: 'assistant', content: data.reason, isDangerous: true });
        return;
      }

      // FR-005: 엑셀 추출 → 메시지에 fileData 포함
      if (data.excelData) {
        const orders   = data.excelData.orders || [];
        const filename = data.filename || 'weave_주문내역.xlsx';
        const panelInfo = { orders, filename, mode: 'excel' };
        setPanelData(panelInfo);
        setPanelMode('excel');
        addMsg({ role: 'assistant', content: data.reply || '엑셀 파일이 준비되었습니다.',
          fileData: { orders, filename, count: orders.length, mode: 'excel' } });
      } else if (data.orders?.length) {
        // 주문 조회 응답 → 메시지에 fileData 포함
        const now      = new Date();
        const filename = `${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}_전체채널_주문.xlsx`;
        const panelInfo = { orders: data.orders, filename, mode: 'orders' };
        setPanelData(panelInfo);
        setPanelMode('order');
        addMsg({ role: 'assistant', content: data.reply || '처리가 완료되었습니다.',
          fileData: { orders: data.orders, filename, count: data.orders.length, mode: 'orders' } });
      } else {
        addMsg({ role: 'assistant', content: data.reply || '처리가 완료되었습니다.' });
      }

      // FR-008: 연동 끊김 → ConnectionBanner 갱신
      if (data.connectionErrors?.length) {
        setConnErrors(data.connectionErrors);
        data.connectionErrors.forEach((e) =>
          addMsg({ role: 'assistant', content: e.message, isConnectionError: true, link: e.link })
        );
      }

      // 발주 예측 알림
      if (data.predictions?.length) {
        setPredictions(data.predictions);
      }
    } catch (e) {
      const isNetworkErr = e instanceof TypeError;
      addMsg({
        role: 'assistant',
        content: isNetworkErr ? t('errNetwork') : t('errUnexpected'),
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChannels, messages]);

  async function confirmAction() {
    if (!pendingAction) return;
    setLoading(true);
    try {
      const res  = await authFetch(`${API_BASE}/tool/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingAction.toolInput, _confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error || data.message || t('errUnexpected');
        addMsg({ role: 'assistant', content: msg, isError: true });
        showToast(t('toastError'), 'error');
      } else {
        addMsg({ role: 'assistant', content: t('approved') });
        showToast(t('toastApproved'), 'success');
      }
      setPendingAction(null);
    } catch {
      addMsg({ role: 'assistant', content: t('errUnexpected'), isError: true });
      showToast(t('toastError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function cancelAction() {
    setPendingAction(null);
    addMsg({ role: 'assistant', content: t('cancelled') });
    showToast(t('toastCancelled'), 'info');
  }

  // InvoicePanel 전송 완료 콜백 → 채팅에 채널별 결과 요약 출력
  function handleInvoiceSendResult(results) {
    // 채널별로 성공/실패 집계
    const summary = {};
    results.forEach(({ channel, status }) => {
      if (!summary[channel]) summary[channel] = { ok: 0, fail: 0 };
      if (status === 'success') summary[channel].ok++;
      else                      summary[channel].fail++;
    });

    const LABEL = { coupang: '쿠팡', naver: '네이버', cafe24: '카페24', musinsa: '무신사', ably: '에이블리', zigzag: '지그재그' };
    const okParts   = Object.entries(summary).filter(([, v]) => v.ok   > 0).map(([k, v]) => `${LABEL[k] || k} ${v.ok}건`);
    const failParts = Object.entries(summary).filter(([, v]) => v.fail > 0).map(([k, v]) => `${LABEL[k] || k} ${v.fail}건`);

    let content = okParts.length   ? `${okParts.join(', ')} 송장 전송 완료.` : '';
    if (failParts.length) content += ` ${failParts.join(', ')} 실패 — 재시도하시겠어요?`;
    if (content) addMsg({ role: 'assistant', content });
  }

  // 채널 블록 토글: 연결된 채널만 켜고 끌 수 있다
  function toggleChannel(id) {
    if (!connectedChannels.includes(id)) return;
    setActiveChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const isEmpty = messages.length === 0;

  const isMobile = () => window.innerWidth <= 768;

  return (
    <div className={`${styles.layout} ${panelOpen ? styles.layoutWithPanel : ''}`}>

      {/* 모바일: 사이드바 열릴 때 배경 오버레이 */}
      {sidebarOpen && isMobile() && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── 사이드바 ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.sidebarTop}>
          {/* 브랜드 */}
          <div className={styles.brand}>
            <WeaveLogo />
            <button
              className={styles.sidebarMenuBtn}
              onClick={() => setSidebarOpen((o) => !o)}
              title="사이드바 닫기"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="3.5"  width="16" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="1" y="13"   width="16" height="1.5" rx="0.75" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.sidebarBody}>
          {/* ── 채팅 섹션 ── */}
          <div className={styles.sidebarSection}>
            <button
              className={styles.sidebarSectionHeader}
              onClick={() => setChatSectionOpen((o) => !o)}
            >
              <span>채팅</span>
              <svg
                className={`${styles.chevron} ${chatSectionOpen ? styles.chevronOpen : ''}`}
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {chatSectionOpen && (
              <div className={styles.sidebarSectionContent}>
                <button className={styles.newChatBtn} onClick={newConversation}>
                  <span>+</span> {t('newChat')}
                </button>
                {chatHistory.length === 0 ? (
                  <p className={styles.emptyChatHint}>대화 내역이 없습니다.</p>
                ) : (
                  chatHistory.map((entry) => (
                    <button
                      key={entry.id}
                      className={`${styles.chatHistoryItem} ${entry.id === currentChatId ? styles.chatHistoryItemActive : ''}`}
                      onClick={() => loadConversation(entry)}
                    >
                      <span className={styles.chatHistoryTitle}>{entry.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── 채널 선택 섹션 ── */}
          <div className={styles.sidebarSection}>
            <button
              className={styles.sidebarSectionHeader}
              onClick={() => setChannelSectionOpen((o) => !o)}
            >
              <span className={styles.sectionLabelInner}>
                {t('channelSection')}
                {activeChannels.length > 0 && (
                  <span className={styles.activeCount}>{t('activeCount', activeChannels.length)}</span>
                )}
              </span>
              <svg
                className={`${styles.chevron} ${channelSectionOpen ? styles.chevronOpen : ''}`}
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {channelSectionOpen && (
              <div className={styles.sidebarSectionContent}>
                <div className={styles.channelBlocks}>
                  {ALL_CHANNELS.map((ch) => {
                    const isConnected = connectedChannels.includes(ch.id);
                    const isActive    = isConnected && activeChannels.includes(ch.id);

                    let blockClass = styles.chBlock;
                    if (!isConnected)  blockClass += ` ${styles.chBlockUnlinked}`;
                    else if (isActive) blockClass += ` ${styles.chBlockOn}`;
                    else               blockClass += ` ${styles.chBlockOff}`;

                    return (
                      <button
                        key={ch.id}
                        className={blockClass}
                        style={isActive ? {
                          borderColor: ch.color,
                          backgroundColor: `${ch.color}18`,
                        } : undefined}
                        onClick={() => toggleChannel(ch.id)}
                        disabled={!isConnected}
                        title={!isConnected ? '온보딩에서 선택되지 않은 채널입니다' : isActive ? '클릭하면 비활성화됩니다' : '클릭하면 활성화됩니다'}
                      >
                        <span
                          className={styles.chDot}
                          style={{ background: isConnected ? ch.color : '#D1D5DB' }}
                        />
                        <span className={styles.chLabel}>{ch.label}</span>
                        {!isConnected ? (
                          <span className={styles.chBadgeUnlinked}>{t('unlinked')}</span>
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
            )}
          </div>
        </div>

        {/* 사이드바 하단: 설정 + 로그아웃 + 기타 */}
        <div className={styles.sidebarFooter}>
          <button
            className={`${styles.settingsBtn} ${settingsOpen ? styles.settingsBtnActive : ''}`}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M6.02 1.5a.5.5 0 00-.49.4l-.23 1.13A5.5 5.5 0 003.7 3.96l-1.1-.4a.5.5 0 00-.6.23l-1.5 2.6a.5.5 0 00.12.64l.9.72a5.5 5.5 0 000 1.5l-.9.72a.5.5 0 00-.12.64l1.5 2.6a.5.5 0 00.6.23l1.1-.4a5.5 5.5 0 001.6.93l.22 1.13a.5.5 0 00.49.4h3a.5.5 0 00.49-.4l.23-1.13a5.5 5.5 0 001.6-.93l1.1.4a.5.5 0 00.6-.23l1.5-2.6a.5.5 0 00-.12-.64l-.9-.72a5.5 5.5 0 000-1.5l.9-.72a.5.5 0 00.12-.64l-1.5-2.6a.5.5 0 00-.6-.23l-1.1.4a5.5 5.5 0 00-1.6-.93L9.48 1.9a.5.5 0 00-.49-.4h-3zm.98 1h1l.2 1.02.5.22a4.5 4.5 0 011.3.76l.44.35.98-.36.5.87-.8.64.07.54a4.5 4.5 0 010 1.2l-.07.54.8.64-.5.87-.98-.36-.44.35a4.5 4.5 0 01-1.3.76l-.5.22-.2 1.02h-1l-.2-1.02-.5-.22a4.5 4.5 0 01-1.3-.76l-.44-.35-.98.36-.5-.87.8-.64-.07-.54a4.5 4.5 0 010-1.2l.07-.54-.8-.64.5-.87.98.36.44-.35a4.5 4.5 0 011.3-.76l.5-.22.2-1.02z" fill="currentColor"/>
            </svg>
            {t('settingsBtn')}
          </button>
          {supabase && (
            <button
              className={styles.logoutBtn}
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('pickit_onboarding');
              }}
              title={t('logoutBtn')}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('logoutBtn')}
            </button>
          )}
          <button
            className={styles.reOnboardBtn}
            onClick={() => {
              localStorage.removeItem('pickit_onboarding');
              window.dispatchEvent(new CustomEvent('pickit-restart-onboarding'));
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 6.5a5.5 5.5 0 015.5-5.5 5.5 5.5 0 014.4 2.2M12 6.5a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-4.4-2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10 2l1.2 1.7L13 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('reOnboardBtn')}
          </button>
          {/* 언어 토글 */}
          <button
            className={styles.sidebarLangToggle}
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            title="Switch language"
          >
            {lang === 'ko' ? 'EN' : '한'}
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className={styles.main}>

        {/* 설정 페이지 — settingsOpen 시 채팅 뷰 전체 대체 */}
        {settingsOpen && (
          <SettingsPanel
            onClose={() => { setSettingsOpen(false); setSettingsInitChannel(null); }}
            initialChannel={settingsInitChannel}
          />
        )}

        {/* 채팅 뷰 — 설정 열릴 때 숨김 (언마운트 아닌 hidden으로 메시지 유지) */}
        <div style={settingsOpen ? { display: 'none' } : { display: 'contents' }}>

        {/* 상단 바 */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)} title="사이드바 열기/닫기">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="13" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
          <span className={styles.topbarTitle}>{t('topbarTitle')}</span>
        </header>

        {/* 연동 끊김 배너 */}
        <ConnectionBanner errors={connErrors} />

        {/* 메시지 영역 */}
        <div className={styles.messagesArea}>
          {isEmpty ? (
            /* 빈 상태: 환영 화면 */
            <div className={styles.emptyState}>
              <div className={styles.emptyLogo}>P</div>
              <h2 className={styles.emptyTitle}>{t('emptyTitle')}</h2>
              <p className={styles.emptyDesc}>
                {t('emptyDesc').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <div className={styles.quickGrid}>
                {t('quickActions').map((q) => (
                  <button key={q} className={styles.quickBtn} onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 메시지 목록 */
            <div className={styles.msgList}>
              {/* 발주 예측 알림 (hasInventory = true 셀러만, FR-001 AC) */}
              {hasInventory && predictions.length > 0 && (
                <PredictionAlert
                  predictions={predictions}
                  onClickItem={(name) => setInput(`${name} 재고 조회해줘`)}
                />
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`${styles.msgRow} ${styles[msg.role]}`}>

                  {/* 말풍선 / 텍스트 영역 */}
                  <div className={`
                    ${styles.bubble}
                    ${msg.role === 'user'   ? styles.bubbleUser       : styles.bubbleAssistant}
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

                    {/* 파일 카드 — 주문/엑셀 응답 시 메시지마다 독립적으로 표시 */}
                    {msg.fileData && (
                      <FileCard
                        filename={msg.fileData.filename}
                        count={msg.fileData.count}
                        orders={msg.fileData.orders}
                        onExpand={() => {
                          setPanelData({
                            orders:   msg.fileData.orders,
                            filename: msg.fileData.filename,
                            mode:     msg.fileData.mode,
                          });
                          setPanelOpen(true);
                        }}
                      />
                    )}

                    {/* 연동 끊김 링크 */}
                    {msg.isConnectionError && msg.link && (
                      <a href={msg.link} target="_blank" rel="noreferrer" className={styles.linkBtn}>
                        연동 설정 페이지 바로가기 →
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* 로딩 중 타이핑 애니메이션 */}
              {loading && (
                <div className={`${styles.msgRow} ${styles.assistant}`}>
                  <div className={styles.typingDots}>
                    <span /><span /><span />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className={styles.inputWrap}>
          {/* FirewallToast — 입력창 위 절대 위치 (pendingAction 있을 때만) */}
          <FirewallToast
            data={pendingAction}
            onApprove={confirmAction}
            onCancel={cancelAction}
          />

          <div className={`${styles.inputBox} ${pendingAction ? styles.inputBoxLocked : ''}`}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              rows={1}
              disabled={loading || !!pendingAction}
              placeholder={pendingAction ? t('inputPlaceholderLocked') : t('inputPlaceholder')}
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
              disabled={loading || !input.trim() || !!pendingAction}
              title="전송 (Enter)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 15V3M9 3L4 8M9 3L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>{t('inputHint')}</p>
        </div>
        </div>{/* end 채팅 뷰 wrapper */}
      </main>

      {/* 우측 슬라이드 패널 — panelMode에 따라 주문결과 또는 송장입력 */}
      {panelMode === 'invoice' ? (
        <InvoicePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          orders={invoiceOrders}
          onSendResult={handleInvoiceSendResult}
        />
      ) : (
        <ResultPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          data={panelData}
          connectedChannels={connectedChannels}
        />
      )}
    </div>
  );
}
