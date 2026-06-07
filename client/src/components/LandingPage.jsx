import styles from './LandingPage.module.css';
import { useLanguage } from '../i18n';

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

const SUPPORTERS = [
  {
    name:   '서울대학교 공과대학',
    nameEn: 'SNU College of Engineering',
    color:  '#003876',
    initial:'SNU',
  },
  {
    name:   '아산나눔재단',
    nameEn: 'Asan Nanum Foundation',
    color:  '#005BAC',
    initial:'AN',
  },
];

export default function LandingPage({ onStart }) {
  const { lang, setLang, t } = useLanguage();

  const PAINS = [
    { icon: '🗂️', title: t('pain1Title'), desc: t('pain1Desc') },
    { icon: '📋', title: t('pain2Title'), desc: t('pain2Desc') },
    { icon: '⏰', title: t('pain3Title'), desc: t('pain3Desc') },
  ];

  const DEMO_MESSAGES = lang === 'ko' ? [
    { role: 'user',      text: '오늘 전체 채널 주문 보여줘' },
    { role: 'assistant', text: '오늘 쿠팡 12건, 네이버 8건, 카페24 3건 — 총 23건입니다. 엑셀로 뽑아드릴까요?' },
    { role: 'user',      text: '블랙 L 사이즈 품절 처리해줘' },
    { role: 'assistant', text: '⚠️ 방화벽 — 3개 채널 × 1개 상품 재고 수정입니다. 최종 승인하시겠어요?' },
  ] : [
    { role: 'user',      text: "Show me all channel orders today" },
    { role: 'assistant', text: "Today: Coupang 12, Naver 8, Cafe24 3 — 23 orders total. Export to Excel?" },
    { role: 'user',      text: "Mark Black L size as sold out" },
    { role: 'assistant', text: "⚠️ Firewall — 3 channels × 1 product stock change. Confirm to proceed?" },
  ];

  return (
    <div className={styles.page}>

      {/* ── 네비게이션 ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoMark}>P</span>
          <span className={styles.navLogoText}>PICKIT</span>
        </div>
        <div className={styles.navRight}>
          <button
            className={styles.langToggle}
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            title="Switch language"
          >
            {lang === 'ko' ? 'EN' : '한'}
          </button>
          <button className={styles.navCta} onClick={onStart}>{t('navCta')}</button>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>{t('heroBadge')}</div>
        <h1 className={styles.heroTitle}>
          {t('heroTitle1')}<br />
          <span className={styles.heroAccent}>{t('heroAccentText')}</span>{t('heroTitle2')}
        </h1>
        <p className={styles.heroDesc}>
          {t('heroDesc').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>
        <button className={styles.heroBtn} onClick={onStart}>
          {t('heroBtn')}
        </button>
        <p className={styles.heroSub}>{t('heroSub')}</p>
      </section>

      {/* ── 채널 로고 ── */}
      <section className={styles.channels}>
        <p className={styles.channelsLabel}>{t('channelsLabel')}</p>
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
        <p className={styles.sectionEyebrow}>{t('painEyebrow')}</p>
        <h2 className={styles.sectionTitle}>{t('painTitle')}</h2>
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
          <p className={styles.sectionEyebrow}>{t('demoEyebrow')}</p>
          <h2 className={styles.sectionTitle}>
            {t('demoTitle').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h2>
          <ul className={styles.demoFeatures}>
            <li>{t('demoF1')}</li>
            <li>{t('demoF2')}</li>
            <li>{t('demoF3')}</li>
            <li>{t('demoF4')}</li>
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
        <p className={styles.supportLabel}>{t('supportLabel')}</p>
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
        <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
        <p className={styles.ctaDesc}>{t('ctaDesc')}</p>
        <button className={styles.ctaBtn} onClick={onStart}>
          {t('ctaBtn')}
        </button>
      </section>

      {/* ── 푸터 ── */}
      <footer className={styles.footer}>
        <span className={styles.footerLogo}>PICKIT</span>
        <span className={styles.footerCopy}>{t('footerCopy')}</span>
      </footer>

    </div>
  );
}
