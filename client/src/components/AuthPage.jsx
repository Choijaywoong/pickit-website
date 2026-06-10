import { useState } from 'react';
import { supabase } from '../supabase';
import styles from './AuthPage.module.css';
import { useLanguage } from '../i18n';
import WeaveLogo from './WeaveLogo';

export default function AuthPage({ onSuccess }) {
  const { lang, setLang, t } = useLanguage();
  const [tab,      setTab]      = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [socialLoading, setSocialLoading] = useState(''); // 'google' | 'kakao'
  const [done,     setDone]     = useState(false);

  // ── 소셜 로그인 ────────────────────────────────────────────────
  async function handleGoogle() {
    setSocialLoading('google');
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(t('errGoogleFail')); setSocialLoading(''); }
  }

  // 카카오: UI만 구현, 사업자 등록 후 Supabase Provider 설정 시 활성화
  async function handleKakao() {
    setSocialLoading('kakao');
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(t('errKakaoPreparing')); setSocialLoading(''); }
  }

  // ── 이메일 로그인 ───────────────────────────────────────────────
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
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) setError(t('errInvalidCred'));
      else if (msg.includes('User already registered')) setError(t('errAlreadyReg'));
      else if (msg.includes('Password should be at least')) setError(t('errWeakPassword'));
      else if (msg.includes('Unable to validate email')) setError(t('errInvalidEmail'));
      else setError(msg || t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }

  // 이메일 인증 완료 안내 화면
  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.checkIcon}>✉️</div>
          <h2 className={styles.doneTitle}>{t('doneTitle')}</h2>
          <p className={styles.doneDesc}>
            <strong>{email}</strong>{t('doneDesc')}
          </p>
          <button className={styles.backBtn} onClick={() => { setDone(false); setTab('login'); }}>
            {t('backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* 언어 토글 */}
        <button
          className={styles.langToggle}
          onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
        >
          {lang === 'ko' ? 'EN' : '한'}
        </button>

        {/* 로고 */}
        <div className={styles.logo}>
          <WeaveLogo size="lg" />
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className={styles.socialBtns}>

          {/* Google */}
          <button
            className={styles.socialBtn}
            onClick={handleGoogle}
            disabled={!!socialLoading}
          >
            {socialLoading === 'google' ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.2 5.2C37 38.3 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
            )}
            {t('googleBtn')}
          </button>

          {/* 카카오 */}
          <button
            className={`${styles.socialBtn} ${styles.kakaoBtn}`}
            onClick={handleKakao}
            disabled={!!socialLoading}
          >
            {socialLoading === 'kakao' ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12 3C6.48 3 2 6.72 2 11.3c0 2.9 1.88 5.45 4.7 6.93l-.95 3.53c-.08.3.26.54.52.37L10.6 19.8c.45.06.9.1 1.4.1 5.52 0 10-3.72 10-8.3C22 6.72 17.52 3 12 3z"/>
              </svg>
            )}
            {t('kakaoBtn')}
            <span className={styles.comingSoon}>{t('comingSoon')}</span>
          </button>
        </div>

        {/* 구분선 */}
        <div className={styles.divider}>
          <span>{t('authDivider')}</span>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'login'  ? styles.tabActive : ''}`}
            onClick={() => { setTab('login');  setError(''); }}>{t('tabLogin')}</button>
          <button className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}>{t('tabSignup')}</button>
        </div>

        {/* 이메일 폼 */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>{t('emailLabel')}</label>
          <input className={styles.input} type="email" placeholder="seller@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email" />

          <label className={styles.label}>{t('passwordLabel')}</label>
          <input className={styles.input} type="password" placeholder={t('passwordHint')}
            value={password} onChange={(e) => setPassword(e.target.value)}
            required autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading
              ? (tab === 'login' ? t('loggingIn') : t('signingUp'))
              : (tab === 'login' ? t('loginBtn') : t('signupBtn'))}
          </button>
        </form>

        {tab === 'login' && (
          <p className={styles.switchHint}>
            {t('switchToSignup')}{' '}
            <button className={styles.switchLink} onClick={() => { setTab('signup'); setError(''); }}>{t('tabSignup')}</button>
          </p>
        )}
        {tab === 'signup' && (
          <p className={styles.switchHint}>
            {t('switchToLogin')}{' '}
            <button className={styles.switchLink} onClick={() => { setTab('login'); setError(''); }}>{t('tabLogin')}</button>
          </p>
        )}
      </div>
    </div>
  );
}
