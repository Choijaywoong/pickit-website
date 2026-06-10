// 온보딩 전 화면 공통 로고 컴포넌트 — 단색 #1A6FD4 아이콘 + #0A2540 워드마크, 라이트모드 고정
// 스펙: 세 갈래 합류 SVG, stroke-width 비율 유지, 화살촉·색 분리 금지 (ONBOARDING_UI_SPEC 2-1)

const SIZES = {
  sm: { w: 23, h: 20, sw: 3.2, textSize: 15, gap: 7 },
  md: { w: 32, h: 28, sw: 4.2, textSize: 25, gap: 9 },
  lg: { w: 46, h: 40, sw: 6.0, textSize: 36, gap: 13 },
};

export default function Logo({ size = 'md' }) {
  const c = SIZES[size] ?? SIZES.md;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap }}>
      <svg
        width={c.w}
        height={c.h}
        viewBox="0 0 34 30"
        fill="none"
        aria-label="weave"
        style={{ flexShrink: 0 }}
      >
        <path d="M3 6 C 13 6, 15 15, 22 15"  stroke="#1A6FD4" strokeWidth={c.sw} strokeLinecap="round" />
        <path d="M3 15 L 22 15"               stroke="#1A6FD4" strokeWidth={c.sw} strokeLinecap="round" />
        <path d="M3 24 C 13 24, 15 15, 22 15" stroke="#1A6FD4" strokeWidth={c.sw} strokeLinecap="round" />
        <path d="M22 15 L 31 15"              stroke="#1A6FD4" strokeWidth={c.sw} strokeLinecap="round" />
      </svg>
      <span style={{
        fontFamily: "'Nunito', 'Arial Black', sans-serif",
        fontWeight: 900,
        fontSize: c.textSize,
        color: '#0A2540',
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}>
        weave
      </span>
    </div>
  );
}
