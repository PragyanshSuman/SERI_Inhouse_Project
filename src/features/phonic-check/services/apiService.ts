import { Platform } from 'react-native';
import { getApiBaseUrl } from '../../../config/apiConfig';

const API_URL = getApiBaseUrl();

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
                'Accept': 'application/json',
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

export const exportPdfReport = async (reportText: string): Promise<string> => {
    try {
        const response = await fetch(`${API_URL}/export-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ report_text: reportText }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }
        
        const data = await response.json();
        return `${API_URL}${data.url}`;
    } catch (error) {
        console.error('PDF Export Error:', error);
        throw error;
    }
};
