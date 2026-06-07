import { useState, useEffect } from 'react';
import styles from './ConnectionStatus.module.css';
import { showToast } from './Toast';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const CHANNEL_COLOR = {
  coupang: '#E50029',
  naver:   '#03C75A',
  cafe24:  '#2563EB',
  musinsa: '#222222',
  ably:    '#FF6B9D',
  zigzag:  '#FF5A5A',
};

const CHANNEL_LABEL = {
  coupang: '쿠팡',
  naver:   '네이버 스마트스토어',
  cafe24:  '카페24',
  musinsa: '무신사',
  ably:    '에이블리',
  zigzag:  '지그재그',
};

/**
 * 채널 상태 판별:
 *   ok      → 정상
 *   error   → 만료·연동 끊김
 *   warning → 무신사 API 키 만료 임박 (D-30 이내)
 */
function getCardStatus(ch, statusMap) {
  const s = statusMap[ch];
  if (!s) return { type: 'ok' };
  if (s.expired)  return { type: 'error',   msg: s.message || '연동이 만료되었습니다.' };
  if (s.daysLeft != null && s.daysLeft <= 30)
    return { type: 'warning', daysLeft: s.daysLeft, msg: `API 키 ${s.daysLeft}일 후 만료. 미리 갱신하세요.` };
  return { type: 'ok' };
}

export default function ConnectionStatus({ channels, onStart }) {
  const [statusMap, setStatusMap] = useState({});
  const [loading,   setLoading]   = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/channel-status`);
      if (res.ok) {
        const data = await res.json();
        setStatusMap(data);
      }
    } catch {
      // 서버 없으면 전부 정상 취급 (데모/오프라인 허용)
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  const statuses = channels.map((ch) => ({ id: ch, ...getCardStatus(ch, statusMap) }));
  const okCount  = statuses.filter((s) => s.type === 'ok').length;
  const errCount = statuses.filter((s) => s.type !== 'ok').length;

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>P</span>
            <span className={styles.logoText}>PICKIT</span>
          </div>
          <p className={styles.summary}>
            {loading
              ? '채널 상태 확인 중…'
              : errCount === 0
              ? `${channels.length}개 채널 모두 정상`
              : `${channels.length}개 채널 중 ${okCount}개 정상`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStatus} disabled={loading} title="새로고침">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1.5 7.5a6 6 0 016-6 6 6 0 014.8 2.4M13.5 7.5a6 6 0 01-6 6 6 6 0 01-4.8-2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M11 2l1.3 1.8L14 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          새로고침
        </button>
      </div>

      {/* 채널 카드 그리드 */}
      <div className={styles.grid}>
        {statuses.map(({ id, type, msg, daysLeft }) => {
          const color = CHANNEL_COLOR[id];
          const label = CHANNEL_LABEL[id] || id;

          let cardClass = styles.card;
          if (type === 'error')   cardClass += ` ${styles.cardError}`;
          if (type === 'warning') cardClass += ` ${styles.cardWarning}`;

          return (
            <div key={id} className={cardClass}>
              {/* 상단: 채널명 + 상태 */}
              <div className={styles.cardTop}>
                <div className={styles.cardLeft}>
                  <span
                    className={styles.dot}
                    style={{
                      background:
                        type === 'ok'      ? '#22c55e' :
                        type === 'warning' ? '#f59e0b' : '#ef4444',
                    }}
                  />
                  <span
                    className={styles.chName}
                    style={type !== 'ok' ? {
                      color: type === 'error' ? '#dc2626' : '#d97706',
                    } : { color }}
                  >
                    {label}
                  </span>
                </div>
                <span className={`${styles.badge} ${styles[`badge_${type}`]}`}>
                  {type === 'ok'      ? '정상' :
                   type === 'warning' ? `D-${daysLeft}` : '만료'}
                </span>
              </div>

              {/* 에러/경고 부연 + 버튼 */}
              {type !== 'ok' && (
                <div className={styles.cardBottom}>
                  <p className={styles.cardMsg}>{msg}</p>
                  {type === 'error' && (
                    <button
                      className={styles.reconnectBtn}
                      onClick={() => {
                        onStart();  // 채팅 화면으로 먼저 이동
                        // 채팅 화면 마운트 후 설정 모달 열기
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('pickit-open-settings', { detail: { tab: id } }));
                        }, 100);
                      }}
                    >
                      다시 연결하기
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 CTA */}
      <button className={styles.startBtn} onClick={onStart}>
        채팅 시작하기
      </button>
    </div>
  );
}
