import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { EmotionDataPoint } from './EmotionContext';
import { useSettings } from './SettingsContext';
import { WordService } from '../services/WordService';

// ─── Module suggestions for US-17 ────────────────────────────────────────────
export type ModuleSuggestion = {
  name: string;
  icon: string;
  color: string;
  subtitle: string;
  route: string;
};

export const MODULE_SUGGESTIONS: ModuleSuggestion[] = [
  { name: 'Rhyme Time',     icon: '🎵', color: '#8B5CF6', subtitle: 'Fun & relaxing',     route: 'RhymeDashboard' },
  { name: 'Word Ninja',     icon: '🥷', color: '#F43F5E', subtitle: 'Fast-paced action',  route: 'SightWordsDashboard' },
  { name: 'Odd One Out',    icon: '🧠', color: '#0EA5E9', subtitle: 'Visual puzzles',      route: 'VisualDiscriminationDashboard' },
  { name: 'Magic Words',    icon: '✨', color: '#D97706', subtitle: 'Pronunciation play',  route: 'PhonicsPhonemes' },
  { name: 'Letter Tracing', icon: '🔤', color: '#4F46E5', subtitle: 'Draw the alphabet',  route: 'LetterTracing' },
];

// ─── Outdoor activities for US-18 ────────────────────────────────────────────
export type OutdoorActivity = {
  name: string;
  icon: string;
  description: string;
};

export const OUTDOOR_ACTIVITIES: OutdoorActivity[] = [
  { name: 'Go for a Walk',    icon: '🚶', description: 'Take a 10-minute walk outside' },
  { name: 'Jump & Stretch',   icon: '🤸', description: '5 minutes of jumping jacks and stretches' },
  { name: 'Water the Plants', icon: '🌱', description: 'Help water the garden or indoor plants' },
  { name: 'Cloud Watching',   icon: '☁️', description: 'Lie down and spot shapes in clouds' },
  { name: 'Draw with Chalk',  icon: '🎨', description: 'Create art on the sidewalk' },
  { name: 'Bird Watching',    icon: '🐦', description: 'Spot and name birds around you' },
  { name: 'Obstacle Course',  icon: '🏃', description: 'Set up a fun course in the garden' },
];


// How many recent emotion logs to consider for frustration check
const FRUSTRATION_WINDOW = 8;
// After dismissing, wait before re-checking frustration (10 minutes)
const ADAPTIVE_COOLDOWN_MS = 10 * 60 * 1000;

// Map user settings ('low' | 'medium' | 'high') to raw percentages
const SENSITIVITY_THRESHOLDS = {
  high: 0.50,   // Triggers if 50% of recent logs are frustrated (very protective/sensitive)
  medium: 0.70, // Standard 70%
  low: 0.90     // Takes a lot to trigger (90%)
};

// ─── Context types ────────────────────────────────────────────────────────────
type AIRoadmapContextType = {
  // US-17
  showAdaptiveModal: boolean;
  dismissAdaptiveModal: () => void;
  checkFrustration: (logs: EmotionDataPoint[]) => void;

  // US-18
  showWellnessModal: boolean;
  dismissWellnessModal: () => void;
  checkScreenTime: () => void;
  elapsedMinutes: () => number;
  nextThresholdMinutes: number;

  // Lexical Progression (New)
  getRecommendedWords: (accuracy: number) => string[];
};

const AIRoadmapContext = createContext<AIRoadmapContextType | undefined>(undefined);

export const AIRoadmapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();

  // US-17 state
  const [showAdaptiveModal, setShowAdaptiveModal] = useState(false);
  const adaptiveCooldownRef = useRef<number | null>(null);

  // US-18 state
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [nextThresholdMinutes, setNextThresholdMinutes] = useState(settings.maxScreenTimeMins);
  const sessionStartRef = useRef(Date.now());
  const firedThresholds = useRef<Set<number>>(new Set());

  // Update next threshold label dynamically if parental settings change
  useEffect(() => {
    setNextThresholdMinutes(settings.maxScreenTimeMins);
  }, [settings.maxScreenTimeMins]);

  // ── US-17: Frustration detection ───────────────────────────────────────────
  const checkFrustration = useCallback((logs: EmotionDataPoint[]) => {
    if (showAdaptiveModal) return;
    // Respect cooldown
    if (adaptiveCooldownRef.current && Date.now() < adaptiveCooldownRef.current) return;

    const window = logs.slice(-FRUSTRATION_WINDOW);
    if (window.length < 3) return;

    const frustrationCount = window.filter(log => {
      const emo = log.dominantEmotion.toLowerCase();
      return emo === 'angry' || emo === 'disgust' || emo === 'fear' || log.concentrationScore < 30;
    }).length;

    const rate = frustrationCount / window.length;
    
    // Read dynamic threshold from parental controls
    const triggerThreshold = SENSITIVITY_THRESHOLDS[settings.frustrationSensitivity || 'medium'];

    if (rate >= triggerThreshold) {
      console.log(`[AIRoadmap] 🚨 Frustration at ${Math.round(rate * 100)}% (Threshold: ${Math.round(triggerThreshold * 100)}%) — launching Adaptive Pathing`);
      setShowAdaptiveModal(true);
    }
  }, [showAdaptiveModal, settings.frustrationSensitivity]);

  const dismissAdaptiveModal = useCallback(() => {
    setShowAdaptiveModal(false);
    // Set cooldown so we don't spam the user
    adaptiveCooldownRef.current = Date.now() + ADAPTIVE_COOLDOWN_MS;
  }, []);

  // ── US-18: Screen time check ────────────────────────────────────────────────
  const elapsedMinutes = useCallback(() => {
    return (Date.now() - sessionStartRef.current) / 60000;
  }, []);

  const checkScreenTime = useCallback(() => {
    if (showWellnessModal) return;
    const elapsed = Date.now() - sessionStartRef.current;
    
    // Read dynamic threshold from parental controls (min 15 mins)
    const dynamicThresholdMS = Math.max(15, settings.maxScreenTimeMins) * 60 * 1000;

    if (elapsed >= dynamicThresholdMS && !firedThresholds.current.has(dynamicThresholdMS)) {
      firedThresholds.current.add(dynamicThresholdMS);
      const mins = Math.round(dynamicThresholdMS / 60000);
      console.log(`[AIRoadmap] ⏱ Parental Limit Hit: Screen time ≥ ${mins}min — launching Wellness Advisor`);
      setShowWellnessModal(true);
      
      // Compute next threshold label (incremented by the same maxScreenTime limit)
      setNextThresholdMinutes(mins + settings.maxScreenTimeMins);
    }
  }, [showWellnessModal, settings.maxScreenTimeMins]);

  const dismissWellnessModal = useCallback(() => {
    setShowWellnessModal(false);
  }, []);

  // ── Lexical Progression: Dynamic Difficulty Logic ─────────────────────────
  const getRecommendedWords = useCallback((accuracy: number): string[] => {
    // If accuracy is high (>85%), push for harder words (+1.0 DDS)
    // If accuracy is low (<60%), stay in easier range (-0.5 DDS)
    let minDds = 1.0;
    let maxDds = 3.0;

    if (accuracy > 85) {
      minDds = 4.0;
      maxDds = 7.0;
    } else if (accuracy > 70) {
      minDds = 3.0;
      maxDds = 5.0;
    }

    return WordService.getWordsInRange(minDds, maxDds, 5);
  }, []);

  return (
    <AIRoadmapContext.Provider
      value={{
        showAdaptiveModal,
        dismissAdaptiveModal,
        checkFrustration,
        showWellnessModal,
        dismissWellnessModal,
        checkScreenTime,
        elapsedMinutes,
        nextThresholdMinutes,
        getRecommendedWords,
      }}
    >
      {children}
    </AIRoadmapContext.Provider>
  );
};

export const useAIRoadmap = (): AIRoadmapContextType => {
  const context = useContext(AIRoadmapContext);
  if (!context) throw new Error('useAIRoadmap must be used within AIRoadmapProvider');
  return context;
};
