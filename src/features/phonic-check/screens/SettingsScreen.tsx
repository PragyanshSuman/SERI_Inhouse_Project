// src/features/phonic-check/screens/SettingsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { StorageService } from '../services/storageService';
import { useAuth } from '../../../context/AuthContext';
import { useSettings as useGlobalSettings } from '../../../context/SettingsContext';
import { TTSService } from '../services/ttsService';

import { AppSettings } from '../types';
import ParentalGateModal from '../../../components/ParentalGateModal';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';

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
  } as AppSettings);

  const auth = useAuth() as any;
  const currentUserId = auth?.userId || null;
  const storageService = new StorageService(currentUserId);
  const ttsService = new TTSService();

  // Access the explicit global Dyslexia configuration overrides
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useGlobalSettings();

  const [showParentalGate, setShowParentalGate] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);

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

  const handleDifficultyChange = async (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    const newSettings = { ...settings, difficultyLevel: difficulty };
    await saveSettings(newSettings);
  };

  const handleHapticToggle = async (value: boolean) => {
    const newSettings = { ...settings, hapticEnabled: value };
    await saveSettings(newSettings);
  };

  const testSpeech = async () => {
    await ttsService.speak("This is a speech test with your current settings.");
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Settings" isActive={!tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.sage} />
      <BackButton color={DT.accent.navy} />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings ⚙️</Text>
            <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        {/* VOICE SETTINGS */}
        {renderSectionHeader("Voice & Speech 🗣️")}
        <View style={styles.card}>
          <Text style={styles.label}>Speech Speed</Text>
          <View style={styles.optionRow}>
            {(['slow', 'medium', 'fast'] as const).map((speed) => {
              const rate = speed === 'slow' ? 0.3 : speed === 'medium' ? 0.5 : 0.7;
              const isActive = settings.ttsConfig.rate === rate;
              return (
                <TouchableOpacity
                  key={speed}
                  style={[styles.optionButton, isActive && styles.optionButtonActive]}
                  onPress={() => handleSpeechRateChange(rate)}
                >
                  <Text style={[styles.optionButtonText, isActive && styles.optionButtonTextActive]}>
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.testButton} onPress={testSpeech}>
            <Text style={styles.testButtonText}>Test Speech</Text>
          </TouchableOpacity>
        </View>

        {/* ACCESSIBILITY & DYSLEXIA */}
        {renderSectionHeader("Accessibility & Reading 📖")}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Dyslexia Support Mode</Text>
              <Text style={styles.switchSubtext}>Applies 35% letter spacing and 1.5x leading for deeper legibility.</Text>
            </View>
            <Switch
              value={globalSettings.dyslexiaFormattingEnabled}
              onValueChange={(val) => updateGlobalSettings({ dyslexiaFormattingEnabled: val })}
              trackColor={{ false: DT.bg.stone, true: DT.accent.navy }}
              thumbColor={globalSettings.dyslexiaFormattingEnabled ? DT.bg.cream : '#f4f3f4'}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 24 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Safe Contrast Mode</Text>
              <Text style={styles.switchSubtext}>Swaps intense backgrounds for muted deep palettes without pure black text.</Text>
            </View>
            <Switch
              value={globalSettings.themeMode === 'dyslexicDark'}
              onValueChange={(val) => updateGlobalSettings({ themeMode: val ? 'dyslexicDark' : 'light' })}
              trackColor={{ false: DT.bg.stone, true: DT.accent.navy }}
              thumbColor={globalSettings.themeMode === 'dyslexicDark' ? DT.bg.cream : '#f4f3f4'}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 24 }]}>
            <View>
              <Text style={styles.switchLabel}>Reading Typeface</Text>
              <Text style={styles.switchSubtext}>Current: {globalSettings.fontFamily}</Text>
            </View>
          </View>
          <View style={[styles.optionRow, { marginTop: 12, flexWrap: 'wrap', gap: 8 }]}>
            {(['System', 'Lexend', 'Roboto', 'OpenSans', 'AtkinsonHyperlegible'] as const).map((font) => {
              const isActive = globalSettings.fontFamily === font;
              return (
                <TouchableOpacity
                  key={font}
                  style={[styles.smallOptionButton, isActive && styles.optionButtonActive, { marginBottom: 8 }]}
                  onPress={() => updateGlobalSettings({ fontFamily: font })}
                >
                  <Text style={[styles.smallOptionText, isActive && styles.optionButtonTextActive]}>
                    {font === 'AtkinsonHyperlegible' ? 'Atkinson' : font}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* APP PREFERENCES */}
        {renderSectionHeader("Preferences ✨")}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Haptic Feedback</Text>
              <Text style={styles.switchSubtext}>Feel vibrations when you interact</Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={handleHapticToggle}
              trackColor={{ false: DT.bg.stone, true: DT.accent.navy }}
              thumbColor={settings.hapticEnabled ? DT.bg.cream : '#f4f3f4'}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 24 }]}>
            <View>
              <Text style={styles.switchLabel}>Difficulty Level</Text>
              <Text style={styles.switchSubtext}>Current: {settings.difficultyLevel}</Text>
            </View>
          </View>
          <View style={[styles.optionRow, { marginTop: 12 }]}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
              const isActive = settings.difficultyLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.smallOptionButton, isActive && styles.optionButtonActive]}
                  onPress={() => handleDifficultyChange(level)}
                >
                  <Text style={[styles.smallOptionText, isActive && styles.optionButtonTextActive]}>
                    {level.charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PARENTAL AREA */}
        {renderSectionHeader("Safe Zone 🛡️")}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.parentalButton}
            onPress={() => setShowParentalGate(true)}
          >
            <View>
              <Text style={styles.parentalButtonText}>Parental Controls</Text>
              <Text style={styles.parentalButtonSub}>Reports, Data & Account Management</Text>
            </View>
            <Text style={styles.navIcon}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* DEVELOPER TOOLS */}
        {renderSectionHeader("Developer Tools 🛠️")}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.parentalButton}
            onPress={() => navigation.navigate('VoskTesting' as any)}
          >
            <View>
              <Text style={styles.parentalButtonText}>Vosk Offline Speech Test</Text>
              <Text style={styles.parentalButtonSub}>Test offline phoneme accuracy without server</Text>
            </View>
            <Text style={styles.navIcon}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ParentalGateModal
        visible={showParentalGate}
        onSuccess={() => {
          setShowParentalGate(false);
          navigation.navigate('ParentalDashboard');
        }}
        onCancel={() => setShowParentalGate(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.sage,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  headerSubtitle: {
    fontSize: 16,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.muted,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: DT.typography.letterSpacingUI,
  },
  card: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 24,
    marginBottom: 24,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  label: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DT.radius.md,
    backgroundColor: DT.bg.stone,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: DT.accent.navy,
    borderColor: DT.accent.navy,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.primary,
  },
  optionButtonTextActive: {
    color: DT.text.onDark,
    fontWeight: DT.typography.weightBold,
  },
  smallOptionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DT.radius.md,
    backgroundColor: DT.bg.stone,
    alignItems: 'center',
  },
  smallOptionText: {
    fontSize: 14,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
  },
  testButton: {
    backgroundColor: DT.accent.teal,
    borderRadius: DT.radius.md,
    padding: 16,
    alignItems: 'center',
    ...DT.shadow.soft,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.onDark,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 17,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 14,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
  },
  parentalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  parentalButtonText: {
    fontSize: 19,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
  },
  parentalButtonSub: {
    fontSize: 14,
    color: DT.text.secondary,
    marginTop: 2,
  },
  navIcon: {
    fontSize: 20,
    color: DT.accent.navy,
    opacity: 0.5,
  },
});

export default SettingsScreen;
