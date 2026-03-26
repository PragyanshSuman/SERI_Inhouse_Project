import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the backend API Base URL.
 * 
 * Logic:
 * 1. If running in Expo Go or Development Build, try to extract the host IP from Constants.expoConfig.hostUri.
 * 2. If that fails (e.g., in a production build or some edge cases), fallback to a prioritized list of candidates:
 *    - LAN_IP (currently 192.168.1.5)
 *    - Android Emulator (10.0.2.2)
 *    - Localhost (for USB adb reverse)
 */

const LAN_IP = '192.168.1.5';
const PORT = '8000';

const getHostIp = (): string => {
  // Use expo-constants to find the host machine's IP address
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }
  return LAN_IP;
};

export const getApiBaseUrl = (): string => {
  const hostIp = getHostIp();
  
  if (Platform.OS === 'android') {
    // Priority: Dynamic LAN IP > Android Emulator Gateway > localhost
    return `http://${hostIp}:${PORT}`;
  }
  
  // iOS or Web
  return `http://localhost:${PORT}`;
};

/**
 * Probes a URL to see if it's reachable.
 * Useful for debugging connectivity issues.
 */
export async function probeBackend(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${url}/`, { 
      method: 'GET',
      signal: controller.signal 
    });
    clearTimeout(id);
    return response.ok;
  } catch (error) {
    return false;
  }
}
