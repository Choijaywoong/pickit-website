import { useState, useEffect, useCallback } from 'react';
import styles from './Toast.module.css';

// 전역 토스트 이벤트 버스
export function showToast(message, type = 'success', duration = 3500) {
  window.dispatchEvent(new CustomEvent('pickit-toast', { detail: { message, type, duration } }));
}

/**
 * ToastContainer — App 최상단에 한 번만 마운트
 * 사용: showToast('저장 완료', 'success')
 *       showToast('에러 발생', 'error')
 *       showToast('주의사항', 'warning')
 *       showToast('안내', 'info')
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handle(e) {
      const { message, type, duration } = e.detail;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), duration || 3500);
    }
    window.addEventListener('pickit-toast', handle);
    return () => window.removeEventListener('pickit-toast', handle);
  }, [remove]);

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>
            {t.type === 'success' ? '✓' :
             t.type === 'error'   ? '✕' :
             t.type === 'warning' ? '!' : 'i'}
          </span>
          <span className={styles.msg}>{t.message}</span>
          <button className={styles.close} onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
