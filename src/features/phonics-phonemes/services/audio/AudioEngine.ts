import * as Speech from 'expo-speech';

/**
 * Options for speech playback
 */
export interface AudioOptions {
  rate?: number;   // 0.0 - 2.0 (default 1.0)
  pitch?: number;  // 0.5 - 2.0 (default 1.0)
  language?: string; // e.g. 'en-US'
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: any) => void;
}

/**
 * AudioEngine: TTS wrapper using Expo Speech
 * 
 * RESPONSIBILITY:
 * - Abstracts expo-speech complexity
 * - Provides pronunciation-specific audio controls
 * - Handles TTS initialization and errors
 */
export class AudioEngine {
  private static instance: AudioEngine;

  private constructor() { }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Speak the provided text
   */
  public async speak(text: string, options: AudioOptions = {}) {
    try {
      // Ensure any previous speech is stopped
      await this.stop();

      const {
        rate = 0.9, // Default to slightly slower for clarity
        pitch = 1.0,
        language = 'en-US',
        onDone,
        onStopped,
        onError
      } = options;

      // expo-speech API
      Speech.speak(text, {
        rate,
        pitch,
        language,
        onDone,
        onStopped,
        onError: (error) => {
          console.error('[AudioEngine] Speech error callback:', error);
          if (onError) onError(error);
        },
      });

    } catch (error) {
      console.error('[AudioEngine] Speak failed:', error);
      if (options.onError) options.onError(error);
    }
  }

  /**
   * Stop speaking immediately
   */
  public async stop() {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('[AudioEngine] Stop failed:', error);
    }
  }

  public async initialize() {
    // No specific initialization needed for expo-speech
  }

  public async cleanup() {
    await this.stop();
  }
}

export const audioEngine = AudioEngine.getInstance();
