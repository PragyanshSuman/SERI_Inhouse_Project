import React, { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useEmotion } from '../context/EmotionContext';

interface EmotionTrackerProps {
  moduleName: string;
  isActive: boolean;
}

export default function EmotionTracker({ moduleName, isActive }: EmotionTrackerProps) {
  const { setActiveModule } = useEmotion();
  const isFocused = useIsFocused();
  const actuallyActive = isActive && isFocused;

  useEffect(() => {
    if (actuallyActive) {
      setActiveModule(moduleName);
    } else {
      setActiveModule(prev => prev === moduleName ? null : prev);
    }
  }, [actuallyActive, moduleName, setActiveModule]);

  return null;
}
