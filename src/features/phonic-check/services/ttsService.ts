// src/services/ttsService.ts - Text-to-Speech service using Expo Speech

import * as Speech from 'expo-speech';
import { TTSConfig } from '../types';

export class TTSService {
  private currentConfig: TTSConfig;
  private availableVoices: any[] = [];

  constructor() {
    this.currentConfig = {
      voice: '',
      rate: 0.9, // Expo Speech rate: 1.0 is normal, 0.9 slightly slower? 
      // In react-native-tts 0.5 was slow. In Expo Speech 1.0 is normal. 
      // We want "Slower for learning", so maybe 0.8
      pitch: 1.0,
      language: 'en-US',
    };
  }

  public async initialize(): Promise<void> {
    try {
      // Get available voices
      const voices = await Speech.getAvailableVoicesAsync();
      this.availableVoices = voices.map(v => ({ id: v.identifier, ...v }));

      // Select default voice if needed? Expo usually handles defaults well
      console.log('TTS (Expo Speech) initialized');
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
    }
  }

  public async speak(text: string): Promise<void> {
    try {
      if (await Speech.isSpeakingAsync()) {
        await Speech.stop();
      }

      const options: Speech.SpeechOptions = {
        language: this.currentConfig.language,
        pitch: this.currentConfig.pitch,
        rate: this.currentConfig.rate,
      };

      if (this.currentConfig.voice) {
        options.voice = this.currentConfig.voice;
      }

      Speech.speak(text, options);
    } catch (error) {
      console.error('TTS speak error:', error);
    }
  }

  public async speakAndSave(text: string): Promise<string> {
    // Expo Speech doesn't support synthesis to file directly exposed in JS
    await this.speak(text);
    return "";
  }

  public async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.warn('Error stopping TTS:', error);
    }
  }

  public async updateConfig(config: Partial<TTSConfig>): Promise<void> {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  public async getVoices(): Promise<any[]> {
    if (this.availableVoices.length === 0) {
      await this.initialize();
    }
    return this.availableVoices;
  }

  public getConfig(): TTSConfig {
    return { ...this.currentConfig };
  }

  public async setRate(rate: number): Promise<void> {
    this.currentConfig.rate = rate;
  }

  public cleanup(): void {
    try {
      Speech.stop();
    } catch (error) {
      console.warn('Error cleaning up TTS:', error);
    }
  }
}

export default TTSService;
