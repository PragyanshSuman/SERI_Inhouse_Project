// src/services/audioRecorder.ts - Audio recording service

// src/services/audioRecorder.ts - Audio recording service
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private recordingPath: string | null = null;
  private isCurrentlyRecording: boolean = false;

  constructor() {
    // Check permission on init? No, better on request.
  }

  public async requestPermissions(): Promise<boolean> {
    const response = await Audio.requestPermissionsAsync();
    return response.granted;
  }

  public async startRecording(): Promise<string> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100, // Record at high quality, let backend resample
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      this.recording = recording;
      this.isCurrentlyRecording = true;
      console.log('Recording started');
      return "";
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  public async stopRecording(): Promise<string> {
    if (!this.recording) {
      return this.recordingPath || '';
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      this.recording = null;
      this.isCurrentlyRecording = false;
      this.recordingPath = uri;

      console.log('Recording stopped. File saved at:', uri);
      return uri || '';
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  public async pauseRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.pauseAsync();
    }
  }

  public async resumeRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.startAsync();
    }
  }

  public isRecording(): boolean {
    return this.isCurrentlyRecording;
  }

  public async deleteRecording(path: string): Promise<void> {
    try {
      if (path) {
        const fileUri = path.startsWith('file://') ? path : `file://${path}`;
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
          console.log('Recording deleted:', path);
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  }

  public async getRecordingDuration(path: string): Promise<number> {
    // Approximate or read from file
    return 0; // Simplified for now as expo Audio.Recording doesn't give file duration easily without loading sound
  }

  public async cleanup(): Promise<void> {
    if (this.isCurrentlyRecording) {
      await this.stopRecording();
    }
  }
}

export default AudioRecorder;
