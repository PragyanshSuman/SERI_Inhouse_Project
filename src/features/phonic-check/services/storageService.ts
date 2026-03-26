// src/services/storageService.ts - Local storage service
// Keys are namespaced by userId to prevent data leakage between accounts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, PracticeSession } from '../types';

export interface Statistics {
    totalWords: number;
    averageScore: number;
    bestScore: number;
    recentImprovement: number;
}

/** Returns user-scoped storage keys. Falls back to 'guest' if no userId. */
function makeKeys(userId?: string | null) {
  const ns = userId ?? 'guest';
  return {
    SETTINGS: `@settings_${ns}`,
    HISTORY:  `@practice_history_${ns}`,
    STATS:    `@statistics_${ns}`,
  };
}

const DEFAULT_SETTINGS: AppSettings = {
    ttsConfig: {
        voice: '',
        rate: 0.5,
        pitch: 1.0,
        language: 'en-US',
    },
    hapticEnabled: true,
    darkMode: false,
    dyslexicMode: false,
    highContrast: false,
    fontSize: 'large',
    difficultyLevel: 'beginner',
};

const DEFAULT_STATS: Statistics = {
    totalWords: 0,
    averageScore: 0,
    bestScore: 0,
    recentImprovement: 0,
};

export class StorageService {
    private userId: string | null;

    constructor(userId?: string | null) {
      // Accept a userId to scope all data. Pass null for guest / unauthenticated.
      this.userId = userId ?? null;
    }

    private get KEYS() {
      return makeKeys(this.userId);
    }

    /** Save app settings */
    public async saveSettings(settings: AppSettings): Promise<void> {
        try {
            await AsyncStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    /** Load app settings */
    public async loadSettings(): Promise<AppSettings | null> {
        try {
            const settings = await AsyncStorage.getItem(this.KEYS.SETTINGS);
            if (settings) {
                return JSON.parse(settings);
            }
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    /** Save a new practice session */
    public async savePracticeSession(session: PracticeSession): Promise<void> {
        try {
            const history = await this.getPracticeHistory();
            const updatedHistory = [...history, session];
            await AsyncStorage.setItem(this.KEYS.HISTORY, JSON.stringify(updatedHistory));
            await this.updateStatistics(session, history);
        } catch (error) {
            console.error('Error saving practice session:', error);
            throw error;
        }
    }

    /** Get practice history */
    public async getPracticeHistory(limit?: number): Promise<PracticeSession[]> {
        try {
            const historyJson = await AsyncStorage.getItem(this.KEYS.HISTORY);
            let history: PracticeSession[] = historyJson ? JSON.parse(historyJson) : [];

            if (limit && history.length > limit) {
                return history.slice(history.length - limit);
            }

            return history;
        } catch (error) {
            console.error('Error getting practice history:', error);
            return [];
        }
    }

    /** Get user statistics */
    public async getStatistics(): Promise<Statistics> {
        try {
            const statsJson = await AsyncStorage.getItem(this.KEYS.STATS);
            return statsJson ? JSON.parse(statsJson) : DEFAULT_STATS;
        } catch (error) {
            console.error('Error getting statistics:', error);
            return DEFAULT_STATS;
        }
    }

    /** Update statistics based on new session */
    private async updateStatistics(newSession: PracticeSession, previousHistory: PracticeSession[]): Promise<void> {
        try {
            const currentStats = await this.getStatistics();

            const totalScore = previousHistory.reduce((sum, s) => sum + s.score, 0) + newSession.score;
            const totalWords = previousHistory.length + 1;
            const averageScore = totalScore / totalWords;

            let recentImprovement = 0;
            if (previousHistory.length >= 5) {
                const recentSessions = previousHistory.slice(-5);
                const previousAverage = recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length;
                recentImprovement = newSession.score - previousAverage;
            } else if (previousHistory.length > 0) {
                const previousAverage = previousHistory.reduce((sum, s) => sum + s.score, 0) / previousHistory.length;
                recentImprovement = newSession.score - previousAverage;
            }

            const newStats: Statistics = {
                totalWords,
                averageScore,
                bestScore: Math.max(currentStats.bestScore, newSession.score),
                recentImprovement,
            };

            await AsyncStorage.setItem(this.KEYS.STATS, JSON.stringify(newStats));
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    /** Clear all data for this user */
    public async clearAllData(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([this.KEYS.SETTINGS, this.KEYS.HISTORY, this.KEYS.STATS]);
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }
}
