// InvoicePanel — 송장 입력 패널 (ResultPanel 영역에 렌더링)
// 채팅 "송장" 키워드 → ChatWidget이 pending 주문을 가져와 props로 전달
// 전송 버튼 → POST /api/invoice/send → 채널별 실제 API 호출
import { useState, useEffect, useCallback } from 'react';
import styles from './InvoicePanel.module.css';
import rpStyles from './ResultPanel.module.css';
import { authFetch } from '../auth';

const API_BASE  = import.meta.env.VITE_API_BASE || '/api';
const COURIERS  = ['CJ대한통운', '한진', '로젠', '우체국', '기타'];

const CHANNEL_BADGE = {
  coupang: styles.channelCoupang,
  naver:   styles.channelNaver,
};
const CHANNEL_LABEL = {
  coupang: '쿠팡',
  naver:   '네이버',
  cafe24:  '카페24',
  musinsa: '무신사',
  ably:    '에이블리',
  zigzag:  '지그재그',
};

export default function InvoicePanel({ open, onClose, orders: propOrders, onSendResult }) {
  const [orders, setOrders]     = useState([]);
  const [fetching, setFetching] = useState(false);
  const [sending, setSending]   = useState(false);

  // propOrders가 바뀔 때마다 내부 state 동기화 (checked 필드 추가)
  useEffect(() => {
    if (propOrders) {
      setOrders(propOrders.map((o) => ({ ...o, checked: false })));
    }
  }, [propOrders]);

  // 풀필먼트 주문 수
  const platformCount = orders.filter((o) => o.deliveryType === 'platform').length;
  const selfTotal     = orders.filter((o) => o.deliveryType === 'self').length;

  // 입력 완료 건: 택배사 + 13자리 숫자 + 아직 전송 전
  const doneOrders    = orders.filter((o) => o.deliveryType === 'self' && o.courier && o.trackingNumber.length === 13 && o.status === 'pending');
  const checkedOrders = doneOrders.filter((o) => o.checked);

  function updateOrder(id, field, value) {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o));
  }

  function toggleCheck(id) {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, checked: !o.checked } : o));
  }

  function handleTrackingInput(id, raw) {
    const numeric = raw.replace(/[^0-9]/g, '').slice(0, 13);
    updateOrder(id, 'trackingNumber', numeric);
  }

  // POST /api/invoice/send — 실제 채널 API 호출
  const handleSend = useCallback(async (targets) => {
    if (!targets.length || sending) return;
    setSending(true);

    try {
      const res  = await authFetch(`${API_BASE}/invoice/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          orders: targets.map(({ orderId, channel, courier, trackingNumber }) => ({
            orderId, channel, courier, trackingNumber,
          })),
        }),
      });

      const data = await res.json();
      const results = data.results || [];

      // 행 상태 업데이트
      setOrders((prev) =>
        prev.map((o) => {
          const r = results.find((r) => r.orderId === o.orderId);
          if (!r) return o;
          return { ...o, status: r.success ? 'success' : 'failed' };
        })
      );

      // 채팅 결과 요약 콜백
      if (onSendResult) {
        onSendResult(results.map(({ channel, success }) => ({
          channel,
          status: success ? 'success' : 'failed',
        })));
      }
    } catch {
      // 네트워크 오류 시 전체 실패 처리
      setOrders((prev) =>
        prev.map((o) => targets.some((t) => t.id === o.id) ? { ...o, status: 'failed' } : o)
      );
    } finally {
      setSending(false);
    }
  }, [sending, onSendResult]);

  // 패널이 닫혀있으면 렌더링 최소화
  const isEmpty = orders.length === 0;

  return (
    <div className={`${rpStyles.panel} ${open ? rpStyles.panelOpen : ''}`}>

      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>송장 입력</span>
          <span className={styles.subtitle}>
            {fetching ? '불러오는 중...' : `미처리 ${selfTotal}건`}
          </span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.sendAllBtn}
            disabled={!doneOrders.length || sending || fetching}
            onClick={() => handleSend(doneOrders)}
          >
            전체 전송
          </button>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* 풀필먼트 안내 배너 */}
      {platformCount > 0 && (
        <div className={styles.fulfillBanner}>
          <span className={styles.fulfillBannerIcon}>ℹ</span>
          <span className={styles.fulfillBannerText}>
            {platformCount}건은 플랫폼 배송 위탁 건입니다 — 송장 입력이 필요하지 않아요.
          </span>
        </div>
      )}

      {/* 주문 목록 */}
      <div className={styles.orderList}>
        {fetching && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            주문 불러오는 중...
          </div>
        )}

        {!fetching && isEmpty && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            미처리 주문이 없습니다.
          </div>
        )}

        {orders.map((order) => {
          const isPlatform = order.deliveryType === 'platform';
          const isDone     = !isPlatform && order.trackingNumber.length === 13 && order.courier;
          const isSuccess  = order.status === 'success';
          const isFailed   = order.status === 'failed';

          let rowClass = styles.orderRow;
          if (isSuccess)  rowClass += ` ${styles.orderRowDone}`;
          if (isFailed)   rowClass += ` ${styles.orderRowFailed}`;
          if (isPlatform) rowClass += ` ${styles.orderRowPlatform}`;

          const badgeClass = `${styles.channelBadge} ${CHANNEL_BADGE[order.channel] || styles.channelDefault}`;

          return (
            <div key={order.id} className={rowClass}>
              {/* 상단: 체크박스 + 채널뱃지 + 상품명 + 수량 */}
              <div className={styles.orderTop}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={order.checked}
                  disabled={isPlatform || isSuccess || isFailed}
                  onChange={() => toggleCheck(order.id)}
                />
                <span className={badgeClass}>
                  {CHANNEL_LABEL[order.channel] || order.channel}
                </span>
                <span className={styles.productName}>
                  {order.productName}
                  {order.option ? ` (${order.option})` : ''}
                </span>
                <span className={styles.quantity}>×{order.quantity}</span>
              </div>

              {/* 하단: 상태에 따른 입력/표시 */}
              {isPlatform ? (
                <div className={styles.orderInputs}>
                  <select className={styles.courierSelect} disabled>
                    <option>택배사</option>
                  </select>
                  <input className={styles.trackingInput} type="tel" placeholder="플랫폼 자동 처리" disabled />
                  <span className={styles.platformBadge}>플랫폼 배송</span>
                </div>
              ) : isSuccess ? (
                <div className={styles.orderInputs}>
                  <span className={styles.statusDone}>✓ 전송 완료</span>
                </div>
              ) : isFailed ? (
                <div className={styles.orderInputs}>
                  <span className={styles.statusFailed}>✗ 전송 실패</span>
                  <button className={styles.retryBtn} onClick={() => updateOrder(order.id, 'status', 'pending')}>
                    재시도
                  </button>
                </div>
              ) : (
                <div className={styles.orderInputs}>
                  <select
                    className={styles.courierSelect}
                    value={order.courier}
                    onChange={(e) => updateOrder(order.id, 'courier', e.target.value)}
                  >
                    <option value="">택배사</option>
                    {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    className={`${styles.trackingInput} ${isDone ? styles.trackingInputDone : ''}`}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={13}
                    placeholder="송장번호 13자리"
                    value={order.trackingNumber}
                    onChange={(e) => handleTrackingInput(order.id, e.target.value)}
                  />
                  {isDone && <span className={styles.doneIcon}>✓</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 고정 바 */}
      <div className={styles.footer}>
        <span className={styles.footerCount}>
          입력 완료{' '}
          <span className={doneOrders.length > 0 ? styles.footerCountDone : ''}>
            {doneOrders.length}건
          </span>
          {' '}/ 전체 {selfTotal}건
        </span>
        <div className={styles.footerBtns}>
          <button
            className={styles.footerBtnSelected}
            disabled={!checkedOrders.length || sending || fetching}
            onClick={() => handleSend(checkedOrders)}
          >
            선택 전송
          </button>
          <button
            className={styles.footerBtnAll}
            disabled={!doneOrders.length || sending || fetching}
            onClick={() => handleSend(doneOrders)}
          >
            {sending ? '전송 중...' : '전체 전송'}
          </button>
        </div>
      </div>

    </div>
  );
}
