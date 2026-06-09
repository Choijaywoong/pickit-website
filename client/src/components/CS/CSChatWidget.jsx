// CS 채팅 팝업 위젯 — AI 1차 답변, 에스컬레이션, 이메일 수집 흐름 담당
import { useState, useRef, useEffect } from 'react';
import styles from './CS.module.css';

const ISSUE_TAGS = [
  { key: 'bug',         label: '🐛 버그 신고' },
  { key: 'feature',     label: '💡 기능 제안' },
  { key: 'integration', label: '🔗 연동 문의' },
  { key: 'other',       label: '기타' },
];

const GREETING = '안녕하세요! PICKIT 고객센터입니다 👋\n문의 유형을 선택하거나 바로 메시지를 입력해 주세요.';

export default function CSChatWidget({ onClose }) {
  const [messages,     setMessages]     = useState([{ role: 'cs', content: GREETING }]);
  const [inputText,    setInputText]    = useState('');
  const [issueType,    setIssueType]    = useState(null);   // 선택된 유형 태그
  const [showTags,     setShowTags]     = useState(true);   // 최초 1회만
  const [isLoading,    setIsLoading]    = useState(false);
  const [escalated,    setEscalated]    = useState(false);  // 에스컬레이션 발생 여부
  const [showEmail,    setShowEmail]    = useState(false);  // 이메일 수집 UI
  const [emailValue,   setEmailValue]   = useState('');
  const [ticketId,     setTicketId]     = useState(null);   // 에스컬레이션 티켓 id
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showEmail]);

  function addMessage(role, content) {
    setMessages(prev => [...prev, { role, content }]);
  }

  function handleTagSelect(tagKey) {
    setIssueType(tagKey);
    setShowTags(false);
    const label = ISSUE_TAGS.find(t => t.key === tagKey)?.label ?? tagKey;
    addMessage('user', label + ' 문의입니다.');
    sendToApi(label + ' 관련 문의입니다.', tagKey);
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    setShowTags(false);
    addMessage('user', text);
    sendToApi(text, issueType);
  }

  async function sendToApi(userText, type) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cs/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   userText,
          issueType: type,
          history:   messages,
        }),
      });
      const data = await res.json();

      if (data.escalate) {
        addMessage('cs', '담당자에게 전달했어요. 빠르게 확인 후 연락드리겠습니다 🙏\n추가로 전달할 내용이 있다면 계속 입력해 주세요.');
        if (!escalated) {
          setEscalated(true);
          if (data.ticketId) setTicketId(data.ticketId);
          setShowEmail(true);
        }
      } else {
        addMessage('cs', data.reply);
      }
    } catch {
      // API 호출 실패 → 자동 에스컬레이션 (규칙: Claude 없어도 CS 수집은 되어야 함)
      addMessage('cs', '담당자에게 전달했어요. 빠르게 확인 후 연락드리겠습니다 🙏\n추가로 전달할 내용이 있다면 계속 입력해 주세요.');
      if (!escalated) {
        setEscalated(true);
        setShowEmail(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setShowEmail(false);
    const email = emailValue.trim();
    if (email && ticketId) {
      // 서버에 이메일 업데이트 (실패해도 UX에 영향 없음)
      fetch(`/api/cs/ticket/${ticketId}/email`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      }).catch(() => {});
      addMessage('cs', `이메일(${email})을 기록했어요. 확인 후 연락드리겠습니다.`);
    } else {
      addMessage('cs', '알겠습니다. 문의 내용은 저장됐으니 걱정 마세요.');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.widget} role="dialog" aria-label="PICKIT 고객센터">
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            PICKIT 고객센터
          </span>
          <span className={styles.headerSub}>무엇이든 물어보세요</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? styles.bubbleUser : styles.bubbleCs}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className={styles.bubbleCs}>
            <div className={styles.dots}>
              <span/><span/><span/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* 유형 태그 버튼 (최초 1회만) */}
      {showTags && (
        <div className={styles.tagRow}>
          {ISSUE_TAGS.map(tag => (
            <button
              key={tag.key}
              className={styles.tagBtn}
              onClick={() => handleTagSelect(tag.key)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {/* 이메일 수집 (에스컬레이션 직후 1회만) */}
      {showEmail && (
        <div className={styles.emailRow}>
          <div className={styles.bubbleCs} style={{ padding: '0 0 4px', fontSize: 12 }}>
            답변을 받으실 이메일을 남겨주시면 확인 후 연락드릴게요.<br/>
            <span style={{ color: '#999' }}>(선택사항 — 건너뛰어도 됩니다)</span>
          </div>
          <input
            className={styles.emailInput}
            type="email"
            placeholder="example@email.com"
            value={emailValue}
            onChange={e => setEmailValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
          />
          <div className={styles.emailBtns}>
            <button className={styles.emailConfirmBtn} onClick={handleEmailSubmit}>확인</button>
            <button className={styles.emailSkipBtn}    onClick={handleEmailSubmit}>건너뛰기</button>
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div className={styles.inputRow}>
        <textarea
          ref={inputRef}
          className={styles.textInput}
          rows={1}
          placeholder="메시지를 입력하세요..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          aria-label="전송"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
