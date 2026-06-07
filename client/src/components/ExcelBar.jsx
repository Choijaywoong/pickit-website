import styles from './ExcelBar.module.css';

/**
 * ExcelBar — 하단 고정 바 (주문/엑셀 응답 시에만 표시)
 * props:
 *   filename   — 파일명
 *   count      — 건수
 *   onExpand   — "펼치기" 클릭 → ResultPanel 열기
 *   onSave     — "저장" 클릭 → xlsx 다운로드
 */
export default function ExcelBar({ filename, count, onExpand, onSave }) {
  if (!filename) return null;

  return (
    <div className={styles.bar}>
      {/* 아이콘 + 파일명 + 건수 */}
      <div className={styles.left}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        <span className={styles.filename}>{filename}</span>
        <span className={styles.count}>{count}건</span>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.right}>
        <button className={styles.expandBtn} onClick={onExpand}>
          펼치기
        </button>
        <button className={styles.saveBtn} onClick={onSave}>
          저장
        </button>
      </div>
    </div>
  );
}
