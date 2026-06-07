import styles from './LandingPage.module.css';

/* ── 채널 로고 SVG ── */
const ChannelLogos = {
  coupang: (
    <svg viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="18">
      <text x="0" y="19" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="20" fill="#E50029">쿠팡</text>
    </svg>
  ),
  naver: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="22" width="22">
      <rect width="24" height="24" rx="4" fill="#03C75A"/>
      <path d="M5 18V6h3.8l4.4 7V6H17v12h-3.8l-4.4-7v7H5z" fill="white"/>
    </svg>
  ),
  cafe24: (
    <svg viewBox="0 0 72 20" xmlns="http://www.w3.org/2000/svg" height="18">
      <text x="0" y="16" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" fill="#1155CC">cafe24</text>
    </svg>
  ),
  musinsa: (
    <svg viewBox="0 0 80 22" xmlns="http://www.w3.org/2000/svg" height="18">
      <text x="0" y="17" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="16" fill="#1A1A1A">무신사</text>
    </svg>
  ),
  ably: (
    <svg viewBox="0 0 70 22" xmlns="http://www.w3.org/2000/svg" height="18">
      <text x="0" y="17" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="16" fill="#FF6B9D">에이블리</text>
    </svg>
  ),
  zigzag: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="22" width="22">
      <rect width="24" height="24" rx="4" fill="#FF5A5A"/>
      <path d="M6 7h12l-5 5 5 5H6l5-5-5-5z" fill="white"/>
    </svg>
  ),
};

const CHANNELS = [
  { id: 'coupang', label: '쿠팡' },
  { id: 'naver',   label: '네이버 스마트스토어' },
  { id: 'cafe24',  label: '카페24' },
  { id: 'musinsa', label: '무신사' },
  { id: 'ably',    label: '에이블리' },
  { id: 'zigzag',  label: '지그재그' },
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

const SUPPORTERS = [
  {
    name: '서울대학교 공과대학',
    nameEn: 'SNU College of Engineering',
    color: '#003876',
    initial: 'SNU',
  },
  {
    name: '아산나눔재단',
    nameEn: 'Asan Nanum Foundation',
    color: '#005BAC',
    initial: 'AN',
  },
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

      {/* ── 채널 로고 ── */}
      <section className={styles.channels}>
        <p className={styles.channelsLabel}>연동 채널</p>
        <div className={styles.channelList}>
          {CHANNELS.map((ch) => (
            <div key={ch.id} className={styles.channelBadge}>
              {ChannelLogos[ch.id]}
              <span className={styles.channelLabel}>{ch.label}</span>
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

      {/* ── 지원기관 ── */}
      <section className={styles.supportSection}>
        <p className={styles.supportLabel}>지원기관</p>
        <div className={styles.supportList}>
          {SUPPORTERS.map((s) => (
            <div key={s.name} className={styles.supportCard}>
              <div className={styles.supportInitial} style={{ background: s.color }}>
                {s.initial}
              </div>
              <div>
                <div className={styles.supportName}>{s.name}</div>
                <div className={styles.supportNameEn}>{s.nameEn}</div>
              </div>
            </div>
          ))}
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
