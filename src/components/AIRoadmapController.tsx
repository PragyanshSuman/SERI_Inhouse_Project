import { useEffect, useRef } from 'react';
import { useAIRoadmap } from '../context/AIRoadmapContext';
import { useEmotion } from '../context/EmotionContext';

/**
 * AIRoadmapController
 * 
 * A render-less component that sits inside both EmotionContext and AIRoadmapContext.
 * It polls on a 30-second interval and:
 *  - Checks real-time frustration rate → triggers US-17 Adaptive Pathing
 *  - Checks cumulative screen time   → triggers US-18 Wellness Advisor
 * 
 * Must be placed inside <EmotionProvider> and <AIRoadmapProvider> in App.tsx.
 */
const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds

export default function AIRoadmapController() {
  const { sessionData } = useEmotion();
  const { checkFrustration, checkScreenTime } = useAIRoadmap();

  // Keep a stable ref to sessionData so the interval always reads latest value
  const sessionDataRef = useRef(sessionData);
  useEffect(() => {
    sessionDataRef.current = sessionData;
  }, [sessionData]);

  const checkFrustrationRef = useRef(checkFrustration);
  useEffect(() => { checkFrustrationRef.current = checkFrustration; }, [checkFrustration]);

  const checkScreenTimeRef = useRef(checkScreenTime);
  useEffect(() => { checkScreenTimeRef.current = checkScreenTime; }, [checkScreenTime]);

  useEffect(() => {
    // Run immediately on mount for fast feedback during testing
    checkFrustrationRef.current(sessionDataRef.current);
    checkScreenTimeRef.current();

    const interval = setInterval(() => {
      checkFrustrationRef.current(sessionDataRef.current);
      checkScreenTimeRef.current();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // Empty deps: stable refs ensure always-current data

  return null; // No UI — purely logic
}
