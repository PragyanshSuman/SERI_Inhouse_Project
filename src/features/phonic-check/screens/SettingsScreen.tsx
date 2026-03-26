// src/screens/SettingsScreen.tsx - App settings screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ImageBackground,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, globalStyles } from '../theme';
import { StorageService } from '../services/storageService';
import { useAuth } from '../../../context/AuthContext';
import { TTSService } from '../services/ttsService';

import { AppSettings } from '../types';
import ParentalGateModal from '../../../components/ParentalGateModal';
import { navigationRef } from '../../../navigation/navigationRef';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  MedicalReport: undefined;
  ParentalDashboard: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<AppSettings>({
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
  } as AppSettings); // Suppress type mismatch since AppSettings global format was updated earlier

  const auth = useAuth() as any;
  const currentUserId = auth?.userId || null;
  const storageService = new StorageService(currentUserId);
  const ttsService = new TTSService();

  const [showParentalGate, setShowParentalGate] = useState(false);

  // Shared background
  const BACKGROUND_IMAGE = require('../../letter-tracing/assets/images/background_for_initial_home_screen.png');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await storageService.loadSettings();
    if (savedSettings) {
      setSettings(savedSettings as AppSettings);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    await storageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSpeechRateChange = async (rate: number) => {
    const newSettings = {
      ...settings,
      ttsConfig: { ...settings.ttsConfig, rate },
    };
    await saveSettings(newSettings);
    await ttsService.setRate(rate);
  };

  const handleFontSizeChange = async (fontSize: 'small' | 'medium' | 'large') => {
    const newSettings = { ...settings, fontSize };
    await saveSettings(newSettings);
  };

  // Note: Difficulty Floor/Ceiling constraints should ideally happen elsewhere, but keeping the setter alive for children until maxed
  const handleDifficultyChange = async (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    const newSettings = { ...settings, difficultyLevel: difficulty };
    await saveSettings(newSettings);
  };

  const handleHapticToggle = async (value: boolean) => {
    const newSettings = { ...settings, hapticEnabled: value };
    await saveSettings(newSettings);
  };

  const testSpeech = async () => {
    await ttsService.speak('This is how the voice sounds at this speed.');
  };

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Settings ⚙️</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Voice Speed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Speed 🔊</Text>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>
              Speech Rate: {settings.ttsConfig.rate.toFixed(1)}x
            </Text>
            
            <View style={styles.speedButtons}>
              {[0.3, 0.5, 0.7, 1.0].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.speedButton,
                    settings.ttsConfig.rate === rate && styles.speedButtonActive,
                  ]}
                  onPress={() => handleSpeechRateChange(rate)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      settings.ttsConfig.rate === rate && styles.speedButtonTextActive,
                    ]}
                  >
                    {rate}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.testButton} onPress={testSpeech}>
              <Text style={styles.testButtonText}>Test Voice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Size 📝</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.optionButtons}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionButton,
                    settings.fontSize === size && styles.optionButtonActive,
                  ]}
                  onPress={() => handleFontSizeChange(size)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      settings.fontSize === size && styles.optionButtonTextActive,
                    ]}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Default Difficulty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Difficulty 🎯</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.optionButtons}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    settings.difficultyLevel === level && styles.optionButtonActive,
                  ]}
                  onPress={() => handleDifficultyChange(level)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      settings.difficultyLevel === level && styles.optionButtonTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Accessibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility ♿</Text>
          
          <View style={styles.settingCard}>
            <View style={[styles.switchRow, { marginBottom: 20 }]}>
              <View>
                <Text style={styles.switchLabel}>Dyslexic Font</Text>
                <Text style={styles.switchSubtext}>
                  Use OpenDyslexic style font
                </Text>
              </View>
              <Switch
                value={settings.dyslexicMode}
                onValueChange={async (val) => {
                   const newSettings = { ...settings, dyslexicMode: val };
                   await saveSettings(newSettings);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.cardBackground}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>High Contrast</Text>
                <Text style={styles.switchSubtext}>
                  Enhance visibility and text contrast
                </Text>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={async (val) => {
                   const newSettings = { ...settings, highContrast: val };
                   await saveSettings(newSettings);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.cardBackground}
              />
            </View>
          </View>
        </View>

        {/* Haptic Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences ⚙️</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Vibration Feedback</Text>
                <Text style={styles.switchSubtext}>
                  Feel vibrations when recording
                </Text>
              </View>
              <Switch
                value={settings.hapticEnabled}
                onValueChange={handleHapticToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.cardBackground}
              />
            </View>
          </View>
        </View>

        {/* Parental Controls Gate (Replaces Clear Data & Clinical Report) */}
        <View style={[styles.section, { marginTop: 32 }]}>
          <View style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.parentalButton} 
              onPress={() => setShowParentalGate(true)}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.parentalButtonText}>Parental Controls</Text>
                <Text style={styles.parentalButtonSub}>Manage screen time, limits & data</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#3B82F6' }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About 📱</Text>
          
          <View style={styles.settingCard}>
            <Text style={styles.infoText}>Unified Learning App v1.0.0</Text>
            <Text style={styles.infoSubtext}>
              Inclusive learning ecosystem for dyslexic learners
            </Text>
            <Text style={styles.infoSubtext}>
              Built with ❤️
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Parental PIN Modal */}
      <ParentalGateModal 
        visible={showParentalGate}
        onClose={() => setShowParentalGate(false)}
        onSuccess={() => {
          setShowParentalGate(false);
          // Small delay ensures Modal unmounts completely on Android before navigating,
          // preventing "invisible overlays" from blocking the next screen.
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('ParentalDashboard');
            }
          }, 100);
        }}
      />
    </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 30,
  },
  backButtonContainer: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backButton: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primaryBold,
    color: colors.primary,
  },
  titleContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingLabel: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
    marginBottom: 16,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  speedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedButtonText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
  },
  speedButtonTextActive: {
    color: colors.cardBackground,
    fontFamily: fonts.primaryBold,
  },
  testButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primaryBold,
    color: colors.cardBackground,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
  },
  optionButtonTextActive: {
    color: colors.cardBackground,
    fontFamily: fonts.primaryBold,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: fonts.sizes.small,
    fontFamily: fonts.primary,
    color: colors.textSecondary,
  },
  infoText: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  parentalButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentalButtonText: {
    fontSize: 18,
    fontFamily: fonts.primaryBold,
    color: '#1E293B',
  },
  parentalButtonSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  }
});

export default SettingsScreen;
