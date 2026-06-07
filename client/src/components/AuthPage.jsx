import { useState } from 'react';
import { supabase } from '../supabase';
import styles from './AuthPage.module.css';

/**
 * AuthPage — PICKIT 로그인 / 회원가입
 * onSuccess(session) 콜백으로 Supabase 세션 전달
 */
export default function AuthPage({ onSuccess }) {
  const [tab,      setTab]      = useState('login');   // 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);     // 회원가입 후 이메일 확인 안내

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess(data.session);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setDone(true);
      }
    } catch (err) {
      const msg = err.message || '오류가 발생했습니다.';
      // 영문 에러 메시지를 한국어로 변환
      if (msg.includes('Invalid login credentials'))
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('User already registered'))
        setError('이미 가입된 이메일입니다. 로그인해 주세요.');
      else if (msg.includes('Password should be at least'))
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
      else if (msg.includes('Unable to validate email'))
        setError('올바른 이메일 주소를 입력해 주세요.');
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // 회원가입 성공 → 이메일 확인 안내
  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.checkIcon}>✉️</div>
          <h2 className={styles.doneTitle}>이메일을 확인해 주세요</h2>
          <p className={styles.doneDesc}>
            <strong>{email}</strong>으로 인증 링크를 보냈습니다.<br />
            링크를 클릭하면 자동으로 로그인됩니다.
          </p>
          <button className={styles.backBtn} onClick={() => { setDone(false); setTab('login'); }}>
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* 로고 */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>P</div>
          <div>
            <div className={styles.logoName}>PICKIT</div>
            <div className={styles.logoSub}>멀티채널 AI 운영 서비스</div>
          </div>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'login'  ? styles.tabActive : ''}`}
            onClick={() => { setTab('login');  setError(''); }}
          >로그인</button>
          <button
            className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >회원가입</button>
        </div>

        {/* 폼 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>이메일</label>
          <input
            className={styles.input}
            type="email"
            placeholder="seller@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className={styles.label}>비밀번호</label>
          <input
            className={styles.input}
            type="password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading
              ? (tab === 'login' ? '로그인 중...' : '가입 중...')
              : (tab === 'login' ? '로그인'       : '회원가입')}
          </button>
        </form>

        {tab === 'login' && (
          <p className={styles.switchHint}>
            아직 계정이 없으신가요?{' '}
            <button className={styles.switchLink} onClick={() => { setTab('signup'); setError(''); }}>
              회원가입
            </button>
          </p>
        )}
        {tab === 'signup' && (
          <p className={styles.switchHint}>
            이미 계정이 있으신가요?{' '}
            <button className={styles.switchLink} onClick={() => { setTab('login'); setError(''); }}>
              로그인
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
