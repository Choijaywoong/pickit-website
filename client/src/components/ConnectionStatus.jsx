import { useState, useEffect } from 'react';
import styles from './ConnectionStatus.module.css';
import { showToast } from './Toast';
import { authFetch } from '../auth';
import { useLanguage } from '../i18n';
import WeaveLogo from './WeaveLogo';

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

function getCardStatus(ch, statusMap) {
  const s = statusMap[ch];
  if (!s || s === 'ok' || s === 'demo') return { type: 'ok', demo: s === 'demo' };
  if (s === 'missing') return { type: 'error' };
  if (s.expired)  return { type: 'error' };
  if (s.daysLeft != null && s.daysLeft <= 30)
    return { type: 'warning', daysLeft: s.daysLeft };
  return { type: 'ok' };
}

export default function ConnectionStatus({ channels, onStart }) {
  const { t } = useLanguage();
  const [statusMap, setStatusMap] = useState({});
  const [loading,   setLoading]   = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res  = await authFetch(`${API_BASE}/settings/channel-status`);
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
            <WeaveLogo />
          </div>
          <p className={styles.summary}>
            {loading
              ? t('connChecking')
              : errCount === 0
              ? t('connAllOk', channels.length)
              : t('connSomeOk', channels.length, okCount)}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStatus} disabled={loading} title={t('connRefresh')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1.5 7.5a6 6 0 016-6 6 6 0 014.8 2.4M13.5 7.5a6 6 0 01-6 6 6 6 0 01-4.8-2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M11 2l1.3 1.8L14 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('connRefresh')}
        </button>
      </div>

      {/* 채널 카드 그리드 */}
      <div className={styles.grid}>
        {statuses.map(({ id, type, daysLeft }) => {
          const color = CHANNEL_COLOR[id];
          const label = CHANNEL_LABEL[id] || id;

          let cardClass = styles.card;
          if (type === 'error')   cardClass += ` ${styles.cardError}`;
          if (type === 'warning') cardClass += ` ${styles.cardWarning}`;

          const badgeText = type === 'ok'
            ? t('connBadgeOk')
            : type === 'warning'
            ? `D-${daysLeft}`
            : t('connBadgeExpired');

          const errMsg = type === 'error'
            ? t('connMissingMsg')
            : type === 'warning'
            ? `API key expires in ${daysLeft} days. Renew soon.`
            : '';

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
                  {badgeText}
                </span>
              </div>

              {/* 에러/경고 부연 + 버튼 */}
              {type !== 'ok' && (
                <div className={styles.cardBottom}>
                  <p className={styles.cardMsg}>{errMsg}</p>
                  {type === 'error' && (
                    <button
                      className={styles.reconnectBtn}
                      onClick={() => {
                        onStart();
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('pickit-open-settings', { detail: { tab: id } }));
                        }, 100);
                      }}
                    >
                      {t('connReconnectBtn')}
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
        {t('connStartBtn')}
      </button>
    </div>
  );
}
