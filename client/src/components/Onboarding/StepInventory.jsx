import { useState } from 'react';
import styles from './StepInventory.module.css';
import { useLanguage } from '../../i18n';

export default function StepInventory({ onNext }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);

  function handleSelect(hasInventory) {
    setSelected(hasInventory);
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
      <p className={styles.progress}>{t('ob1Progress')}</p>

      {/* 질문 */}
      <h1 className={styles.question}>{t('ob1Question')}</h1>
      <p className={styles.desc}>{t('ob1Desc')}</p>

      {/* 선택 카드 */}
      <div className={styles.cards}>

        <button
          className={`${styles.card} ${styles.cardYes} ${selected === true ? styles.cardActive : ''}`}
          onClick={() => handleSelect(true)}
        >
          <div className={styles.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.29 7 12 12 20.71 7"/>
              <line x1="12" y1="22" x2="12" y2="12"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>{t('ob1YesTitle')}</div>
          <div className={styles.cardSub}>{t('ob1YesSub')}</div>
        </button>

        <button
          className={`${styles.card} ${styles.cardNo} ${selected === false ? styles.cardActive : ''}`}
          onClick={() => handleSelect(false)}
        >
          <div className={styles.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>{t('ob1NoTitle')}</div>
          <div className={styles.cardSub}>{t('ob1NoSub')}</div>
        </button>

      </div>
    </div>
  );
}
