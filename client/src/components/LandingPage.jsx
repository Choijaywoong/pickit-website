import styles from './LandingPage.module.css';

const CHANNELS = [
  { id: 'coupang', label: '쿠팡',              color: '#E50029' },
  { id: 'naver',   label: '네이버 스마트스토어', color: '#03C75A' },
  { id: 'cafe24',  label: '카페24',             color: '#2563EB' },
  { id: 'musinsa', label: '무신사',             color: '#222222' },
  { id: 'ably',    label: '에이블리',            color: '#FF6B9D' },
  { id: 'zigzag',  label: '지그재그',            color: '#FF5A5A' },
];

const PAINS = [
  {
    icon: '🗂️',
    title: '탭이 6개',
    desc: '채널마다 파트너 센터를 따로 열고, 같은 작업을 6번 반복합니다.',
  },
  {
    icon: '📋',
    title: '엑셀 복붙',
    desc: '주문 데이터를 내려받아 취합하다 실수가 생깁니다.',
  },
  {
    icon: '⏰',
    title: '하루가 운영에 다 간다',
    desc: '정작 중요한 상품 기획·CS·마케팅에 쓸 시간이 없습니다.',
  },
];

const DEMO_MESSAGES = [
  { role: 'user',      text: '오늘 전체 채널 주문 보여줘' },
  { role: 'assistant', text: '오늘 쿠팡 12건, 네이버 8건, 카페24 3건 — 총 23건입니다. 엑셀로 뽑아드릴까요?' },
  { role: 'user',      text: '블랙 L 사이즈 품절 처리해줘' },
  { role: 'assistant', text: '⚠️ 방화벽 — 3개 채널 × 1개 상품 재고 수정입니다. 최종 승인하시겠어요?' },
];

export default function LandingPage({ onStart }) {
  return (
    <div className={styles.page}>

      {/* ── 네비게이션 ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoMark}>P</span>
          <span className={styles.navLogoText}>PICKIT</span>
        </div>
        <button className={styles.navCta} onClick={onStart}>무료로 시작하기</button>
      </nav>

      {/* ── 히어로 ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>의류 셀러를 위한 AI 운영 서비스</div>
        <h1 className={styles.heroTitle}>
          말 한마디로<br />
          <span className={styles.heroAccent}>6개 채널</span>을 한 번에
        </h1>
        <p className={styles.heroDesc}>
          주문 조회, 재고 수정, 송장 전송까지.<br />
          채팅창에 입력하면 PICKIT이 알아서 처리합니다.
        </p>
        <button className={styles.heroBtn} onClick={onStart}>
          무료로 시작하기 →
        </button>
        <p className={styles.heroSub}>신용카드 불필요 · 14일 무료 체험</p>
      </section>

      {/* ── 채널 배지 ── */}
      <section className={styles.channels}>
        <p className={styles.channelsLabel}>연동 채널</p>
        <div className={styles.channelList}>
          {CHANNELS.map((ch) => (
            <div key={ch.id} className={styles.channelBadge}>
              <span className={styles.channelDot} style={{ background: ch.color }} />
              {ch.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── 문제 정의 ── */}
      <section className={styles.section}>
        <p className={styles.sectionEyebrow}>지금 셀러의 현실</p>
        <h2 className={styles.sectionTitle}>멀티채널 운영, 이렇게 힘드셨죠?</h2>
        <div className={styles.painGrid}>
          {PAINS.map((p) => (
            <div key={p.title} className={styles.painCard}>
              <span className={styles.painIcon}>{p.icon}</span>
              <h3 className={styles.painTitle}>{p.title}</h3>
              <p className={styles.painDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 데모 ── */}
      <section className={styles.demoSection}>
        <div className={styles.demoText}>
          <p className={styles.sectionEyebrow}>PICKIT이 하는 일</p>
          <h2 className={styles.sectionTitle}>채팅창에 말하면<br />PICKIT이 처리합니다</h2>
          <ul className={styles.demoFeatures}>
            <li>✓ 전체 채널 주문 한 번에 조회</li>
            <li>✓ 재고·가격 수정 전 방화벽 검토</li>
            <li>✓ 송장 자동 전송</li>
            <li>✓ 주문 데이터 엑셀 추출</li>
          </ul>
        </div>
        <div className={styles.demoChat}>
          <div className={styles.demoChatBar}>
            <span className={styles.demoChatDot} style={{ background: '#ef4444' }} />
            <span className={styles.demoChatDot} style={{ background: '#f59e0b' }} />
            <span className={styles.demoChatDot} style={{ background: '#22c55e' }} />
            <span className={styles.demoChatTitle}>PICKIT Assistant</span>
          </div>
          <div className={styles.demoChatBody}>
            {DEMO_MESSAGES.map((m, i) => (
              <div key={i} className={`${styles.demoMsg} ${m.role === 'user' ? styles.demoMsgUser : styles.demoMsgAi}`}>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 최종 CTA ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>지금 바로 시작해보세요</h2>
        <p className={styles.ctaDesc}>설치 없이 브라우저에서 바로 사용 가능합니다.</p>
        <button className={styles.ctaBtn} onClick={onStart}>
          무료로 시작하기 →
        </button>
      </section>

      {/* ── 푸터 ── */}
      <footer className={styles.footer}>
        <span className={styles.footerLogo}>PICKIT</span>
        <span className={styles.footerCopy}>© 2025 PICKIT. All rights reserved.</span>
      </footer>

    </div>
  );
}
