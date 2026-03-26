import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'ta' | 'hi';

export interface AppSettings {
    // Localization
    language: Language;
    
    // Assistive Tools
    overlayColor: string; // 'transparent', '#FFB7B2' (Rose), '#B5EAD7' (Mint), '#C7CEEA' (Blue)
    isRulerEnabled: boolean;
    rulerHeight: number; // Default 150

    // Game Preferences
    enableAnimations: boolean; // Fun Mode
    enableSound: boolean;

    // --- Parental Controls ---
    parentalPIN: string;
    maxScreenTimeMins: number; // Healthy limit: clamped between 15 and 120
    frustrationSensitivity: 'low' | 'medium' | 'high'; 
    maxDifficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    isLoading: boolean;
}

const defaultSettings: AppSettings = {
    language: 'en',
    overlayColor: 'transparent',
    isRulerEnabled: false,
    rulerHeight: 120,
    enableAnimations: true,
    enableSound: true,
    
    // Default parental settings
    parentalPIN: '1234',
    maxScreenTimeMins: 60, // 1 hour default
    frustrationSensitivity: 'medium',
    maxDifficulty: 'advanced', // No ceiling by default
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('appSettings');
            if (jsonValue != null) {
                const saved = JSON.parse(jsonValue);
                setSettingsState({ ...defaultSettings, ...saved });
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updated = { ...settings, ...newSettings };
            setSettingsState(updated);
            await AsyncStorage.setItem('appSettings', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    // Compatibility for legacy useLanguage hook consumers
    // We can expose a helper if needed, but better to refactor them.

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Legacy hook adapter for easy migration
export const useLanguage = () => {
    const { settings, updateSettings, isLoading } = useSettings();
    return {
        language: settings.language,
        setLanguage: (lang: Language) => updateSettings({ language: lang }),
        isLoading
    };
};
