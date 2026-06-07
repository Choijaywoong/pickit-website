import { useState } from 'react';
import StepInventory from './StepInventory';
import StepChannels  from './StepChannels';
import StepApiKeys   from './StepApiKeys';

// 온보딩 흐름: 재고 여부(1) → 채널 선택(2) → 채널별 API 키 입력(3) → 완료
export default function Onboarding({ onComplete }) {
  const [step,         setStep]         = useState(1);
  const [hasInventory, setHasInventory] = useState(null);
  const [channels,     setChannels]     = useState([]);

  function handleInventoryNext(value) {
    setHasInventory(value);
    setStep(2);
  }

  function handleChannelsNext(selectedChannels) {
    setChannels(selectedChannels);
    setStep(3);
  }

  function handleApiKeysComplete() {
    onComplete({ hasInventory, channels });
  }

  if (step === 3) {
    return <StepApiKeys channels={channels} onComplete={handleApiKeysComplete} />;
  }

  if (step === 2) {
    return <StepChannels onNext={handleChannelsNext} />;
  }

  return <StepInventory onNext={handleInventoryNext} />;
}
