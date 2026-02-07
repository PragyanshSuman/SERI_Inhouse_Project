import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SessionFeatureSummary } from '../models/TracingData';

const STORAGE_KEYS = {
    USER_PROFILE: '@user_profile',
    SESSION_DATA: '@session_data',
    ANALYTICS_HISTORY: '@analytics_history',
};

export class StorageService {
    private static instance: StorageService;
    private constructor() { }

    static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    async saveAnalytics(analytics: SessionFeatureSummary): Promise<void> {
        try {
            const key = `${STORAGE_KEYS.SESSION_DATA}_${analytics.sessionId}`;
            await AsyncStorage.setItem(key, JSON.stringify(analytics));
            await this.updateAnalyticsHistory(analytics.sessionId, analytics.letter, analytics.timestamp);
        } catch (error) {
            console.error('Failed to save analytics:', error);
            throw error;
        }
    }

    async getAnalytics(sessionId: string): Promise<SessionFeatureSummary | null> {
        try {
            const key = `${STORAGE_KEYS.SESSION_DATA}_${sessionId}`;
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to get analytics:', error);
            return null;
        }
    }

    private async updateAnalyticsHistory(sessionId: string, letter: string, timestamp: string): Promise<void> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_HISTORY);
            const history = data ? JSON.parse(data) : [];
            history.push({ sessionId, letter, timestamp, userId: 'default_user' });
            await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_HISTORY, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to update analytics history:', error);
        }
    }

    async exportToJSON(analytics: SessionFeatureSummary): Promise<string> {
        try {
            const fileName = `tracing_analytics_${analytics.sessionId}.json`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(analytics, null, 2));
            return filePath;
        } catch (error) {
            console.error('Failed to export JSON:', error);
            throw error;
        }
    }

    async exportToCSV(analytics: SessionFeatureSummary): Promise<string> {
        const fileName = `tracing_analytics_${analytics.sessionId}.csv`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, "Session ID, Letter\n" + analytics.sessionId + "," + analytics.letter);
        return filePath;
    }
}

export default StorageService.getInstance();
