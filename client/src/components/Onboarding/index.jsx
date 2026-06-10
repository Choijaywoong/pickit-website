import { useState } from 'react';
import StepInventory  from './StepInventory';
import StepStockMode  from './StepStockMode';
import StepChannels   from './StepChannels';
import StepApiKeys    from './StepApiKeys';
import StepComplete   from './StepComplete';

// 온보딩 흐름:
//   재고여부(1) → [Yes] 공유/분리 선택(1-b) → 채널선택(2) → API키 입력(3) → 완료(complete)
//               → [No]  채널선택(2) → API키 입력(3) → 완료(complete)
export default function Onboarding({ onComplete }) {
  const [step,              setStep]              = useState(1);
  const [hasInventory,      setHasInventory]      = useState(null);
  const [totalSteps,        setTotalSteps]        = useState(null); // 직접보유 4 / 위탁 3
  const [stockMode,         setStockMode]         = useState(null); // 'shared' | 'split' | null
  const [channels,          setChannels]          = useState([]);
  const [connectedChannels, setConnectedChannels] = useState([]); // 연결 테스트 통과 채널

  function handleInventoryNext(value) {
    setHasInventory(value);
    setTotalSteps(value ? 4 : 3);
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

  function handleApiKeysComplete(connected) {
    setConnectedChannels(connected);
    setStep('complete');
  }

  if (step === 'complete') return (
    <StepComplete
      channels={channels}
      connectedChannels={connectedChannels}
      onStart={() => onComplete({ hasInventory, stockMode, channels, connectedChannels })}
    />
  );

  if (step === 3) return (
    <StepApiKeys
      channels={channels}
      totalSteps={totalSteps}
      onComplete={handleApiKeysComplete}
    />
  );

  if (step === 2) return (
    <StepChannels
      onNext={handleChannelsNext}
      displayStep={totalSteps === 4 ? 3 : 2}
      totalSteps={totalSteps}
    />
  );

  if (step === '1b') return <StepStockMode onNext={handleStockModeNext} />;
  return <StepInventory onNext={handleInventoryNext} />;
}
