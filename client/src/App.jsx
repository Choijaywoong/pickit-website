import { useState, useEffect } from 'react';
import { supabase }         from './supabase';
import { setAuthToken }     from './auth';
import AuthPage              from './components/AuthPage';
import Onboarding            from './components/Onboarding/index';
import ConnectionStatus      from './components/ConnectionStatus';
import ChatWidget            from './components/ChatWidget';
import DemoPanel             from './components/DemoPanel';
import ToastContainer        from './components/Toast';

const ONBOARDING_KEY = 'pickit_onboarding';

// 단계: 'auth' → 'onboarding' → 'connection' → 'chat'
// Supabase 미설정 시 'auth' 단계를 건너뛰고 바로 'onboarding'부터 시작
export default function App() {
  const [step,     setStep]     = useState('loading');
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    async function init() {
      // Supabase 미설정(개발 모드) → 바로 onboarding 또는 chat
      if (!supabase) {
        const saved = localStorage.getItem(ONBOARDING_KEY);
        if (saved) {
          setChannels(JSON.parse(saved).channels || []);
          setStep('chat');
        } else {
          setStep('onboarding');
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
        } else {
          setStep('onboarding');
        }
      } else {
        setStep('auth');
      }
    }

    init();

    // 세션 변화 감지 (이메일 인증 후 자동 로그인 등)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setAuthToken(session.access_token);
          const saved = localStorage.getItem(ONBOARDING_KEY);
          if (saved) {
            setChannels(JSON.parse(saved).channels || []);
            setStep('chat');
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
  }

  function handleConnectionStart() {
    setStep('chat');
  }

  if (step === 'loading') return null;

  return (
    <>
      {step === 'auth'        && <AuthPage onSuccess={handleAuthSuccess} />}
      {step === 'onboarding'  && <Onboarding onComplete={handleOnboardingComplete} />}
      {step === 'connection'  && <ConnectionStatus channels={channels} onStart={handleConnectionStart} />}
      {step === 'chat'        && <ChatWidget />}
      <DemoPanel />
      <ToastContainer />
    </>
  );
}
