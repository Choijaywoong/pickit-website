import { useState, useEffect } from 'react';
import { supabase }         from './supabase';
import { setAuthToken }     from './auth';
import { useLanguage }      from './i18n';
import LandingPage           from './components/LandingPage';
import AuthPage              from './components/AuthPage';
import Onboarding            from './components/Onboarding/index';
import ConnectionStatus      from './components/ConnectionStatus';
import ChatWidget            from './components/ChatWidget';
import DemoPanel             from './components/DemoPanel';
import ToastContainer, { showToast } from './components/Toast';
import CSChatButton          from './components/CS/CSChatButton';
import { logActivity }       from './logActivity';

const ONBOARDING_KEY = 'pickit_onboarding';

// 단계: 'auth' → 'onboarding' → 'connection' → 'chat'
// Supabase 미설정 시 'auth' 단계를 건너뛰고 바로 'onboarding'부터 시작
export default function App() {
  const { t } = useLanguage();
  const [step,     setStep]     = useState('loading');
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    async function init() {
      // 어드민 라우트에서는 App이 렌더되지 않지만, 혹시 auth 이벤트가 흘러오는 경우 차단
      if (window.location.pathname.startsWith('/admin')) return;

      // 외부 랜딩 페이지(weave-synchub)에서 ?start=1로 진입 시 바로 로그인 화면으로
      if (new URLSearchParams(window.location.search).get('start') === '1') {
        setStep('auth');
        return;
      }

      // Supabase 미설정(개발 모드) → 바로 onboarding 또는 chat
      if (!supabase) {
        const saved = localStorage.getItem(ONBOARDING_KEY);
        if (saved) {
          setChannels(JSON.parse(saved).channels || []);
          setStep('chat');
        } else {
          setStep('landing');
        }
        return;
      }

      // Supabase 설정됨 → 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
        const saved = localStorage.getItem(ONBOARDING_KEY);
        if (saved) {
          setChannels(JSON.parse(saved).channels || []);
          setStep('chat');
          logActivity('session_start');
        } else {
          setStep('onboarding');
        }
      } else {
        setStep('landing');
      }
    }

    init();

    // 세션 변화 감지 (이메일 인증 후 자동 로그인 등)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (window.location.pathname.startsWith('/admin')) return;
        if (session) {
          setAuthToken(session.access_token);
          const saved = localStorage.getItem(ONBOARDING_KEY);
          if (saved) {
            setChannels(JSON.parse(saved).channels || []);
            setStep('chat');
            logActivity('session_start');
          } else {
            setStep('onboarding');
          }
        } else {
          setAuthToken(null);
          setStep('auth');
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // 사이드바 "채널 변경" 버튼에서 온보딩 재진입
  useEffect(() => {
    function handleRestart() {
      setStep('onboarding');
      setChannels([]);
    }
    window.addEventListener('pickit-restart-onboarding', handleRestart);
    return () => window.removeEventListener('pickit-restart-onboarding', handleRestart);
  }, []);

  // 401 세션 만료: authFetch가 감지 → 자동 로그아웃 + 토스트 안내
  useEffect(() => {
    async function handleSessionExpired() {
      if (supabase) await supabase.auth.signOut();
      setAuthToken(null);
      setStep('auth');
      showToast(t('sessionExpired'), 'error', 5000);
    }
    window.addEventListener('pickit-session-expired', handleSessionExpired);
    return () => window.removeEventListener('pickit-session-expired', handleSessionExpired);
  }, []);

  function handleAuthSuccess(session) {
    setAuthToken(session.access_token);
    const saved = localStorage.getItem(ONBOARDING_KEY);
    if (saved) {
      setChannels(JSON.parse(saved).channels || []);
      setStep('chat');
    } else {
      setStep('onboarding');
    }
  }

  function handleOnboardingComplete(data) {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    setChannels(data.channels);
    setStep('connection');
    logActivity('onboarding_complete', { channels: data.channels, channelCount: data.channels.length });
  }

  function handleConnectionStart() {
    setStep('chat');
    logActivity('channel_connected', { channels });
  }

  if (step === 'loading') return null;

  return (
    <>
      {step === 'landing'     && <LandingPage onStart={() => setStep('auth')} />}
      {step === 'auth'        && <AuthPage onSuccess={handleAuthSuccess} onBack={() => setStep('landing')} />}
      {step === 'onboarding'  && <Onboarding onComplete={handleOnboardingComplete} />}
      {step === 'connection'  && <ConnectionStatus channels={channels} onStart={handleConnectionStart} />}
      {step === 'chat'        && <ChatWidget />}
      <DemoPanel />
      <CSChatButton />
      <ToastContainer />
    </>
  );
}
