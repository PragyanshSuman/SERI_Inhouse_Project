// src/screens/ProgressScreen.tsx - User progress and history screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, globalStyles } from '../theme';
import { StorageService } from '../services/storageService';

import { useAuth } from '../../../context/AuthContext';
import { PracticeSession } from '../types';

type RootStackParamList = {
  Home: undefined;
  Progress: undefined;
};

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
  const auth = useAuth() as any;
  const currentUserId = auth?.userId || null;
  const storageService = new StorageService(currentUserId);
  
  // Shared background
  const BACKGROUND_IMAGE = require('../../letter-tracing/assets/images/background_for_initial_home_screen.png');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    // ... existing ... 
    const stats = await storageService.getStatistics();
    setStatistics(stats);

    const sessions = await storageService.getPracticeHistory(10);
    setRecentSessions(sessions.reverse()); // Most recent first
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return colors.scoreExcellent;
    if (score >= 70) return colors.scoreGood;
    if (score >= 50) return colors.scoreFair;
    return colors.scoreNeedsPractice;
  };

  const formatDate = (timestamp: number): string => {
      // ... existing ... 
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
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Your Progress 📈</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{statistics.totalWords}</Text>
            <Text style={styles.statLabel}>Words Practiced</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{Math.round(statistics.averageScore)}</Text>
            <Text style={styles.statLabel}>Average Score</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>{statistics.bestScore}</Text>
            <Text style={styles.statLabel}>Best Score</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statIcon}>
              {statistics.recentImprovement > 0 ? '📈' : statistics.recentImprovement < 0 ? '📉' : '➡️'}
            </Text>
            <Text style={styles.statValue}>
              {statistics.recentImprovement > 0 ? '+' : ''}
              {statistics.recentImprovement.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Recent Improvement</Text>
          </View>
        </View>

        {/* Recent Practice Sessions */}
        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Recent Practice 📝</Text>

          {recentSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyText}>No practice sessions yet</Text>
              <Text style={styles.emptySubtext}>Start practicing to see your progress!</Text>
            </View>
          ) : (
            recentSessions.map((session, index) => (
              <View key={index} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionWord}>{session.word}</Text>
                  <View
                    style={[
                      styles.sessionScoreBadge,
                      { backgroundColor: getScoreColor(session.score) },
                    ]}
                  >
                    <Text style={styles.sessionScoreText}>{session.score}</Text>
                  </View>
                </View>

                {/* Syllable Scores */}
                <View style={styles.syllableScoresContainer}>
                  {session.syllableScores.map((syllable, idx) => (
                    <View key={idx} style={styles.syllableScoreItem}>
                      <Text style={styles.syllableText}>{syllable.syllable}</Text>
                      <View
                        style={[
                          styles.syllableScoreBar,
                          { width: `${syllable.score}%`, backgroundColor: getScoreColor(syllable.score) },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <Text style={styles.sessionTime}>{formatDate(session.timestamp)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>🌟</Text>
          <Text style={styles.motivationText}>
            {statistics.totalWords === 0
              ? "Start your journey to better pronunciation!"
              : statistics.averageScore >= 85
              ? "You're doing amazing! Keep up the excellent work!"
              : statistics.averageScore >= 70
              ? "Great progress! You're improving every day!"
              : "Keep practicing! Every attempt makes you better!"}
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 30, // Status bar adjustment
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardWide: {
    width: '100%',
  },
  statIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  statValue: {
    fontSize: fonts.sizes.xlarge,
    fontFamily: fonts.primaryBold,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: fonts.sizes.small,
    fontFamily: fonts.primary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sessionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionWord: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
  },
  sessionScoreBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionScoreText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primaryBold,
    color: colors.text,
  },
  syllableScoresContainer: {
    gap: 8,
    marginBottom: 12,
  },
  syllableScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syllableText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
    width: 60,
  },
  syllableScoreBar: {
    height: 8,
    borderRadius: 4,
    minWidth: 20,
  },
  sessionTime: {
    fontSize: fonts.sizes.small,
    fontFamily: fonts.primary,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: fonts.sizes.large,
    fontFamily: fonts.primaryBold,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  motivationCard: {
    backgroundColor: colors.encouragement,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  motivationText: {
    fontSize: fonts.sizes.medium,
    fontFamily: fonts.primary,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ProgressScreen;
