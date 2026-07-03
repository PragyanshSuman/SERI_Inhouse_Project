import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { syncEmotionData, analyzeEmotionFrame, analyzeAudioEmotion } from '../services/emotionApiService';
import AudioSessionManager from '../services/AudioSessionManager';
import { useAuth } from './AuthContext';

const FEATURE_NAME_MAP: Record<string, string> = {
  'Letter Tracing': 'Letter Tracing',
  'Tracing Menu': 'Letter Tracing',
  'Tracing Dashboard': 'Letter Tracing',
  'Alphabet Playground': 'Letter Tracing',
  'Letter Mastery': 'Letter Tracing',
  'Legacy Tracing': 'Letter Tracing',
  'Phonic Check': 'Magic Check (Phonics)',
  'Phonic Check Studio': 'Magic Check (Phonics)',
  'Magic Check Dashboard': 'Magic Check (Phonics)',
  'Magic Check Result': 'Magic Check (Phonics)',
  'Magic Words': 'Magic Word Studio',
  'Writing Assessment': 'Writing Assessment',
  'Word Ninja': 'Word Ninja',
  'Sight Words Dashboard': 'Word Ninja',
  'Rhyming Match': 'Rhyme Time',
  'Rhyme Dashboard': 'Rhyme Time',
  'Letter Sorting': 'Visual Discrimination',
  'Odd One Out': 'Visual Discrimination',
  'Visual Discrimination Dashboard': 'Visual Discrimination',
  'Home Dashboard': 'Home',
};

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
  
  // Camera & Audio Refs
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const cameraRef = useRef<any>(null);
  const isCameraReadyRef = useRef(false);
  const isProcessingRef = useRef(false);
  const faceFailCountRef = useRef(0);
  const lockId = useRef(`emotion_tracker_global_${Date.now()}`).current;

  // ── CRITICAL: Wipe all in-memory session data when user logs out or switches ──
  useEffect(() => {
    const unsubscribe = onLogout(() => {
      console.log('[EmotionContext] User logged out — clearing session data');
      setSessionData([]);
      setActiveModule(null);
    });
    return unsubscribe;  // cleanup on unmount
  }, [onLogout]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!audioPermission?.granted) requestAudioPermission();
  }, [permission, audioPermission]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let recordingRef: Audio.Recording | null = null;

    const unsubscribe = AudioSessionManager.subscribe((_activeSession, evictedId) => {
      if (evictedId === lockId && recordingRef) {
        console.log(`[EmotionContext] Evicted from Mic!`);
        recordingRef.stopAndUnloadAsync().catch(() => {});
        recordingRef = null;
      }
    });

    const captureAudioEmotion = async (currentModule: string, featureName: string) => {
      const lockAcquired = await AudioSessionManager.requestLock(lockId, 'passive', 'EmotionEar');
      if (!lockAcquired) return;

      try {
        await AudioSessionManager.configureRecordingSession();
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
        recordingRef = recording;
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (recordingRef) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          recordingRef = null;

          if (uri) {
            const result = await analyzeAudioEmotion(uri);
            if (result && !result.error && result.dominant_emotion) {
              setSessionData(prev => [...prev, {
                timestamp: Date.now(),
                moduleName: currentModule,
                featureName,
                dominantEmotion: result.dominant_emotion,
                concentrationScore: result.concentration_index ?? 0,
                source: 'audio',
              }]);
              console.log(`[EmotionTracker - ${featureName}] 🎤 Audio: ${result.dominant_emotion}`);
            }
          }
        }
      } catch (error) {
        console.log(`[EmotionContext] Audio error:`, error);
      } finally {
        AudioSessionManager.releaseLock(lockId);
        recordingRef = null;
      }
    };

    const captureAndAnalyze = async () => {
      if (!activeModule || !cameraRef.current || isProcessingRef.current || !isCameraReadyRef.current) return;
      
      const currentModule = activeModule;
      const featureName = FEATURE_NAME_MAP[currentModule] || currentModule;

      try {
        isProcessingRef.current = true;
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3, base64: true, shutterSound: false,
        });

        if (photo.base64) {
          const result = await analyzeEmotionFrame(photo.base64);

          if (result && result.face_detected) {
            faceFailCountRef.current = 0;
            setSessionData(prev => [...prev, {
              timestamp: Date.now(),
              moduleName: currentModule,
              featureName,
              dominantEmotion: result.dominant_emotion,
              concentrationScore: result.concentration_index ?? 0,
              source: 'face',
            }]);
            console.log(`[EmotionTracker - ${featureName}] 👁 Face: ${result.dominant_emotion}`);
          } else {
            faceFailCountRef.current += 1;
            if (faceFailCountRef.current >= 2) {
              faceFailCountRef.current = 0;
              captureAudioEmotion(currentModule, featureName);
            }
          }
        }
      } catch (error) {
        console.log(`[EmotionContext] Camera error:`, error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    if (activeModule && permission?.granted) {
      // Capture the first frame immediately, instead of missing short <5s interactions
      setTimeout(() => {
        captureAndAnalyze();
      }, 100);
      interval = setInterval(captureAndAnalyze, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
      unsubscribe();
      AudioSessionManager.releaseLock(lockId);
    };
  }, [activeModule, permission, audioPermission]);

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
      {permission?.granted && (
        <View style={styles.hiddenContainer} pointerEvents="none">
          <CameraView 
            ref={cameraRef} 
            style={styles.camera} 
            facing="front" 
            mute={true} 
            onCameraReady={() => { isCameraReadyRef.current = true; }}
          />
        </View>
      )}
    </EmotionContext.Provider>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    opacity: 0.01,
    zIndex: 1000,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
});

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (context === undefined) {
    throw new Error('useEmotion must be used within an EmotionProvider');
  }
  return context;
};
