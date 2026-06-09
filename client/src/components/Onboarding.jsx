import { useState } from 'react';
import styles from './Onboarding.module.css';
import WeaveLogo from './WeaveLogo';

const CHANNELS = [
  { id: 'coupang', label: '쿠팡',              tier: 'core' },
  { id: 'naver',   label: '네이버 스마트스토어', tier: 'core' },
  { id: 'cafe24',  label: '카페24',            tier: 'core' },
  { id: 'musinsa', label: '무신사',            tier: 'vertical' },
  { id: 'ably',    label: '에이블리',           tier: 'vertical' },
  { id: 'zigzag',  label: '지그재그',           tier: 'vertical' },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep]                 = useState(1); // 1: 재고보유 질문, 2: 채널 선택
  const [hasStock, setHasStock]         = useState(null);
  const [selectedChannels, setSelected] = useState([]);
  const [ablyWarning, setAblyWarning]   = useState(false);

  function handleStockAnswer(answer) {
    setHasStock(answer);
    setStep(2);
  }

  function toggleChannel(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    // 에이블리 선택 시 안내 팝업 (PRD FR-001)
    if (id === 'ably' && !selectedChannels.includes('ably')) {
      setAblyWarning(true);
    }
  }

  function handleComplete() {
    if (selectedChannels.length === 0) return;
    onComplete({ hasStock, channels: selectedChannels });
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <WeaveLogo />
        </div>
        <p className={styles.tagline}>멀티채널 AI 운영 도우미</p>

        {/* ── Step 1: 재고 보유 여부 ── */}
        {step === 1 && (
          <div className={styles.step}>
            <h2 className={styles.question}>재고를 직접 보유하고 계신가요?</h2>
            <p className={styles.hint}>
              재고를 직접 보유하시면 발주 예측 알림을 받으실 수 있어요.
            </p>
            <div className={styles.btnRow}>
              <button className={styles.btnYes} onClick={() => handleStockAnswer(true)}>
                네, 직접 보유해요
              </button>
              <button className={styles.btnNo} onClick={() => handleStockAnswer(false)}>
                아니요 (위탁·드롭쉬핑)
              </button>
            </div>
            {hasStock === false && (
              <p className={styles.notice}>
                발주 예측 알림은 비활성화됩니다. 추후 재고 도미노 기능이 지원될 예정입니다.
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: 채널 선택 ── */}
        {step === 2 && (
          <div className={styles.step}>
            <h2 className={styles.question}>운영 중인 채널을 선택해 주세요</h2>
            <p className={styles.hint}>나중에 설정에서 언제든지 변경할 수 있어요.</p>

            <div className={styles.channelGroup}>
              <p className={styles.groupLabel}>핵심 채널 (조회·수정·송장 전부 지원)</p>
              {CHANNELS.filter((c) => c.tier === 'core').map((c) => (
                <label key={c.id} className={styles.channelItem}>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(c.id)}
                    onChange={() => toggleChannel(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            <div className={styles.channelGroup}>
              <p className={styles.groupLabel}>의류 버티컬 (조회·송장만 지원, 수정은 링크 안내)</p>
              {CHANNELS.filter((c) => c.tier === 'vertical').map((c) => (
                <label key={c.id} className={styles.channelItem}>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(c.id)}
                    onChange={() => toggleChannel(c.id)}
                  />
                  <span>{c.label}</span>
                  {c.id === 'ably' && <span className={styles.badge}>셀러스 타입만</span>}
                </label>
              ))}
            </div>

            {/* 에이블리 경고 팝업 */}
            {ablyWarning && (
              <div className={styles.warning}>
                <strong>에이블리 안내</strong>
                <p>
                  에이블리는 <b>'셀러스(Sellers)'</b> 입점 타입만 API 연동이 가능합니다.
                  <br />입점 타입을 먼저 확인해 주세요.
                </p>
                <button className={styles.btnClose} onClick={() => setAblyWarning(false)}>
                  확인했어요
                </button>
              </div>
            )}

            <button
              className={styles.btnStart}
              onClick={handleComplete}
              disabled={selectedChannels.length === 0}
            >
              시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
