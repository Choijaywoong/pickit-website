// weave 로고 컴포넌트 — 3단 줄무늬 아이콘 + "weave" 텍스트
// size: 'sm'(푸터), 'md'(네비), 'lg'(히어로) / dark: 다크 배경용 컬러
export default function WeaveLogo({ size = 'md', dark = false }) {
  const cfg = {
    sm: { w: 23, h: 18, textSize: 15, gap: 8,
          rects: [{x:0,y:0,w:18,h:4,rx:2},{x:2,y:7,w:18,h:4,rx:2},{x:0,y:14,w:18,h:4,rx:2}] },
    md: { w: 28, h: 22, textSize: 20, gap: 10,
          rects: [{x:0,y:0,w:22,h:5,rx:2.5},{x:3,y:8,w:22,h:5,rx:2.5},{x:0,y:16,w:22,h:5,rx:2.5}] },
    lg: { w: 48, h: 38, textSize: 34, gap: 14,
          rects: [{x:0,y:0,w:38,h:9,rx:4.5},{x:6,y:14,w:38,h:9,rx:4.5},{x:0,y:28,w:38,h:9,rx:4.5}] },
  };
  const c   = cfg[size] || cfg.md;
  const fill      = dark ? '#4A9EE8' : '#1A6FD4';
  const textColor = dark ? '#ffffff' : '#0D1117';
  const opacities = [1, 0.6, 0.3];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap, textDecoration: 'none' }}>
      <svg width={c.w} height={c.h} viewBox={`0 0 ${c.w} ${c.h}`} style={{ flexShrink: 0 }}>
        {c.rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx}
            fill={fill} opacity={opacities[i]} />
        ))}
      </svg>
      <span style={{
        fontFamily: "'Inter', 'Arial Black', Helvetica, sans-serif",
        fontWeight: 700,
        fontSize: c.textSize,
        color: textColor,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        weave
      </span>
    </div>
  );
}
