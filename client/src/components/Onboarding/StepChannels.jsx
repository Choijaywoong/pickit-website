import { useState } from 'react';
import styles from './StepChannels.module.css';

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

  return (
    <div className={styles.container}>

      {/* 로고 */}
      <div className={styles.logo}>
        <span className={styles.logoMark}>P</span>
        <span className={styles.logoText}>PICKIT</span>
      </div>

      {/* 진행 표시 */}
      <p className={styles.progress}>2 / 2 단계</p>

      <h1 className={styles.question}>운영 중인 채널을 선택해 주세요</h1>
      <p className={styles.desc}>2개 이상 선택 · 나중에 설정에서 언제든 변경 가능합니다.</p>

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
              {/* 채널 컬러 점 */}
              <span
                className={styles.dot}
                style={{ background: CHANNEL_COLOR[ch.id] }}
              />

              <span className={styles.chLabel}>{ch.label}</span>

              {/* 티어 뱃지 */}
              {ch.tier === 'vertical' && (
                <span className={styles.tierBadge}>조회·송장</span>
              )}

              {/* 선택 체크 */}
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
            에이블리는 '셀러스(Sellers)' 입점 타입만 연동 가능합니다
          </div>
          <p className={styles.ablyWarnBody}>
            입점 타입을 먼저 확인해 주세요. 다른 타입은 연동되지 않습니다.
          </p>
        </div>
      )}

      {/* 선택 카운트 */}
      <p className={styles.countHint}>
        {selected.length === 0
          ? '채널을 2개 이상 선택해 주세요'
          : selected.length === 1
          ? '1개 선택됨 — 1개 더 선택해야 시작할 수 있습니다'
          : `${selected.length}개 선택됨`}
      </p>

      <button
        className={styles.startBtn}
        disabled={!canStart}
        onClick={() => onNext(selected)}
      >
        다음 — API 연결하기 →
      </button>
    </div>
  );
}
