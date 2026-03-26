import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  token: string | null;
  userId: string | null;  // decoded from token for data namespacing
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  onLogout: (cb: () => void) => () => void;  // subscribe to logout events
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Decode the JWT sub claim without a library */
function decodeTokenSub(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutListeners = useRef<Array<() => void>>([]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
          setUserId(decodeTokenSub(storedToken));
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (newToken: string) => {
    try {
      // Fire logout listeners first to wipe previous user's data
      logoutListeners.current.forEach(cb => cb());

      await AsyncStorage.setItem('userToken', newToken);
      const newUserId = decodeTokenSub(newToken);
      setToken(newToken);
      setUserId(newUserId);
      console.log(`[Auth] Logged in as: ${newUserId}`);
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  const logout = async () => {
    try {
      // Notify all subscribers to clear their data first
      logoutListeners.current.forEach(cb => cb());

      await AsyncStorage.removeItem('userToken');
      setToken(null);
      setUserId(null);
      console.log('[Auth] Logged out — all session data cleared');
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  };

  /** Subscribe to logout events. Returns unsubscribe function. */
  const onLogout = (cb: () => void) => {
    logoutListeners.current.push(cb);
    return () => {
      logoutListeners.current = logoutListeners.current.filter(l => l !== cb);
    };
  };

  return (
    <AuthContext.Provider value={{ token, userId, isLoading, login, logout, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
