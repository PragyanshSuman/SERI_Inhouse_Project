import { getApiBaseUrl } from '../config/apiConfig';
import { EmotionDataPoint } from '../context/EmotionContext';

let resolvedApiUrl: string | null = null;

async function getApiUrl(): Promise<string> {
  if (resolvedApiUrl) return resolvedApiUrl;
  resolvedApiUrl = getApiBaseUrl();
  console.log(`[EmotionAPIService] ✅ Backend resolved at: ${resolvedApiUrl}`);
  return resolvedApiUrl;
}

// Reset so the next call re-probes all candidates
function invalidateApiUrl() {
  resolvedApiUrl = null;
}

/**
 * Sends a base64 encoded image frame to the FastAPI backend for emotion analysis.
 */
export const analyzeEmotionFrame = async (base64Image: string) => {
  try {
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/analyze-emotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Emotion API Error:', error);
    throw error;
  }
};

/**
 * Sends an audio file to the FastAPI backend for audio emotion analysis.
 * Used as a fallback when face detection fails.
 */
export const analyzeAudioEmotion = async (uri: string) => {
  try {
    const API_URL = await getApiUrl();
    const formData = new FormData();
    // @ts-ignore
    formData.append('audio', { uri, name: 'emotion_audio.m4a', type: 'audio/m4a' });

    const response = await fetch(`${API_URL}/analyze-audio-emotion`, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Audio Emotion API Error:', error);
    throw error;
  }
};

/**
 * Syncs the active session emotion logs to authenticated backend.
 * Now includes source and featureName for per-feature, per-source analytics.
 */
export const syncEmotionData = async (token: string, rawLogs: EmotionDataPoint[]) => {
  try {
    const API_URL = await getApiUrl();
    const logs = rawLogs.map(log => ({
      module_name: log.moduleName,
      feature_name: log.featureName,
      dominant_emotion: log.dominantEmotion,
      concentration_score: log.concentrationScore,
      source: log.source,
    }));

    const response = await fetch(`${API_URL}/sync-emotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ logs }),
    });
    if (!response.ok) throw new Error('Failed to sync emotions');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Fetches the cross-session historical emotion reports for the authenticated user.
 */
export const fetchEmotionReport = async (token: string) => {
  try {
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/reports/emotions`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch reports');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
