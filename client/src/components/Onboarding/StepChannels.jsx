import { useState } from 'react';
import styles from './StepChannels.module.css';
import { useLanguage } from '../../i18n';
import WeaveLogo from '../WeaveLogo';

const CHANNELS = [
  { id: 'coupang', label: '쿠팡',              tier: 'core' },
  { id: 'naver',   label: '네이버 스마트스토어', tier: 'core' },
  { id: 'cafe24',  label: '카페24',             tier: 'core' },
  { id: 'musinsa', label: '무신사',             tier: 'vertical' },
  { id: 'ably',    label: '에이블리',            tier: 'vertical' },
  { id: 'zigzag',  label: '지그재그',            tier: 'vertical' },
];

const CHANNEL_COLOR = {
  coupang: '#E50029',
  naver:   '#03C75A',
  cafe24:  '#2563EB',
  musinsa: '#222222',
  ably:    '#FF6B9D',
  zigzag:  '#FF5A5A',
};

export default function StepChannels({ onNext }) {
  const { t } = useLanguage();
  const [selected, setSelected]       = useState([]);
  const [ablyWarning, setAblyWarning] = useState(false);

  function toggle(id) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      if (id === 'ably' && !prev.includes('ably')) setAblyWarning(true);
      if (id === 'ably' && prev.includes('ably'))  setAblyWarning(false);
      return next;
    });
  }

  const canStart = selected.length >= 2;

  const countHint = selected.length === 0
    ? t('ob2Count0')
    : selected.length === 1
    ? t('ob2Count1')
    : t('ob2CountN', selected.length);

  return (
    <div className={styles.container}>

      {/* 로고 */}
      <div className={styles.logo}>
        <WeaveLogo />
      </div>

      {/* 진행 표시 */}
      <p className={styles.progress}>{t('ob2Progress')}</p>

      <h1 className={styles.question}>{t('ob2Question')}</h1>
      <p className={styles.desc}>{t('ob2Desc')}</p>

      {/* 채널 카드 그리드 */}
      <div className={styles.grid}>
        {CHANNELS.map((ch) => {
          const isSelected = selected.includes(ch.id);
          const isAbly     = ch.id === 'ably';

          let cardClass = styles.card;
          if (isSelected && isAbly) cardClass += ` ${styles.cardAbly}`;
          else if (isSelected)      cardClass += ` ${styles.cardSelected}`;

          return (
            <button
              key={ch.id}
              className={cardClass}
              onClick={() => toggle(ch.id)}
              style={isSelected && !isAbly ? { borderColor: CHANNEL_COLOR[ch.id] } : undefined}
            >
              <span className={styles.dot} style={{ background: CHANNEL_COLOR[ch.id] }} />
              <span className={styles.chLabel}>{ch.label}</span>
              {ch.tier === 'vertical' && (
                <span className={styles.tierBadge}>{t('ob2TierBadge')}</span>
              )}
              {isSelected && <span className={styles.check}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* 에이블리 경고 박스 */}
      {ablyWarning && (
        <div className={styles.ablyWarn}>
          <div className={styles.ablyWarnHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {t('ob2AblyWarn')}
          </div>
          <p className={styles.ablyWarnBody}>{t('ob2AblyWarnBody')}</p>
        </div>
      )}

      {/* 선택 카운트 */}
      <p className={styles.countHint}>{countHint}</p>

      <button
        className={styles.startBtn}
        disabled={!canStart}
        onClick={() => onNext(selected)}
      >
        {t('ob2Next')}
      </button>
    </div>
  );
}
