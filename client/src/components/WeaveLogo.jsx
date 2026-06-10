// weave 로고 컴포넌트 — 수렴 경로 아이콘 + "weave" 텍스트 (랜딩 페이지 확정 디자인)
// size: 'sm'(푸터), 'md'(네비), 'lg'(히어로·로그인)
export default function WeaveLogo({ size = 'md', dark = false }) {
  const cfg = {
    sm: { w: 23, h: 20, sw: 3.2, textSize: 15, gap: 7 },
    md: { w: 32, h: 28, sw: 4.2, textSize: 25, gap: 9 },
    lg: { w: 46, h: 40, sw: 6.0, textSize: 36, gap: 13 },
  };
  const c = cfg[size] || cfg.md;
  const stroke     = '#1A6FD4';
  const textColor  = dark ? '#ffffff' : '#0A2540';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap }}>
      <svg width={c.w} height={c.h} viewBox="0 0 34 30" aria-label="weave" style={{ flexShrink: 0 }}>
        <path d="M3 6 C 13 6, 15 15, 22 15"  fill="none" stroke={stroke} strokeWidth={c.sw} strokeLinecap="round"/>
        <path d="M3 15 L 22 15"               fill="none" stroke={stroke} strokeWidth={c.sw} strokeLinecap="round"/>
        <path d="M3 24 C 13 24, 15 15, 22 15" fill="none" stroke={stroke} strokeWidth={c.sw} strokeLinecap="round"/>
        <path d="M22 15 L 31 15"              fill="none" stroke={stroke} strokeWidth={c.sw} strokeLinecap="round"/>
      </svg>
      <span style={{
        fontFamily: "'Nunito', 'Arial Black', Helvetica, sans-serif",
        fontWeight: 900,
        fontSize: c.textSize,
        color: textColor,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}>
        weave
      </span>
    </div>
  );
}
