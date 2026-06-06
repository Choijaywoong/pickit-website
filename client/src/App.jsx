import { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import ChatWidget from './components/ChatWidget';

// localStorage key: 온보딩 완료 여부 저장
const ONBOARDING_KEY = 'pickit_onboarding';

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    if (saved) setOnboardingDone(true);
    setLoading(false);
  }, []);

  function handleOnboardingComplete(data) {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    setOnboardingDone(true);
  }

  if (loading) return null;

  return (
    <>
      {!onboardingDone && <Onboarding onComplete={handleOnboardingComplete} />}
      {onboardingDone && <ChatWidget />}
    </>
  );
}
