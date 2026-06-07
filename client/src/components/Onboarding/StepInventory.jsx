import { useState } from 'react';
import styles from './StepInventory.module.css';

export default function StepInventory({ onNext }) {
  const [selected, setSelected] = useState(null); // true | false | null

  function handleSelect(hasInventory) {
    setSelected(hasInventory);
    // 카드 선택 시각 피드백(180ms) 후 자동으로 Step B 이동
    setTimeout(() => onNext(hasInventory), 180);
  }

  return (
    <div className={styles.container}>

      {/* 로고 */}
      <div className={styles.logo}>
        <span className={styles.logoMark}>P</span>
        <span className={styles.logoText}>PICKIT</span>
      </div>

      {/* 진행 표시 */}
      <p className={styles.progress}>1 / 2 단계</p>

      {/* 질문 */}
      <h1 className={styles.question}>재고를 직접 보유하고 계신가요?</h1>
      <p className={styles.desc}>셀러 유형에 맞는 기능이 활성화됩니다.</p>

      {/* 선택 카드 */}
      <div className={styles.cards}>

        {/* 카드 A — 네, 보유합니다 (파란 테두리 강조 — 권장 옵션) */}
        <button
          className={`${styles.card} ${styles.cardYes} ${selected === true ? styles.cardActive : ''}`}
          onClick={() => handleSelect(true)}
        >
          <div className={styles.iconWrap}>
            {/* ti-package 대용 SVG */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.29 7 12 12 20.71 7"/>
              <line x1="12" y1="22" x2="12" y2="12"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>네, 보유합니다</div>
          <div className={styles.cardSub}>
            사입·자체브랜드 셀러.<br />
            발주 예측 알림이 켜집니다.
          </div>
        </button>

        {/* 카드 B — 아니요 (기본 회색 테두리) */}
        <button
          className={`${styles.card} ${styles.cardNo} ${selected === false ? styles.cardActive : ''}`}
          onClick={() => handleSelect(false)}
        >
          <div className={styles.iconWrap}>
            {/* ti-truck-delivery 대용 SVG */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>아니요</div>
          <div className={styles.cardSub}>
            위탁·드롭쉬핑.<br />
            재고 도미노 기능 추후 지원 예정.
          </div>
        </button>

      </div>
    </div>
  );
}
