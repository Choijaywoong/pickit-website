// 온보딩 완료 화면: 채널 연결 상태 요약 + 채팅 시작 CTA
// channels = 온보딩에서 선택한 채널 목록
// connectedChannels = API 키 저장 + 연결 테스트 통과한 채널 목록
// 카드 상태: 'connected' (녹색) | 'pending' (회색, 오류 아님) | 'expired' (빨강, 초기 온보딩에서는 미발생)
import styles from './StepComplete.module.css';
import Logo from '../Logo';

const CHANNEL_LABELS = {
  coupang: '쿠팡',
  naver:   '네이버 스마트스토어',
  cafe24:  '카페24',
  musinsa: '무신사',
  ably:    '에이블리',
  zigzag:  '지그재그',
};

export default function StepComplete({ channels, connectedChannels, onStart }) {
  const total     = channels.length;
  const connected = connectedChannels.length;
  const allDone   = connected > 0 && connected === total;

  const headline = allDone
    ? '연결 준비 완료'
    : connected > 0
    ? `${total}개 채널 중 ${connected}개 연결됐어요`
    : '일단 시작해 볼게요';

  const subtitle = allDone
    ? '선택한 채널이 모두 연결됐어요. 이제 채팅으로 주문을 관리해 보세요.'
    : connected > 0
    ? '나머지 채널은 채팅 화면 → 설정에서 언제든 연결할 수 있어요.'
    : 'API 키는 채팅 화면 → 설정에서 나중에 입력할 수 있어요.';

  const canStart = connected >= 1;

  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* 로고 */}
        <div className={styles.logo}>
          <Logo size="md" />
        </div>

        {/* 성공 아이콘 */}
        <div className={`${styles.iconWrap} ${allDone ? styles.iconAll : connected > 0 ? styles.iconPartial : styles.iconNone}`}>
          {allDone ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : connected > 0 ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 8 12 12 14 14"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>

        {/* 헤드라인 */}
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {/* 채널 카드 목록 */}
        <div className={styles.cardGrid}>
          {channels.map(chId => {
            const isConnected = connectedChannels.includes(chId);
            // 온보딩 중 '만료' 상태는 발생하지 않으므로 기본은 'pending' 처리
            const status = isConnected ? 'connected' : 'pending';
            return (
              <div key={chId} className={`${styles.card} ${styles[`card_${status}`]}`}>
                <span className={styles.cardLabel}>{CHANNEL_LABELS[chId] || chId}</span>
                <StatusBadge status={status} />
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          className={`${styles.startBtn} ${!canStart ? styles.startBtnWarn : ''}`}
          onClick={onStart}
        >
          {canStart ? '채팅 시작하기' : '지금은 건너뛰고 시작하기'}
        </button>

        {canStart ? (
          <p className={styles.note}>나머지 채널은 채팅 화면 → 설정에서 언제든 연결 가능해요</p>
        ) : (
          <p className={styles.note}>채팅 화면 → 설정에서 API 키를 입력하면 바로 활성화돼요</p>
        )}

      </div>
    </div>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }) {
  if (status === 'connected') {
    return <span className={`${styles.badge} ${styles.badgeConnected}`}>연결됨</span>;
  }
  if (status === 'expired') {
    return <span className={`${styles.badge} ${styles.badgeExpired}`}>만료</span>;
  }
  // pending: 회색, 오류 아님 — "연결 대기"
  return <span className={`${styles.badge} ${styles.badgePending}`}>연결 대기</span>;
}
