import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, ImageBackground, Dimensions, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useSettings, Language } from '../../context/SettingsContext'; // Updated import
import { getTranslation } from '../../utils/Translations';

const BG_IMAGE = require('../../assets/images/dashboard_bg.png');
const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings } = useSettings(); // Use new hook
  const { language, overlayColor, isRulerEnabled, enableAnimations, enableSound } = settings;
  const [settingsVisible, setSettingsVisible] = useState(false);

  const toggleSettings = () => setSettingsVisible(!settingsVisible);

  const handleLanguageSelect = (lang: Language) => {
    updateSettings({ language: lang }); // Update via context
  };

  const languages: { code: Language; label: string; icon: string }[] = [
    { code: 'en', label: 'English', icon: '🇺🇸' },
    { code: 'ta', label: 'தமிழ் (Tamil)', icon: '🇮🇳' },
    { code: 'hi', label: 'हिंदी (Hindi)', icon: '🇮🇳' },
  ];

  const overlayColors = [
    { color: 'transparent', label: 'None' },
    { color: '#FFB7B2', label: 'Rose' },
    { color: '#B5EAD7', label: 'Mint' },
    { color: '#C7CEEA', label: 'Blue' },
    { color: '#E2F0CB', label: 'Green' },
  ];

  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{getTranslation(language, 'home_title')}</Text>
            <Text style={styles.subtitle}>{getTranslation(language, 'home_subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={toggleSettings} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.menuScroll}>
          <View style={styles.menuGrid}>
            <MenuCard
              title={getTranslation(language, 'module_letter_tracing')}
              icon="🔤"
              color="#4F46E5"
              onPress={() => navigation.navigate('LetterTracing')} 
            />
            <MenuCard
              title={getTranslation(language, 'module_phonic_check')}
              icon="🎤"
              color="#10B981"
              onPress={() => navigation.navigate('PhonicCheck')}
            />
            <MenuCard
              title={getTranslation(language, 'module_visual_discrimination')}
              icon="🧠"
              color="#8B5CF6" // Purple
              onPress={() => navigation.navigate('VisualDiscriminationDashboard')}
            />
            <MenuCard
              title={getTranslation(language, 'module_phonics_phonemes')}
              icon="✨"
              color="#D97706"
              onPress={() => navigation.navigate('PhonicsPhonemes')}
            />
            <MenuCard
              title={getTranslation(language, 'module_original_app')}
              icon="🏆"
              color="#2b5876"
              onPress={() => navigation.navigate('OriginalApp')}
            />
             <MenuCard
              title={getTranslation(language, 'module_word_ninja')}
              icon="🥷"
              color="#F43F5E" // Rose-Red
              onPress={() => navigation.navigate('SightWordsDashboard')}
            />
             <MenuCard
              title={getTranslation(language, 'module_rhyme_time')}
              icon="🎵"
              color="#8B5CF6" // Violet
              onPress={() => navigation.navigate('RhymeDashboard')}
            />
          </View>
        </ScrollView>

        {/* Global Settings Modal */}
        <Modal transparent visible={settingsVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getTranslation(language, 'settings_title')}</Text>
                <TouchableOpacity onPress={toggleSettings}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Language Section */}
                <Text style={styles.sectionTitle}>{getTranslation(language, 'select_language')}</Text>
                <View style={styles.languageRow}>
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageChip,
                        language === lang.code && styles.selectedChip
                      ]}
                      onPress={() => handleLanguageSelect(lang.code)}
                    >
                      <Text style={[styles.languageText, language === lang.code && styles.selectedText]}>{lang.icon} {lang.label.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Assistive Tools Section */}
                <Text style={styles.sectionTitle}>Visual Support (Dyslexia Friendly)</Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Reading Ruler</Text>
                  <Switch 
                    value={isRulerEnabled} 
                    onValueChange={(val) => updateSettings({ isRulerEnabled: val })}
                    trackColor={{ false: "#767577", true: "#4F46E5" }}
                  />
                </View>

                <Text style={styles.subLabel}>Color Overlay (Reduces Visual Stress)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                  {overlayColors.map((item) => (
                    <TouchableOpacity
                        key={item.color}
                        style={[
                            styles.colorOption, 
                            { backgroundColor: item.color === 'transparent' ? '#FFF' : item.color },
                            overlayColor === item.color && styles.selectedColorOption
                        ]}
                        onPress={() => updateSettings({ overlayColor: item.color })}
                    >
                        {item.color === 'transparent' && <View style={styles.slash} />}
                        {overlayColor === item.color && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Game Preferences Section */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Game Preferences</Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Fun Mode 🥳 (Animations)</Text>
                  <Switch 
                    value={enableAnimations} 
                    onValueChange={(val) => updateSettings({ enableAnimations: val })}
                    trackColor={{ false: "#767577", true: "#10B981" }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Sound Effects 🔊</Text>
                  <Switch 
                    value={enableSound} 
                    onValueChange={(val) => updateSettings({ enableSound: val })}
                    trackColor={{ false: "#767577", true: "#10B981" }}
                  />
                </View>

              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

function MenuCard({
  title,
  icon,
  color,
  onPress,
  disabled = false,
}: {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { settings } = useSettings();
  
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.bubbleContainer, { shadowColor: color }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.1)']}
          locations={[0, 0.4, 1]}
          start={{ x: 0.3, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
          style={styles.bubbleGradient}
        >
          <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <Text style={styles.cardIcon}>{icon}</Text>
          </View>
          
          {/* Specular Highlight (Shine) */}
          <View style={styles.shine} />
          {/* Bottom Reflection */}
          <View style={styles.reflection} />
        </LinearGradient>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {disabled && (
        <Text style={styles.soonBadge}>
          {getTranslation(settings.language, 'coming_soon')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  settingsIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  menuScroll: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    paddingHorizontal: 4,
  },
  card: {
    alignItems: 'center',
    width: (width - 32 - 24) / 4, 
  },
  // Bubble Styles
  bubbleContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, // Softer shadow for float effect
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'transparent', 
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden', // Clip shines
  },
  shine: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 50,
    height: 30,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    transform: [{ rotate: '-45deg' }],
    opacity: 0.9,
    zIndex: 1,
  },
  reflection: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    width: 30,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '-45deg' }],
    opacity: 0.6,
  },
  iconCircle: {
    width: 100, 
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2, 
  },
  disabled: {
    opacity: 0.6,
  },
  cardIcon: {
    fontSize: 50,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  soonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#94A3B8',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeText: {
    fontSize: 20,
    color: '#64748B',
    padding: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  languageChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  languageText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    marginTop: -8,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  slash: {
    width: 2,
    height: 24,
    backgroundColor: '#FF4444',
    transform: [{ rotate: '45deg' }],
  },
  checkIcon: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
});
