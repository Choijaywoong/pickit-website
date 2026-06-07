import styles from './FirewallToast.module.css';

/**
 * 방화벽 알림창 — 입력창 바로 위 position:absolute 오버레이
 * props:
 *   data     — { channels, productCount, changeDesc } (표시 정보 3종)
 *   onApprove — 최종 승인 콜백
 *   onCancel  — 취소 콜백
 */
export default function FirewallToast({ data, onApprove, onCancel }) {
  if (!data) return null;

  const { channels = '—', productCount = '—', changeDesc = '—', firewallType = '방화벽' } = data;

  return (
    <div className={styles.overlay}>
      {/* 헤더 */}
      <div className={styles.header}>
        <span className={styles.shield}>🛡</span>
        <span className={styles.headerText}>{firewallType} — 승인이 필요해요</span>
      </div>

      {/* 정보 3열 */}
      <div className={styles.infoRow}>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>대상 채널</span>
          <span className={styles.infoValue}>{channels}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>영향 상품</span>
          <span className={`${styles.infoValue} ${styles.infoDanger}`}>{productCount}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>변경 내용</span>
          <span className={styles.infoValue}>{changeDesc}</span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.btnRow}>
        <button className={styles.btnCancel} onClick={onCancel}>
          취소
        </button>
        <button className={styles.btnApprove} onClick={onApprove}>
          최종 승인하기
        </button>
      </div>
    </div>
  );
}
