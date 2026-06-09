// CS 챗봇 플로팅 버튼 — 우측 하단 고정, 클릭 시 CSChatWidget 토글
import { useState } from 'react';
import styles from './CS.module.css';
import CSChatWidget from './CSChatWidget';

export default function CSChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <CSChatWidget onClose={() => setIsOpen(false)} />}

      <button
        className={styles.floatBtn}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'CS 채팅 닫기' : 'CS 채팅 열기'}
      >
        {isOpen ? (
          /* 닫기 아이콘 (X) */
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          /* 말풍선 아이콘 */
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </>
  );
}
