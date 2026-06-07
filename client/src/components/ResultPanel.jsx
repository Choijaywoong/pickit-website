import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import styles from './ResultPanel.module.css';

const CHANNEL_LABEL = {
  coupang: '쿠팡',
  naver:   '네이버',
  cafe24:  '카페24',
  musinsa: '무신사',
  ably:    '에이블리',
  zigzag:  '지그재그',
};

const CHANNEL_COLOR = {
  coupang: '#E50029',
  naver:   '#03C75A',
  cafe24:  '#2563EB',
  musinsa: '#222222',
  ably:    '#FF6B9D',
  zigzag:  '#FF5A5A',
};

/**
 * ResultPanel — 우측 슬라이드 패널
 * props:
 *   open         — 패널 표시 여부
 *   onClose      — 닫기 콜백
 *   data         — { orders: [...], filename, mode: 'orders' | 'excel' }
 *   connectedChannels — 사용자가 연결한 채널 ID 배열
 */
export default function ResultPanel({ open, onClose, data, connectedChannels = [] }) {
  const orders = data?.orders || [];
  const mode   = data?.mode   || 'orders';

  // 채널별 주문 수 집계
  const channelCounts = useMemo(() => {
    const acc = {};
    orders.forEach((o) => {
      acc[o.channel] = (acc[o.channel] || 0) + 1;
    });
    return acc;
  }, [orders]);

  // 다중 채널 여부 (체크박스 표시 기준)
  const activeChannelIds = Object.keys(channelCounts);
  const showFilter = connectedChannels.length >= 2 && activeChannelIds.length >= 2;

  // 체크박스 상태 (전체 체크 기본값)
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(activeChannelIds.map((c) => [c, true]))
  );

  function toggleChannel(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // 필터링된 주문
  const filtered = useMemo(
    () => orders.filter((o) => checked[o.channel] !== false),
    [orders, checked]
  );

  function handleSaveAll() {
    downloadXlsx(orders, data?.filename || 'pickit_주문내역.xlsx');
  }

  function handleSaveSelected() {
    downloadXlsx(filtered, (data?.filename || 'pickit_선택항목').replace('.xlsx', '_선택.xlsx'));
  }

  return (
    <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>
            {mode === 'excel' ? '엑셀 미리보기' : '주문 결과'}
          </span>
          <span className={styles.count}>{orders.length}건</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.downloadBtn} onClick={handleSaveAll} title="전체 다운로드">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            저장
          </button>
          <button className={styles.closeBtn} onClick={onClose} title="닫기">✕</button>
        </div>
      </div>

      {/* 체크박스 필터 (채널 2개 이상일 때만) */}
      {showFilter && (
        <div className={styles.filterArea}>
          <p className={styles.filterLabel}>플랫폼 선택</p>
          <div className={styles.filterList}>
            {activeChannelIds.map((id) => (
              <label key={id} className={styles.filterRow}>
                <input
                  type="checkbox"
                  checked={checked[id] !== false}
                  onChange={() => toggleChannel(id)}
                  className={styles.checkbox}
                />
                <span
                  className={styles.filterChName}
                  style={{ color: CHANNEL_COLOR[id] || '#374151' }}
                >
                  {CHANNEL_LABEL[id] || id}
                </span>
                <span className={styles.filterCount}>{channelCounts[id]}건</span>
              </label>
            ))}
          </div>
          <div className={styles.filterFooter}>
            <span className={styles.selectedCount}>선택: {filtered.length}건</span>
            <button className={styles.saveSelectedBtn} onClick={handleSaveSelected}>
              선택 항목 저장
            </button>
          </div>
        </div>
      )}

      {/* 데이터 표 */}
      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>표시할 데이터가 없습니다.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>채널</th>
                {mode === 'orders' ? (
                  <>
                    <th>상품명 (옵션)</th>
                    <th>수량</th>
                  </>
                ) : (
                  <>
                    <th>상품명 (옵션)</th>
                    <th>금액</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {(filtered.length > 5 ? filtered.slice(0, 5) : filtered).flatMap((o) =>
                (o.items || [{ productName: o.productName, optionValue: o.optionValue, quantity: o.quantity, price: o.price }]).map((item, j) => (
                  <tr key={`${o.orderId || o.channel}-${j}`}>
                    <td>
                      <span
                        className={styles.chTag}
                        style={{ color: CHANNEL_COLOR[o.channel] || '#374151' }}
                      >
                        {CHANNEL_LABEL[o.channel] || o.channel}
                      </span>
                    </td>
                    <td className={styles.productCell}>
                      {item.productName}
                      {item.optionValue && <span className={styles.option}> / {item.optionValue}</span>}
                    </td>
                    <td className={styles.numCell}>
                      {mode === 'orders'
                        ? `×${item.quantity || 1}`
                        : `${(item.price || 0).toLocaleString()}원`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* 더 많은 건 안내 */}
        {filtered.length > 5 && (
          <p className={styles.moreHint}>
            + {filtered.length - 5}건 더 (파일에 전체 포함)
          </p>
        )}
      </div>
    </div>
  );
}

function downloadXlsx(orders, filename) {
  if (!orders.length) return;
  const rows = orders.flatMap((o) =>
    (o.items || [{}]).map((i) => ({
      채널:    CHANNEL_LABEL[o.channel] || o.channel,
      주문번호: o.orderId || '',
      구매자:  o.buyerName || '',
      상품명:  i.productName || o.productName || '',
      옵션:    i.optionValue || o.optionValue || '',
      수량:    i.quantity || o.quantity || 1,
      금액:    i.price    || o.price    || 0,
    }))
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '주문내역');
  XLSX.writeFile(wb, filename);
}
