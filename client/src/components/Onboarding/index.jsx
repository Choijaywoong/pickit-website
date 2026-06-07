import { useState } from 'react';
import StepInventory from './StepInventory';
import StepChannels from './StepChannels';

export default function Onboarding({ onComplete }) {
  const [step, setStep]               = useState(1);
  const [hasInventory, setHasInventory] = useState(null);

  function handleInventoryNext(value) {
    setHasInventory(value);
    setStep(2);
  }

  function handleChannelsNext(selectedChannels) {
    onComplete({ hasInventory, channels: selectedChannels });
  }

  if (step === 2) {
    return <StepChannels onNext={handleChannelsNext} />;
  }

  return <StepInventory onNext={handleInventoryNext} />;
}
