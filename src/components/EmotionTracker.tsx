import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useEmotion } from '../context/EmotionContext';
import { analyzeEmotionFrame, analyzeAudioEmotion } from '../services/emotionApiService';
import AudioSessionManager from '../services/AudioSessionManager';

// Maps the actual moduleName strings (used in JSX) to clean feature names for the report.
// Covers all 7 dashboard features and their sub-screens.
const FEATURE_NAME_MAP: Record<string, string> = {
  // 1. Letter Tracing
  'Letter Tracing': 'Letter Tracing',
  'Tracing Menu': 'Letter Tracing',
  'Tracing Dashboard': 'Letter Tracing',
  'Alphabet Playground': 'Letter Tracing',
  'Letter Mastery': 'Letter Tracing',
  'Legacy Tracing': 'Letter Tracing',

  // 2. Magic Check (Phonics)
  'Phonic Check': 'Magic Check (Phonics)',
  'Magic Check Dashboard': 'Magic Check (Phonics)',
  'Magic Check Result': 'Magic Check (Phonics)',

  // 3. Magic Word Studio (Phonics-Phonemes)
  'Magic Words': 'Magic Word Studio',

  // 4. Writing Assessment (Original App)
  'Writing Assessment': 'Writing Assessment',

  // 5. Word Ninja (Sight Words)
  'Word Ninja': 'Word Ninja',
  'Sight Words Dashboard': 'Word Ninja',

  // 6. Rhyme Time
  'Rhyming Match': 'Rhyme Time',
  'Rhyme Dashboard': 'Rhyme Time',

  // 7. Visual Discrimination
  'Letter Sorting': 'Visual Discrimination',
  'Odd One Out': 'Visual Discrimination',
  'Visual Discrimination Dashboard': 'Visual Discrimination',

  // General
  'Home Dashboard': 'Home',
};

interface EmotionTrackerProps {
  moduleName: string;
  isActive: boolean;
}

export default function EmotionTracker({ moduleName, isActive }: EmotionTrackerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const cameraRef = useRef<any>(null);
  const { addEmotionData } = useEmotion();

  const isProcessingRef = useRef(false);
  const faceFailCountRef = useRef(0);
  const lockId = useRef(`emotion_tracker_${moduleName}_${Date.now()}`).current;
  const featureName = FEATURE_NAME_MAP[moduleName] || moduleName;

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!audioPermission?.granted) requestAudioPermission();
  }, [permission, audioPermission]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let recordingRef: Audio.Recording | null = null;

    const unsubscribe = AudioSessionManager.subscribe((_activeSession, evictedId) => {
      if (evictedId === lockId && recordingRef) {
        console.log(`[EmotionTracker - ${moduleName}] Evicted from Mic!`);
        recordingRef.stopAndUnloadAsync().catch(() => {});
        recordingRef = null;
      }
    });

    const captureAudioEmotion = async () => {
      const lockAcquired = await AudioSessionManager.requestLock(lockId, 'passive', 'EmotionEar');
      if (!lockAcquired) return;

      try {
        await AudioSessionManager.configureRecordingSession();

        const recording = new Audio.Recording();
        recordingRef = recording;
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
        await recording.startAsync();

        await new Promise(resolve => setTimeout(resolve, 3000));

        if (recordingRef) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          recordingRef = null;

          if (uri) {
            const result = await analyzeAudioEmotion(uri);
            if (result && !result.error && result.dominant_emotion) {
              addEmotionData({
                timestamp: Date.now(),
                moduleName,
                featureName,
                dominantEmotion: result.dominant_emotion,
                concentrationScore: result.concentration_index ?? 0,
                source: 'audio',
              });
              console.log(`[EmotionTracker - ${featureName}] 🎤 Audio: ${result.dominant_emotion}`);
            }
          }
        }
      } catch (error) {
        console.log(`[EmotionTracker - ${moduleName}] Audio error:`, error);
      } finally {
        AudioSessionManager.releaseLock(lockId);
        recordingRef = null;
      }
    };

    const captureAndAnalyze = async () => {
      if (!isActive || !cameraRef.current || isProcessingRef.current) return;

      try {
        isProcessingRef.current = true;

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0, base64: true, shutterSound: false, skipProcessing: true,
        });

        if (photo.base64) {
          const result = await analyzeEmotionFrame(photo.base64);

          if (result && result.face_detected) {
            faceFailCountRef.current = 0;
            addEmotionData({
              timestamp: Date.now(),
              moduleName,
              featureName,
              dominantEmotion: result.dominant_emotion,
              concentrationScore: result.concentration_index ?? 0,
              source: 'face',
            });
            console.log(`[EmotionTracker - ${featureName}] 👁 Face: ${result.dominant_emotion}`);
          } else {
            faceFailCountRef.current += 1;
            if (faceFailCountRef.current >= 2) {
              faceFailCountRef.current = 0;
              captureAudioEmotion(); // fire-and-forget
            }
          }
        }
      } catch (error) {
        console.log(`[EmotionTracker - ${moduleName}] Camera error:`, error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    if (isActive && permission?.granted) {
      interval = setInterval(captureAndAnalyze, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
      unsubscribe();
      AudioSessionManager.releaseLock(lockId);
    };
  }, [isActive, permission, audioPermission, moduleName]);

  if (!permission?.granted) return null;

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <CameraView ref={cameraRef} style={styles.camera} facing="front" mute={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 0.1,
    height: 0.1,
    opacity: 0.01,
    zIndex: -1000,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
});
