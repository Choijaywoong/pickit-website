// 온보딩 3단계: 채널 선택 (2개 이상 필수)
// 의류 버티컬 3사 선택 시 지원 범위 안내 모달 노출 (에이블리: 셀러스 타입 주의사항 추가)
// 색상 점·인라인 배지 없음 (ONBOARDING_UI_SPEC 3-3)
import { useState } from 'react';
import styles from './StepChannels.module.css';
import { useLanguage } from '../../i18n';
import Logo from '../Logo';
import ProgressBar from '../ProgressBar';

const CHANNELS = [
  { id: 'coupang', label: '쿠팡',               tier: 'core' },
  { id: 'naver',   label: '네이버 스마트스토어',  tier: 'core' },
  { id: 'cafe24',  label: '카페24',              tier: 'core' },
  { id: 'musinsa', label: '무신사',              tier: 'vertical', particle: '는' },
  { id: 'ably',    label: '에이블리',             tier: 'vertical', particle: '는' },
  { id: 'zigzag',  label: '지그재그',             tier: 'vertical', particle: '은' },
];

export default function StepChannels({ onNext, displayStep, totalSteps }) {
  const { t } = useLanguage();
  const [selected,     setSelected]     = useState([]);
  const [modalChannel, setModalChannel] = useState(null); // null | channel object

  function handleCardClick(ch) {
    if (selected.includes(ch.id)) {
      setSelected(prev => prev.filter(id => id !== ch.id));
    } else if (ch.tier === 'vertical') {
      setModalChannel(ch);
    } else {
      setSelected(prev => [...prev, ch.id]);
    }
  }

  function handleModalConfirm() {
    setSelected(prev => [...prev, modalChannel.id]);
    setModalChannel(null);
  }

  const canNext = selected.length >= 2;

  const countHint = selected.length === 0
    ? t('ob2Count0')
    : selected.length === 1
    ? t('ob2Count1')
    : t('ob2CountN', selected.length);

  return (
    <div className={styles.container}>

      <div className={styles.main}>
        {/* 로고 */}
        <div className={styles.logo}>
          <Logo size="md" />
        </div>

        {/* 진행바 */}
        <div className={styles.progressWrap}>
          <ProgressBar step={displayStep} totalSteps={totalSteps} stepName="채널 선택" />
        </div>

        <h1 className={styles.question}>{t('ob2Question')}</h1>
        <p className={styles.desc}>{t('ob2Desc')}</p>

        {/* 채널 카드 3×2 그리드 */}
        <div className={styles.grid}>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              className={`${styles.card} ${selected.includes(ch.id) ? styles.cardSelected : ''}`}
              onClick={() => handleCardClick(ch)}
            >
              <span className={styles.chLabel}>{ch.label}</span>
              {selected.includes(ch.id) && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>

        <p className={styles.countHint}>{countHint}</p>

        <button
          className={styles.nextBtn}
          disabled={!canNext}
          onClick={() => onNext(selected)}
        >
          {t('ob2Next')}
        </button>
      </div>

      {/* 의류 버티컬 지원 범위 안내 모달 */}
      {modalChannel && (
        <div className={styles.modalOverlay} onClick={() => setModalChannel(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {/* 헤더 */}
            <div className={styles.modalHeader}>
              <span className={styles.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
              <span>{modalChannel.label}{modalChannel.particle} 일부 기능만 지원해요</span>
            </div>

            {/* 지원 목록 */}
            <ul className={styles.featureList}>
              <li className={styles.featureOk}>
                <span className={styles.featureIcon}>✓</span>
                주문 조회
              </li>
              <li className={styles.featureOk}>
                <span className={styles.featureIcon}>✓</span>
                송장 전송
              </li>
              <li className={styles.featureNo}>
                <span className={styles.featureIcon}>✕</span>
                <span>
                  가격·재고 수정
                  <span className={styles.featureNote}> — 파트너센터에서 직접 처리</span>
                </span>
              </li>
              <li className={styles.featureNo}>
                <span className={styles.featureIcon}>✕</span>
                <span>
                  취소·반품
                  <span className={styles.featureNote}> — 파트너센터에서 직접 처리</span>
                </span>
              </li>
            </ul>

            {/* 에이블리 전용 추가 안내 */}
            {modalChannel.id === 'ably' && (
              <div className={styles.ablyNote}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                셀러스(Sellers) 입점 타입만 연동 가능합니다. 입점 타입을 먼저 확인해 주세요.
              </div>
            )}

            {/* 버튼 */}
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setModalChannel(null)}>취소</button>
              <button className={styles.confirmBtn} onClick={handleModalConfirm}>알겠어요, 선택</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
