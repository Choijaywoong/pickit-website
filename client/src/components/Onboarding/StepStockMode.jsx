// 온보딩 2단계: 재고 관리 방식 선택 (직접보유 셀러만 진입, totalSteps 항상 4)
// 카드 선택 즉시 다음 단계로 진행. 하단 고정 안내: 나중에 설정에서 변경 가능.
import { useState } from 'react';
import styles from './StepStockMode.module.css';
import { useLanguage } from '../../i18n';
import Logo from '../Logo';
import ProgressBar from '../ProgressBar';

export default function StepStockMode({ onNext, onBack }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);

  function handleSelect(mode) {
    setSelected(mode);
  }

  return (
    <div className={styles.container}>

      {/* 메인 콘텐츠 — flex:1 로 하단 안내를 아래로 밀어냄 */}
      <div className={styles.main}>

        {/* 뒤로가기 */}
        {onBack && (
          <button className={styles.backBtn} onClick={onBack} title="이전 단계">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L7.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* 로고 */}
        <div className={styles.logo}>
          <Logo size="md" />
        </div>

        {/* 진행바 */}
        <div className={styles.progressWrap}>
          <ProgressBar step={2} totalSteps={4} stepName="재고 관리 방식" />
        </div>

        {/* 질문 */}
        <h1 className={styles.question}>{t('ob1bQuestion')}</h1>
        <p className={styles.desc}>{t('ob1bDesc')}</p>

        {/* 선택 카드 */}
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

        <button
          className={styles.nextBtn}
          disabled={!selected}
          onClick={() => onNext(selected)}
        >
          {t('ob2Next')}
        </button>
      </div>

      {/* 하단 고정 안내 */}
      <div className={styles.footer}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        관리 방식은 나중에 설정에서 언제든 바꿀 수 있어요
      </div>

    </div>
  );
}
