import styles from './PredictionAlert.module.css';

/**
 * PredictionAlert — 채팅 메시지 목록 상단 카드 (hasInventory = true 셀러만)
 * props:
 *   predictions  — [{ productName, option, daysLeft, recommendQty }]
 *   onClickItem  — (productName) => void  채팅창에 조회 명령 자동 입력
 */
export default function PredictionAlert({ predictions = [], onClickItem }) {
  if (!predictions.length) return null;

  return (
    <div className={styles.wrap}>
      {predictions.map((p, i) => (
        <button
          key={i}
          className={styles.card}
          onClick={() => onClickItem?.(p.productName)}
          title="클릭하면 해당 상품 상세 조회 명령이 입력됩니다"
        >
          <span className={styles.bell}>🔔</span>
          <div className={styles.text}>
            <span className={styles.name}>{p.productName}{p.option ? ` · ${p.option}` : ''}</span>
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
