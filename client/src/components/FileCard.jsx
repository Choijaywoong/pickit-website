import * as XLSX from 'xlsx';
import styles from './FileCard.module.css';
import { showToast } from './Toast';

const CHANNEL_LABEL = {
  coupang: '쿠팡', naver: '네이버', cafe24: '카페24',
  musinsa: '무신사', ably: '에이블리', zigzag: '지그재그',
};

function doDownload(orders, filename) {
  if (!orders?.length) {
    showToast('저장할 데이터가 없습니다.', 'warning');
    return;
  }
  const rows = orders.flatMap((o) =>
    (o.items || [{}]).map((item) => ({
      채널:    CHANNEL_LABEL[o.channel] || o.channel,
      주문번호: o.orderId   || '',
      구매자:  o.buyerName || '',
      상품명:  item.productName  || o.productName  || '',
      옵션:    item.optionValue  || o.optionValue  || '',
      수량:    item.quantity     || o.quantity     || 1,
      단가:    item.price        || o.price        || 0,
      결제금액: o.totalPrice || 0,
    }))
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '주문내역');
  XLSX.writeFile(wb, filename);
  showToast(`${filename} 저장 완료`, 'success');
}

/**
 * FileCard — 메시지 하단에 붙는 파일 다운로드 카드 (Claude UI 스타일)
 * props:
 *   filename  — 파일명 (표시 + 다운로드에 사용)
 *   count     — 건수
 *   orders    — 주문 배열 (xlsx 생성용)
 *   onExpand  — "펼치기" 클릭 콜백 (ResultPanel 열기)
 */
export default function FileCard({ filename, count, orders, onExpand }) {
  return (
    <div className={styles.card}>
      {/* 아이콘 */}
      <div className={styles.icon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="#16a34a" opacity="0.15"/>
          <path d="M3 9h18M9 21V9" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#16a34a" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* 파일 정보 */}
      <div className={styles.info}>
        <span className={styles.name}>{filename}</span>
        <span className={styles.meta}>{count}건 · Excel 스프레드시트</span>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        {onExpand && (
          <button className={styles.expandBtn} onClick={onExpand} title="ResultPanel에서 미리보기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            펼치기
          </button>
        )}
        <button
          className={styles.downloadBtn}
          onClick={() => doDownload(orders, filename)}
          title="xlsx 다운로드"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6.5l3 3 3-3M1 11.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          저장
        </button>
      </div>
    </div>
  );
}
