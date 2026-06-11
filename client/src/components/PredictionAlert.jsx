// 발주 예측 알림 카드 — 채팅 메시지 목록 상단 (hasInventory = true 셀러만)
import styles from './PredictionAlert.module.css';

/**
 * props:
 *   predictions — [{ productName, option, daysLeft, recommendQty, channel? }]
 *                 channel은 split(분리재고) 셀러일 때 어느 채널의 예측인지 표시
 *   coldStart   — { daysUntilReady: number } | null
 *                 데이터 누적 중일 때 예측 대신 카운트다운 안내를 표시 (FR-006)
 *   onClickItem — (productName, channel?) => void  채팅창에 조회 명령 자동 입력
 */
export default function PredictionAlert({ predictions = [], coldStart = null, onClickItem }) {
  // 콜드스타트: 데이터 누적 중 안내 (실제 예측 카드보다 우선 표시)
  if (coldStart) {
    return (
      <div className={styles.wrap}>
        <div className={styles.coldStartCard}>
          <span className={styles.coldIcon}>📊</span>
          <div className={styles.text}>
            <span className={styles.coldTitle}>발주 예측 준비 중</span>
            <span className={styles.coldDesc}>
              {coldStart.daysUntilReady != null
                ? `판매 데이터 누적 중 — 약 ${coldStart.daysUntilReady}일 후 발주 예측이 시작됩니다.`
                : '판매 데이터 누적 중 — 충분한 데이터가 쌓이면 자동으로 예측이 시작됩니다.'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!predictions.length) return null;

  return (
    <div className={styles.wrap}>
      {predictions.map((p, i) => (
        <button
          key={i}
          className={styles.card}
          onClick={() => onClickItem?.(p.productName, p.channel)}
          title="클릭하면 해당 상품 상세 조회 명령이 입력됩니다"
        >
          <span className={styles.bell}>🔔</span>
          <div className={styles.text}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{p.productName}{p.option ? ` · ${p.option}` : ''}</span>
              {/* split 재고 셀러: 어느 채널의 예측인지 라벨 표시 (FR-006) */}
              {p.channel && <span className={styles.channelTag}>{p.channel}</span>}
            </div>
            <span className={styles.detail}>
              {p.daysLeft != null ? `${p.daysLeft}일 후 재고 소진 예측` : '재고 소진 예측'}
              {p.recommendQty ? ` · 권장 발주 ${p.recommendQty}개` : ''}
            </span>
          </div>
          <span className={styles.arrow}>→</span>
        </button>
      ))}
    </div>
  );
}
