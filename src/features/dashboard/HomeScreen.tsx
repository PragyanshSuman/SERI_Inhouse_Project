import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, ImageBackground, Dimensions, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useSettings, Language } from '../../context/SettingsContext'; // Updated import
import { getTranslation } from '../../utils/Translations';
import EmotionTracker from '../../components/EmotionTracker';

import { navigationRef } from '../../navigation/navigationRef';

const BG_IMAGE = require('../../assets/images/dashboard_bg.png');
const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { settings } = useSettings(); 
  const { language } = settings;

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
      <EmotionTracker moduleName="Home Dashboard" isActive={true} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => (navigation as any).openDrawer()} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{getTranslation(language, 'home_title')}</Text>
            <Text style={styles.subtitle}>{getTranslation(language, 'home_subtitle')}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => {
                if (navigationRef.isReady()) {
                   navigationRef.navigate('Settings');
                }
              }} 
              style={styles.settingsButton}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
            <View style={styles.avatarMini}>
               <Text style={styles.avatarMiniText}>L</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.menuScroll}
          showsVerticalScrollIndicator={false}
        >
          {renderSectionHeader("Daily Learning")}
          <View style={styles.menuGrid}>
            <MenuCard
              title={getTranslation(language, 'module_letter_tracing')}
              subtitle="Master the alphabet"
              icon="🔤"
              color="#4F46E5"
              onPress={() => navigation.navigate('LetterTracing')} 
            />
            <MenuCard
              title={getTranslation(language, 'module_phonic_check')}
              subtitle="Practice speaking"
              icon="🎤"
              color="#10B981"
              onPress={() => navigation.navigate('PhonicCheck')}
            />
            <MenuCard
              title={getTranslation(language, 'module_phonics_phonemes')}
              subtitle="Magic Word Studio"
              icon="✨"
              color="#D97706"
              onPress={() => navigation.navigate('PhonicsPhonemes')}
            />
             <MenuCard
              title={getTranslation(language, 'module_original_app')}
              subtitle="Writing Assessment"
              icon="🏆"
              color="#2b5876"
              onPress={() => navigation.navigate('OriginalApp')}
            />
          </View>

          {renderSectionHeader("Fun & Games")}
          <View style={styles.menuGrid}>
             <MenuCard
              title={getTranslation(language, 'module_word_ninja')}
              subtitle="Fast-paced slicing"
              icon="🥷"
              color="#F43F5E"
              onPress={() => navigation.navigate('SightWordsDashboard')}
            />
             <MenuCard
              title={getTranslation(language, 'module_rhyme_time')}
              subtitle="Find matching words"
              icon="🎵"
              color="#8B5CF6"
              onPress={() => navigation.navigate('RhymeDashboard')}
            />
            <MenuCard
              title={getTranslation(language, 'module_visual_discrimination')}
              subtitle="Train your brain"
              icon="🧠"
              color="#0EA5E9"
              onPress={() => navigation.navigate('VisualDiscriminationDashboard')}
            />
          </View>

          {renderSectionHeader("Performance")}
          <View style={styles.menuGrid}>
            <MenuCard
              title="Activity Charts"
              subtitle="Your emotions"
              icon="📈"
              color="#3B82F6" 
              onPress={() => navigation.navigate('EmotionReport' as any)}
            />
            <MenuCard
              title="Learning Journey"
              subtitle="Detailed Report"
              icon="📄"
              color="#059669" 
              onPress={() => navigation.navigate('LearningJourneyReport' as any)}
            />
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function MenuCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle: string;
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
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.cardGradient}
      >
        <View style={[styles.cardIconContainer, { backgroundColor: color + '20' }]}>
          <Text style={[styles.cardIcon, { color }]}>{icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.cardArrow}>
          <Text style={{ color: '#94A3B8', fontSize: 18 }}>›</Text>
        </View>
      </LinearGradient>
      {disabled && (
        <View style={styles.lockBadge}>
           <Text style={styles.lockText}>🔒</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#4F46E5',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
  },
  avatarMiniText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsIcon: {
    fontSize: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 15,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  menuScroll: {
    paddingBottom: 20,
  },
  menuGrid: {
    paddingHorizontal: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: (width - 45) / 2,
    borderRadius: 20,
    backgroundColor: '#FFF',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  cardArrow: {
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  lockBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  lockText: {
    fontSize: 12,
  },
});
