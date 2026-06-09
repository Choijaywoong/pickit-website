// 온보딩 1-b단계: 공유/분리 재고 선택 (hasInventory=Yes일 때만 표시)
// 결과: stockMode = 'shared' | 'split'
// 공유 → FR-009 자동 동기화 활성 / 분리 → 동기화 비활성 + 채널별 독립 예측

import { useState } from 'react';
import styles from './StepStockMode.module.css';
import { useLanguage } from '../../i18n';
import WeaveLogo from '../WeaveLogo';

export default function StepStockMode({ onNext }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);

  function handleSelect(mode) {
    setSelected(mode);
    setTimeout(() => onNext(mode), 180);
  }

  return (
    <div className={styles.container}>

      <div className={styles.logo}>
        <WeaveLogo />
      </div>

      <p className={styles.progress}>{t('ob1bProgress')}</p>
      <h1 className={styles.question}>{t('ob1bQuestion')}</h1>
      <p className={styles.desc}>{t('ob1bDesc')}</p>

      <div className={styles.cards}>

        {/* 공유 창고 */}
        <button
          className={`${styles.card} ${styles.cardShared} ${selected === 'shared' ? styles.cardActive : ''}`}
          onClick={() => handleSelect('shared')}
        >
          <div className={styles.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              <line x1="12" y1="12" x2="12" y2="17"/>
              <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>{t('ob1bSharedTitle')}</div>
          <div className={styles.cardSub}>{t('ob1bSharedSub')}</div>
        </button>

        {/* 채널별 분리 */}
        <button
          className={`${styles.card} ${selected === 'split' ? styles.cardActive : ''}`}
          onClick={() => handleSelect('split')}
        >
          <div className={styles.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="8" height="8" rx="1.5"/>
              <rect x="14" y="3" width="8" height="8" rx="1.5"/>
              <rect x="2" y="13" width="8" height="8" rx="1.5"/>
              <rect x="14" y="13" width="8" height="8" rx="1.5"/>
            </svg>
          </div>
          <div className={styles.cardTitle}>{t('ob1bSplitTitle')}</div>
          <div className={styles.cardSub}>{t('ob1bSplitSub')}</div>
        </button>

      </div>
    </div>
  );
}
