import { Audio } from 'expo-av';

export type AudioSessionType = 'exclusive' | 'passive';

export interface AudioSession {
  id: string;
  type: AudioSessionType;
  owner: string;
}

class AudioSessionManager {
  private static instance: AudioSessionManager;
  private currentSession: AudioSession | null = null;
  private listeners: Array<(session: AudioSession | null, evictedId?: string) => void> = [];

  private constructor() {}

  public static getInstance(): AudioSessionManager {
    if (!AudioSessionManager.instance) {
      AudioSessionManager.instance = new AudioSessionManager();
    }
    return AudioSessionManager.instance;
  }

  /**
   * Attempts to acquire a lock on the audio system.
   * @param id Unique ID for this request
   * @param type 'exclusive' (blocks others) or 'passive' (can be blocked)
   * @param owner Name of the component requesting the lock
   * @returns boolean indicating if the lock was acquired
   */
  public async requestLock(id: string, type: AudioSessionType, owner: string): Promise<boolean> {
    if (this.currentSession) {
      // If someone has an exclusive lock, we can't take it
      if (this.currentSession.type === 'exclusive') {
        console.log(`[AudioSessionManager] Lock denied for ${owner}. Active exclusive session: ${this.currentSession.owner}`);
        return false;
      }
      
      // If we want an exclusive lock but someone has a passive lock, we override them
      if (type === 'exclusive' && this.currentSession.type === 'passive') {
        console.log(`[AudioSessionManager] Overriding passive session ${this.currentSession.owner} for exclusive session ${owner}`);
        
        // Notify the current passive owner that they are being evicted
        const evictedId = this.currentSession.id;
        this.currentSession = { id, type, owner };
        this.notifyListeners(evictedId); // Pass the ID of the evicted session
        return true;
      }

      // If both are passive, we allow the new one (simple LIFO for now)
      if (type === 'passive' && this.currentSession.type === 'passive') {
        this.currentSession = { id, type, owner };
        this.notifyListeners();
        return true;
      }
    }

    // No active session, just take it
    this.currentSession = { id, type, owner };
    this.notifyListeners();
    return true;
  }

  public releaseLock(id: string) {
    if (this.currentSession?.id === id) {
      this.currentSession = null;
      this.notifyListeners();
      console.log(`[AudioSessionManager] Lock released for ${id}`);
      // Reset audio mode back to playback so TTS and sounds work again
      this.configurePlaybackSession();
    }
  }

  public isBusy(): boolean {
    return this.currentSession !== null && this.currentSession.type === 'exclusive';
  }

  public getCurrentOwner(): string | null {
    return this.currentSession?.owner || null;
  }

  /**
   * Components should subscribe to know if their session has been evicted
   */
  public subscribe(callback: (activeSession: AudioSession | null, evictedId?: string) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(evictedId?: string) {
    this.listeners.forEach(l => l(this.currentSession, evictedId));
  }

  /**
   * Sets audio mode for recording (microphone input).
   * Call configurePlaybackSession() when done to restore sound output.
   */
  public async configureRecordingSession() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('[AudioSessionManager] Failed to configure recording mode:', error);
    }
  }

  /**
   * Resets audio mode back to playback (speaker output).
   * Must be called after any recording session ends so TTS/sounds work again.
   */
  public async configurePlaybackSession() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('[AudioSessionManager] Audio mode restored to playback.');
    } catch (error) {
      console.error('[AudioSessionManager] Failed to configure playback mode:', error);
    }
  }
}

export default AudioSessionManager.getInstance();
