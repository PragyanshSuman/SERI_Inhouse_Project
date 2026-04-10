/**
 * LearningPathScreen.tsx
 *
 * The gorgeous Duolingo-style winding gem map UI.
 * Shows all 5 units and their nodes as circular gems on a winding path.
 * Features: XP bar, streak counter, daily lesson hero card, unit themes.
 */

import React, { useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useLearningPath } from '../context/LearningPathContext';
import {
  CURRICULUM_UNITS,
  ALL_NODES,
  NODE_MAP,
  CurriculumNode,
  CurriculumUnit,
} from '../data/pathCurriculum';
import { NodeState } from '../services/PathEngine';
import { DT } from '../../../utils/DyslexiaTheme';
import BackButton from '../../../components/BackButton';

const { width: SW } = Dimensions.get('window');
const NODE_SIZE = 64;
const COLUMN_GAP = (SW - 48) / 3;

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LearningPathScreen() {
  const navigation = useNavigation<any>();
  const { pathState, dailyLesson, totalXP, streakDays, isLoading, refreshLesson, isTodayComplete } = useLearningPath();

  // Refresh progress every time we come back from an activity screen
  useFocusEffect(
    React.useCallback(() => {
      refreshLesson();
    }, [])
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();

    // Pulse for active nodes
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleNodePress = (node: CurriculumNode, state: NodeState) => {
    if (state.status === 'locked') return;
    navigation.navigate('PathNode', { nodeId: node.id });
  };

  // Go straight to the first available activity for today
  const handleStartLesson = () => {
    if (!dailyLesson || dailyLesson.nodeIds.length === 0) return;
    navigation.navigate('PathNode', { nodeId: dailyLesson.nodeIds[0] });
  };

  // ── XP Progress Bar ────────────────────────────────────────────────────────
  const XP_PER_LEVEL = 200;
  const currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpPct = xpInLevel / XP_PER_LEVEL;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>✨ Preparing your path...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <LinearGradient colors={['#312E81', '#1E1B4B', '#0F0E2B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity, transform: [{ translateY: slideUp }] }]}>
          <BackButton color="#fff" />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🧭 My Learning Path</Text>
            <View style={styles.xpRow}>
              <Text style={styles.levelBadge}>Lv. {currentLevel}</Text>
              <View style={styles.xpBarBg}>
                <Animated.View style={[styles.xpBarFill, { width: `${Math.round(xpPct * 100)}%` as any }]} />
              </View>
              <Text style={styles.xpText}>{xpInLevel}/{XP_PER_LEVEL} XP</Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{streakDays}</Text>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Daily Lesson Hero Card ── */}
          {dailyLesson && (
            <Animated.View style={{ opacity, transform: [{ translateY: slideUp }] }}>
              <TouchableOpacity
                style={[styles.heroCard, isTodayComplete && styles.heroCardDone]}
                onPress={handleStartLesson}
                disabled={isTodayComplete}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isTodayComplete ? ['#2E7D32', '#1B5E20'] : ['#5B6EC8', '#3730A3']}
                  style={styles.heroGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <View style={styles.heroLeft}>
                    <Text style={styles.heroLabel}>
                      {isTodayComplete ? '✅ Today Complete!' : "⚡ Today's Lesson"}
                    </Text>
                    <Text style={styles.heroCount}>
                      {`${dailyLesson.nodeIds.length} recommended activities`}
                    </Text>
                    <View style={styles.heroNodes}>
                      {dailyLesson.nodeIds.slice(0, 4).map(id => {
                        const n = NODE_MAP[id];
                        return (
                          <View key={id} style={styles.heroNodeDot}>
                            <Text style={styles.heroNodeIcon}>{n?.icon ?? '•'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  {!isTodayComplete && (
                    <View style={styles.heroBtn}>
                      <Text style={styles.heroBtnText}>Start →</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Parent AI reason chip */}
              <TouchableOpacity style={styles.reasonChip}>
                <Text style={styles.reasonChipText}>🤖 {dailyLesson.reason.substring(0, 90)}...</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Units & Nodes ── */}
          {CURRICULUM_UNITS.map(unit => (
            <UnitSection
              key={unit.id}
              unit={unit}
              nodeStates={pathState.nodeStates}
              pulseAnim={pulseAnim}
              onNodePress={handleNodePress}
              dailyLessonNodeIds={dailyLesson?.nodeIds ?? []}
            />
          ))}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UnitSection
// ─────────────────────────────────────────────────────────────────────────────

function UnitSection({
  unit, nodeStates, pulseAnim, onNodePress, dailyLessonNodeIds,
}: {
  unit: CurriculumUnit;
  nodeStates: Record<string, NodeState>;
  pulseAnim: Animated.Value;
  onNodePress: (node: CurriculumNode, state: NodeState) => void;
  dailyLessonNodeIds: string[];
}) {
  const unitNodes = unit.nodeIds.map(id => NODE_MAP[id]).filter(Boolean);
  const completedCount = unitNodes.filter(n => nodeStates[n.id]?.status === 'completed').length;
  const unitPct = unitNodes.length > 0 ? completedCount / unitNodes.length : 0;

  const isUnitLocked = unitNodes.every(n => {
    const s = nodeStates[n.id];
    return !s || s.status === 'locked';
  });

  return (
    <View style={styles.unitContainer}>
      {/* Unit Header */}
      <LinearGradient
        colors={[unit.themeColor + 'DD', unit.themeColor + '88']}
        style={styles.unitHeader}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <Text style={styles.unitIcon}>{isUnitLocked ? '🔒' : unit.icon}</Text>
        <View style={styles.unitHeaderText}>
          <Text style={styles.unitTitle}>{unit.title}</Text>
          <Text style={styles.unitSubtitle}>{unit.subtitle}</Text>
        </View>
        <View style={styles.unitProgressBadge}>
          <Text style={styles.unitProgressText}>{completedCount}/{unitNodes.length}</Text>
        </View>
      </LinearGradient>

      {/* Unit progress bar */}
      <View style={styles.unitProgressBar}>
        <View style={[styles.unitProgressFill, { width: `${Math.round(unitPct * 100)}%` as any, backgroundColor: unit.themeColor }]} />
      </View>

      {/* Node grid */}
      <View style={styles.nodesGrid}>
        {unitNodes.map((node, i) => {
          const state = nodeStates[node.id] ?? {
            nodeId: node.id, status: 'locked', bestScore: 0,
            attemptsCount: 0, lastCompletedDate: null, xpEarned: 0,
          };
          const isInLesson = dailyLessonNodeIds.includes(node.id);

          return (
            <PathNode
              key={node.id}
              node={node}
              state={state}
              pulseAnim={pulseAnim}
              themeColor={unit.themeColor}
              isInLesson={isInLesson}
              onPress={() => onNodePress(node, state)}
              index={i}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PathNode (individual gem)
// ─────────────────────────────────────────────────────────────────────────────

function PathNode({
  node, state, pulseAnim, themeColor, isInLesson, onPress, index,
}: {
  node: CurriculumNode;
  state: NodeState;
  pulseAnim: Animated.Value;
  themeColor: string;
  isInLesson: boolean;
  onPress: () => void;
  index: number;
}) {
  const isLocked = state.status === 'locked';
  const isCompleted = state.status === 'completed';
  const isReview = state.status === 'review';
  const isAvailable = state.status === 'available' || state.status === 'in_progress';

  const gemColor = isLocked
    ? '#4B5563'
    : isCompleted
    ? '#22C55E'
    : isReview
    ? '#F59E0B'
    : themeColor;

  const shouldPulse = (isAvailable || isInLesson) && !isLocked;

  const gemEl = (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={0.75}
      style={styles.nodeTouchable}
    >
      <View style={[
        styles.nodeOuter,
        { borderColor: gemColor },
        isInLesson && styles.nodeOuterLesson,
      ]}>
        <LinearGradient
          colors={isLocked
            ? ['#374151', '#1F2937']
            : isCompleted
            ? ['#16A34A', '#15803D']
            : isReview
            ? ['#D97706', '#B45309']
            : [gemColor, gemColor + 'BB']}
          style={styles.nodeGem}
        >
          <Text style={[styles.nodeIcon, isLocked && styles.nodeIconLocked]}>
            {isCompleted ? '✓' : isReview ? '🔄' : isLocked ? '🔒' : node.icon}
          </Text>
        </LinearGradient>
      </View>
      <Text style={[styles.nodeLabel, isLocked && styles.nodeLabelLocked]} numberOfLines={2}>
        {node.title}
      </Text>
      {state.bestScore > 0 && (
        <View style={[styles.scorePill, { backgroundColor: gemColor + '33' }]}>
          <Text style={[styles.scorePillText, { color: gemColor }]}>{state.bestScore}%</Text>
        </View>
      )}
      {isInLesson && (
        <View style={styles.lessonBadge}>
          <Text style={styles.lessonBadgeText}>Today</Text>
        </View>
      )}
      {node.isBonus && (
        <View style={styles.bonusBadge}>
          <Text style={styles.bonusBadgeText}>BONUS</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (shouldPulse) {
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        {gemEl}
      </Animated.View>
    );
  }

  return <View>{gemEl}</View>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1B4B' },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: {
    backgroundColor: '#F59E0B', color: '#1F2937', fontSize: 11,
    fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  xpBarBg: {
    flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4, overflow: 'hidden',
  },
  xpBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  xpText: { color: '#C7D2FE', fontSize: 11, fontWeight: '600' },
  streakBadge: { alignItems: 'center' },
  streakFire: { fontSize: 22 },
  streakCount: { color: '#FCD34D', fontWeight: '800', fontSize: 14, marginTop: -2 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Hero Card
  heroCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 8,
    ...DT.shadow.medium,
  },
  heroCardDone: { opacity: 0.85 },
  heroGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  heroLeft: { flex: 1 },
  heroLabel: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.85, marginBottom: 4 },
  heroCount: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  heroNodes: { flexDirection: 'row', gap: 8 },
  heroNodeDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroNodeDotDone: { backgroundColor: '#22C55E', borderColor: '#16A34A' },
  heroNodeIcon: { fontSize: 16 },
  heroBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Reason chip
  reasonChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 12, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  reasonChipText: { color: '#A5B4FC', fontSize: 12, lineHeight: 18 },

  // Unit
  unitContainer: { marginBottom: 32 },
  unitHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderRadius: 18, marginBottom: 4,
  },
  unitIcon: { fontSize: 32 },
  unitHeaderText: { flex: 1 },
  unitTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  unitSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  unitProgressBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  unitProgressText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  unitProgressBar: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 16,
  },
  unitProgressFill: { height: '100%', borderRadius: 2 },

  // Nodes grid
  nodesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    justifyContent: 'flex-start',
  },
  nodeTouchable: { alignItems: 'center', width: (SW - 60) / 3 },
  nodeOuter: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    borderWidth: 3, padding: 3,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  nodeOuterLesson: { borderWidth: 4, shadowOpacity: 0.6 },
  nodeGem: {
    flex: 1, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeIcon: { fontSize: 26 },
  nodeIconLocked: { opacity: 0.5 },
  nodeLabel: {
    color: '#E0E7FF', fontSize: 11, fontWeight: '600',
    textAlign: 'center', marginTop: 6, lineHeight: 14,
  },
  nodeLabelLocked: { color: '#6B7280' },
  scorePill: {
    marginTop: 4, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  scorePillText: { fontSize: 11, fontWeight: '700' },
  lessonBadge: {
    backgroundColor: '#F59E0B', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  lessonBadgeText: { color: '#1F2937', fontSize: 10, fontWeight: '800' },
  bonusBadge: {
    backgroundColor: '#7C3AED', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  bonusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
