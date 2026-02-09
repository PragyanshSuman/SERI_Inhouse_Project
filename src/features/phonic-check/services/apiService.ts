import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

import Constants from 'expo-constants';

// Get the host IP dynamically. 
// - On Android Emulator, this might be '10.0.2.2' or the LAN IP.
// - On Physical Device, this is the LAN IP of your PC (e.g., 192.168.1.5).
// - Constants.expoConfig.hostUri gives "IP:PORT" (e.g., "192.168.1.5:8081")
const getApiUrl = () => {
    // When using `adb reverse tcp:8000 tcp:8000`, the device can access the PC's localhost:8000 directly.
    return 'http://localhost:8000';
};

const API_URL = getApiUrl();

export const checkPronunciation = async (word: string, audioUri: string) => {
    try {
        const formData = new FormData();
        formData.append('word', word);

        const filename = audioUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `audio/${match[1]}` : 'audio/wav';

        // Append the file
        // Note: React Native's FormData expects a specific object structure for files
        formData.append('audio', {
            uri: Platform.OS === 'android' ? audioUri : audioUri.replace('file://', ''),
            name: filename || 'recording.wav',
            type,
        } as any);

        console.log('Sending request to:', `${API_URL}/evaluate`);
        console.log('Audio URI:', audioUri);

        const response = await fetch(`${API_URL}/evaluate`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};
