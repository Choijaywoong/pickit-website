// 정적 landing.html을 iframe으로 렌더하고, CTA 클릭 시 onStart를 호출하는 래퍼 컴포넌트
import { useEffect } from 'react';

export default function LandingPage({ onStart }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'start') onStart();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onStart]);

  return (
    <iframe
      src="/landing.html"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 1,
      }}
      title="PICKIT 랜딩 페이지"
    />
  );
}
