import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { syncEmotionData } from '../services/emotionApiService';
import { useAuth } from './AuthContext';

export type EmotionDataPoint = {
  timestamp: number;
  moduleName: string;
  featureName: string;   // Human-readable: "Letter Tracing", "Magic Check", etc.
  dominantEmotion: string;
  concentrationScore: number;
  source: 'face' | 'audio';
};

type EmotionContextType = {
  sessionData: EmotionDataPoint[];
  addEmotionData: (data: EmotionDataPoint) => void;
  clearSession: () => void;
  activeModule: string | null;
  setActiveModule: (moduleName: string | null) => void;
};

const EmotionContext = createContext<EmotionContextType | undefined>(undefined);

export const EmotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionData, setSessionData] = useState<EmotionDataPoint[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const { token, onLogout } = useAuth();

  // ── CRITICAL: Wipe all in-memory session data when user logs out or switches ──
  useEffect(() => {
    const unsubscribe = onLogout(() => {
      console.log('[EmotionContext] User logged out — clearing session data');
      setSessionData([]);
      setActiveModule(null);
    });
    return unsubscribe;  // cleanup on unmount
  }, [onLogout]);

  const addEmotionData = (data: EmotionDataPoint) => {
    setSessionData((prev) => [...prev, data]);
  };

  const clearSession = async () => {
    if (sessionData.length > 0 && token) {
      try {
        await syncEmotionData(token, sessionData);
        console.log('Successfully synced session data to cloud!');
      } catch (err) {
        console.error('Failed to sync backend DB', err);
      }
    }
    setSessionData([]);
  };

  return (
    <EmotionContext.Provider value={{ sessionData, addEmotionData, clearSession, activeModule, setActiveModule }}>
      {children}
    </EmotionContext.Provider>
  );
};

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (context === undefined) {
    throw new Error('useEmotion must be used within an EmotionProvider');
  }
  return context;
};
