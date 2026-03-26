// src/services/audioRecorder.ts - Audio recording service

// src/services/audioRecorder.ts - Audio recording service
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AudioSessionManager from '../../../services/AudioSessionManager';

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private recordingPath: string | null = null;
  private isCurrentlyRecording: boolean = false;
  private lockId: string = `phonic_check_${Date.now()}`;

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

      // Acquire exclusive lock for phonic check
      const lockAcquired = await AudioSessionManager.requestLock(this.lockId, 'exclusive', 'PhonicCheck');
      if (!lockAcquired) {
        throw new Error('Could not acquire microphone lock - system busy');
      }

      await AudioSessionManager.configureRecordingSession();

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
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
      console.log('Recording started (Exclusive Lock Acquired)');
      return "";
    } catch (error) {
      console.error('Error starting recording:', error);
      AudioSessionManager.releaseLock(this.lockId);
      throw error;
    }
  }

  public async stopRecording(): Promise<string> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;
        this.recordingPath = uri;
      }
      
      this.isCurrentlyRecording = false;
      AudioSessionManager.releaseLock(this.lockId);
      console.log('Recording stopped. File saved at:', this.recordingPath);
      return this.recordingPath || '';
    } catch (error) {
      console.error('Error stopping recording:', error);
      AudioSessionManager.releaseLock(this.lockId);
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
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  }

  public async cleanup(): Promise<void> {
    if (this.isCurrentlyRecording) {
      await this.stopRecording();
    }
  }
}

export default AudioRecorder;
