import { useState } from 'react';
import StepInventory  from './StepInventory';
import StepStockMode  from './StepStockMode';
import StepChannels   from './StepChannels';
import StepApiKeys    from './StepApiKeys';

// 온보딩 흐름:
//   재고여부(1) → [Yes] 공유/분리 선택(1-b) → 채널선택(2) → API키 입력(3) → 완료
//               → [No]  채널선택(2) → API키 입력(3) → 완료
export default function Onboarding({ onComplete }) {
  const [step,         setStep]         = useState(1);
  const [hasInventory, setHasInventory] = useState(null);
  const [stockMode,    setStockMode]    = useState(null); // 'shared' | 'split' | null
  const [channels,     setChannels]     = useState([]);

  function handleInventoryNext(value) {
    setHasInventory(value);
    // hasInventory=Yes → 공유/분리 질문으로, No → 채널 선택으로 바로
    setStep(value ? '1b' : 2);
  }

  function handleStockModeNext(mode) {
    setStockMode(mode);
    setStep(2);
  }

  function handleChannelsNext(selectedChannels) {
    setChannels(selectedChannels);
    setStep(3);
  }

  function handleApiKeysComplete() {
    onComplete({ hasInventory, stockMode, channels });
  }

  if (step === 3)   return <StepApiKeys channels={channels} onComplete={handleApiKeysComplete} />;
  if (step === 2)   return <StepChannels onNext={handleChannelsNext} />;
  if (step === '1b') return <StepStockMode onNext={handleStockModeNext} />;
  return <StepInventory onNext={handleInventoryNext} />;
}
