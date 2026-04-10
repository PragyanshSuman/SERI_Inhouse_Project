import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Image,
} from 'react-native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings, Language } from '../context/SettingsContext';
import { getTranslation } from '../utils/Translations';
import { useAuth } from '../context/AuthContext';

import { navigationRef } from '../navigation/navigationRef';

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

export default function SidebarContent(props: DrawerContentComponentProps) {
  const { settings, updateSettings } = useSettings();
  const { language, overlayColor, isRulerEnabled, enableAnimations, enableSound } = settings;
  const { logout, username } = useAuth();

  const handleLanguageSelect = (lang: Language) => {
    updateSettings({ language: lang });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#3730A3']} style={styles.header}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {username ? username.charAt(0).toUpperCase() : 'L'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{username || 'Learner'}</Text>
            <Text style={styles.userRole}>Super Student</Text>
          </View>
        </View>
      </LinearGradient>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Navigation Section */}
        <Text style={styles.sectionTitle}>{getTranslation(language, 'settings_title')}</Text>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => props.navigation.navigate('Home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>{getTranslation(language, 'home_title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => props.navigation.navigate('LearningJourneyReport')}
        >
          <Text style={styles.navIcon}>📄</Text>
          <Text style={styles.navLabel}>My Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('Settings');
            }
          }}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>{getTranslation(language, 'settings_title')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Settings Section */}
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
              <Text style={[styles.languageText, language === lang.code && styles.selectedText]}>
                {lang.icon} {lang.label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Visual Support</Text>
        
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Reading Ruler</Text>
            <Text style={styles.settingSub}>Assists focus while reading</Text>
          </View>
          <Switch 
            value={isRulerEnabled} 
            onValueChange={(val) => updateSettings({ isRulerEnabled: val })}
            trackColor={{ false: "#CBD5E1", true: "#4F46E5" }}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Color Overlay</Text>
        <View style={styles.colorRow}>
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
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Animations</Text>
          <Switch 
            value={enableAnimations} 
            onValueChange={(val) => updateSettings({ enableAnimations: val })}
            trackColor={{ false: "#CBD5E1", true: "#10B981" }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Sound Effects</Text>
          <Switch 
            value={enableSound} 
            onValueChange={(val) => updateSettings({ enableSound: val })}
            trackColor={{ false: "#CBD5E1", true: "#10B981" }}
          />
        </View>

        <View style={styles.divider} />
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.version}>v1.2.0 - Unified Learning</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    borderBottomRightRadius: 30,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  languageChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  languageText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  selectedText: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    transform: [{ scale: 1.1 }],
  },
  slash: {
    width: 1,
    height: 20,
    backgroundColor: '#FF4444',
    transform: [{ rotate: '45deg' }],
  },
  checkIcon: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F43F5E',
  },
  version: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
  }
});
