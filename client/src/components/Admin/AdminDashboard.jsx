// 관리자 대시보드 — CS 탭 + 지표 탭 (AdminGuard 통과 후에만 렌더됨)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import styles from './Admin.module.css';
import CSTab      from './CSTab';
import MetricsTab from './MetricsTab';

const TABS = [
  { key: 'cs',      label: 'CS 문의' },
  { key: 'metrics', label: '지표'    },
];

export default function AdminDashboard() {
  const navigate    = useNavigate();
  const [tab, setTab] = useState('cs');

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className={styles.dashboardWrap}>
      {/* 헤더 */}
      <header className={styles.dashHeader}>
        <div>
          <span className={styles.dashHeaderLogo}>PICKIT</span>
          <span className={styles.dashHeaderSub}>관리자 대시보드</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
      </header>

      {/* 탭 네비게이션 */}
      <nav className={styles.tabNav}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* 탭 컨텐츠 */}
      <div className={styles.tabContent}>
        {tab === 'cs'      && <CSTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  );
}
