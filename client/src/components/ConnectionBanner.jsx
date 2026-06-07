import styles from './ConnectionBanner.module.css';

const CHANNEL_LABEL = {
  coupang: '쿠팡',
  naver:   '네이버 스마트스토어',
  cafe24:  '카페24',
  musinsa: '무신사',
  ably:    '에이블리',
  zigzag:  '지그재그',
};

/**
 * ConnectionBanner — 채팅 헤더 바로 아래 고정 배너
 * props:
 *   errors — [{ channel: 'naver', message: '...', link: '...' }]
 */
export default function ConnectionBanner({ errors = [] }) {
  if (!errors.length) return null;

  return (
    <div className={styles.wrap}>
      {errors.map((e, i) => (
        <div key={i} className={styles.banner}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#dc2626' }}>
            <path d="M7 1L1 12h12L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <line x1="7" y1="5.5" x2="7" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
          </svg>
          <span className={styles.msg}>
            현재&nbsp;<strong>{CHANNEL_LABEL[e.channel] || e.channel}</strong>&nbsp;연결이 만료되었습니다.&nbsp;
            {e.link ? (
              <a href={e.link} className={styles.link} target="_blank" rel="noreferrer">
                연동 설정 페이지
              </a>
            ) : (
              <span className={styles.link} onClick={() => alert('연동 설정 페이지로 이동합니다 (구현 예정)')}>
                연동 설정 페이지
              </span>
            )}
            에서 다시 연결해 주세요.
          </span>
        </div>
      ))}
    </div>
  );
}
