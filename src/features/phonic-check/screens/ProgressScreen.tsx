// src/features/phonic-check/screens/ProgressScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { StorageService } from '../services/storageService';
import { useAuth } from '../../../context/AuthContext';
import { PracticeSession } from '../types';
import { DT } from '../../../utils/DyslexiaTheme';

type ProgressScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Progress'>;

interface ProgressScreenProps {
  navigation: ProgressScreenNavigationProp;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ navigation }) => {
  const [statistics, setStatistics] = useState({
    totalWords: 0,
    averageScore: 0,
    bestScore: 0,
    recentImprovement: 0,
  });
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [tourVisible, setTourVisible] = useState(false);
  
  const auth = useAuth() as any;
  const currentUserId = auth?.userId || null;
  const storageService = new StorageService(currentUserId);
  
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const stats = await storageService.getStatistics();
    setStatistics(stats);

    const sessions = await storageService.getPracticeHistory(10);
    setRecentSessions(sessions.reverse()); // Most recent first
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return DT.text.success;
    if (score >= 70) return DT.accent.sky;
    if (score >= 50) return DT.accent.amber;
    return DT.text.error;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Phonic Progress" isActive={!tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.sage} />
      <BackButton color={DT.accent.navy} />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Progress 📈</Text>
            <Text style={styles.headerSubtitle}>Track your learning journey</Text>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{statistics.totalWords}</Text>
            <Text style={styles.statLabel}>Words Practiced</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{Math.round(statistics.averageScore)}%</Text>
            <Text style={styles.statLabel}>Avg. Score</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>{Math.round(statistics.bestScore)}%</Text>
            <Text style={styles.statLabel}>Best Score</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🚀</Text>
            <Text style={styles.statValue}>+{statistics.recentImprovement}%</Text>
            <Text style={styles.statLabel}>Improvement</Text>
          </View>
        </View>

        {/* Recent History */}
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <View style={styles.historyContainer}>
          {recentSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sessions yet. Start practicing!</Text>
            </View>
          ) : (
            recentSessions.map((session, index) => (
              <View key={index} style={styles.sessionItem}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionWord}>{session.word}</Text>
                  <Text style={styles.sessionDate}>{formatDate(session.timestamp)}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${session.score}%`,
                          backgroundColor: getScoreColor(session.score)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.sessionScore, { color: getScoreColor(session.score) }]}>
                    {Math.round(session.score)}%
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.sage,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
    letterSpacing: DT.typography.letterSpacingUI,
  },
  headerSubtitle: {
    fontSize: 16,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    width: '47%',
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    padding: 20,
    alignItems: 'center',
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: DT.text.muted,
    fontWeight: DT.typography.weightBold,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 16,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  historyContainer: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 16,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  sessionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionWord: {
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 13,
    color: DT.text.muted,
    fontWeight: DT.typography.weightMedium,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: DT.bg.stone,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sessionScore: {
    fontSize: 15,
    fontWeight: DT.typography.weightHeavy,
    width: 45,
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: DT.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ProgressScreen;
