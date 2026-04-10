import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  token: string | null;
  userId: string | null;  // decoded from token for data namespacing
  username: string | null;
  isLoading: boolean;
  login: (token: string, username?: string) => Promise<void>;
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
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutListeners = useRef<Array<() => void>>([]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const [storedToken, storedUsername] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('username')
        ]);
        if (storedToken) {
          setToken(storedToken);
          setUserId(decodeTokenSub(storedToken));
        }
        if (storedUsername) {
          setUsername(storedUsername);
        }
      } catch (e) {
        console.error('Failed to load auth data', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (newToken: string, newUsername?: string) => {
    try {
      // Fire logout listeners first to wipe previous user's data
      logoutListeners.current.forEach(cb => cb());

      const promises: Promise<any>[] = [AsyncStorage.setItem('userToken', newToken)];
      if (newUsername) {
        promises.push(AsyncStorage.setItem('username', newUsername));
      }

      await Promise.all(promises);
      
      const newUserId = decodeTokenSub(newToken);
      setToken(newToken);
      setUserId(newUserId);
      if (newUsername) {
        setUsername(newUsername);
      }
      console.log(`[Auth] Logged in as: ${newUsername || newUserId}`);
    } catch (e) {
      console.error('Failed to save auth data', e);
    }
  };

  const logout = async () => {
    try {
      // Notify all subscribers to clear their data first
      logoutListeners.current.forEach(cb => cb());

      await Promise.all([
        AsyncStorage.removeItem('userToken'),
        AsyncStorage.removeItem('username')
      ]);
      setToken(null);
      setUserId(null);
      setUsername(null);
      console.log('[Auth] Logged out — all session data cleared');
    } catch (e) {
      console.error('Failed to clear auth data', e);
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
    <AuthContext.Provider value={{ token, userId, username, isLoading, login, logout, onLogout }}>
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
