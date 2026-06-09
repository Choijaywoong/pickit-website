// 관리자 로그인 페이지 — Supabase Auth + profiles.role 확인
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import styles from './Admin.module.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Supabase Auth 로그인
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr || !data.session) {
        setError('이메일 또는 비밀번호를 확인해 주세요.');
        return;
      }

      // 2) profiles.role 확인
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (profileErr || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setError('관리자 권한이 없습니다.');
        return;
      }

      // 3) 관리자 확인 → 대시보드로 이동
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={handleLogin}>
        <div className={styles.loginLogo}>PICKIT</div>
        <div className={styles.loginTitle}>관리자 로그인</div>

        <div className={styles.loginField}>
          <label className={styles.loginLabel}>이메일</label>
          <input
            className={styles.loginInput}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />
        </div>

        <div className={styles.loginField}>
          <label className={styles.loginLabel}>비밀번호</label>
          <input
            className={styles.loginInput}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && <div className={styles.loginError}>{error}</div>}

        <button className={styles.loginBtn} type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
