import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, Dimensions, Switch } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useSettings, Language } from '../../context/SettingsContext'; // Updated import
import { getTranslation } from '../../utils/Translations';
import { useAuth } from '../../context/AuthContext';
import EmotionTracker from '../../components/EmotionTracker';
import { navigationRef } from '../../navigation/navigationRef';
import { DT } from '../../utils/DyslexiaTheme';
import { useLearningPath } from '../learning-path/context/LearningPathContext';


const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { settings } = useSettings(); 
  const { language } = settings;
  const { username } = useAuth();
  const { dailyLesson, streakDays, isTodayComplete, totalXP } = useLearningPath();

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <View style={styles.bg}>
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
            <Text style={styles.subtitle}>
              {username ? `Hello, ${username}! Ready to learn?` : getTranslation(language, 'home_subtitle')}
            </Text>
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
               <Text style={styles.avatarMiniText}>
                 {username ? username.charAt(0).toUpperCase() : 'L'}
               </Text>
            </View>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.menuScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── DysPath Hero Banner ── */}
          <TouchableOpacity
            style={styles.dysPathHero}
            onPress={() => (navigation as any).navigate('LearningPath')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={isTodayComplete ? ['#166534', '#14532D'] : ['#3730A3', '#1E1B4B']}
              style={styles.dysPathGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.dysPathLeft}>
                <Text style={styles.dysPathLabel}>
                  {isTodayComplete ? '✅ Today Complete!' : '⚡ My Learning Path'}
                </Text>
                <Text style={styles.dysPathCount}>
                  {isTodayComplete
                    ? `+${totalXP} XP earned today`
                    : dailyLesson
                    ? `${dailyLesson.nodeIds.length} activities ready`
                    : 'Start your journey!'}
                </Text>
              </View>
              <View style={styles.dysPathRight}>
                {streakDays > 0 && (
                  <View style={styles.dysPathStreak}>
                    <Text style={styles.dysPathStreakFire}>🔥</Text>
                    <Text style={styles.dysPathStreakNum}>{streakDays}</Text>
                  </View>
                )}
                <View style={[styles.dysPathBtn, isTodayComplete && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Text style={styles.dysPathBtnText}>{isTodayComplete ? 'View →' : 'Go →'}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {renderSectionHeader("Daily Learning")}
          <View style={styles.menuGrid}>
            <MenuCard
              title={getTranslation(language, 'module_letter_tracing')}
              subtitle="Master the alphabet"
              icon="🔤"
              color={DT.accent.indigo}
              onPress={() => navigation.navigate('LetterTracing')} 
            />
            <MenuCard
              title={getTranslation(language, 'module_phonic_check')}
              subtitle="Practice speaking"
              icon="🎤"
              color={DT.accent.teal}
              onPress={() => navigation.navigate('ModeSelection', { toolType: 'pronunciation' })}
            />
            <MenuCard
              title={getTranslation(language, 'module_phonics_phonemes')}
              subtitle="Magic Word Studio"
              icon="✨"
              color={DT.accent.amber}
              onPress={() => navigation.navigate('ModeSelection', { toolType: 'magic_words' })}
            />
             <MenuCard
              title={getTranslation(language, 'module_original_app')}
              subtitle="Writing Assessment"
              icon="🏆"
              color={DT.accent.navy}
              onPress={() => navigation.navigate('OriginalApp')}
            />
          </View>

          {renderSectionHeader("Fun & Games")}
          <View style={styles.menuGrid}>
             <MenuCard
              title={getTranslation(language, 'module_word_ninja')}
              subtitle="Fast-paced slicing"
              icon="🥷"
              color={DT.accent.rose}
              onPress={() => navigation.navigate('SightWordsDashboard')}
            />
             <MenuCard
              title={getTranslation(language, 'module_rhyme_time')}
              subtitle="Find matching words"
              icon="🎵"
              color={DT.accent.violet}
              onPress={() => navigation.navigate('RhymeDashboard')}
            />
            <MenuCard
              title={getTranslation(language, 'module_visual_discrimination')}
              subtitle="Train your brain"
              icon="🧠"
              color={DT.accent.sky}
              onPress={() => navigation.navigate('VisualDiscriminationDashboard')}
            />
          </View>

          {renderSectionHeader("Performance")}
          <View style={styles.menuGrid}>
            <MenuCard
              title="Activity Charts"
              subtitle="Your emotions"
              icon="📈"
              color={DT.accent.sky}
              onPress={() => navigation.navigate('EmotionReport' as any)}
            />
            <MenuCard
              title="Learning Journey"
              subtitle="Detailed Report"
              icon="📄"
              color={DT.accent.teal}
              onPress={() => navigation.navigate('LearningJourneyReport' as any)}
            />
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
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
    backgroundColor: DT.bg.cream,
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
    backgroundColor: DT.bg.cream,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: DT.radius.md,
    backgroundColor: DT.bg.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: DT.accent.indigo,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  subtitle: {
    fontSize: 14,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    lineHeight: DT.typography.lineHeightBody,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DT.accent.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DT.bg.cream,
    elevation: 3,
  },
  avatarMiniText: {
    color: DT.text.onDark,
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
    backgroundColor: DT.bg.stone,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
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
    fontSize: 12,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginRight: 15,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: DT.surface.divider,
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
    borderRadius: DT.radius.xl,
    backgroundColor: DT.surface.card,
    ...DT.shadow.soft,
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
    borderRadius: DT.radius.md,
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
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    letterSpacing: DT.typography.letterSpacingBody,
  },
  cardSubtitle: {
    fontSize: 11,
    color: DT.text.secondary,
    marginTop: 3,
    fontWeight: DT.typography.weightMedium,
    lineHeight: 18,
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

  // ── DysPath Hero Banner ──────────────────────────────────────────────────
  dysPathHero: {
    marginHorizontal: 15,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 20,
    overflow: 'hidden',
    ...DT.shadow.medium,
  },
  dysPathGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  dysPathLeft: { flex: 1 },
  dysPathLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dysPathCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  dysPathRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dysPathStreak: { alignItems: 'center' },
  dysPathStreakFire: { fontSize: 20 },
  dysPathStreakNum: { color: '#FCD34D', fontWeight: '800', fontSize: 13, marginTop: -2 },
  dysPathBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dysPathBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
