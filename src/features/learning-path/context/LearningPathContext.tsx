/**
 * LearningPathContext.tsx
 *
 * React Context that:
 *  - Loads/persists PathState from AsyncStorage
 *  - Exposes the daily lesson, node states, XP, streaks
 *  - Provides completeNode() called by PathNodeScreen on module completion
 *  - Re-curates the lesson plan automatically after each session
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PathEngine, PathState, DailyLesson, NodeState } from '../services/PathEngine';
import { ProgressAggregator } from '../services/ProgressAggregator';
import { XPEngine, XPResult, Badge } from '../services/XPEngine';
import { NODE_MAP } from '../data/pathCurriculum';

const STORAGE_KEY = 'dysPath_state_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────

interface LearningPathContextType {
  isLoading: boolean;
  pathState: PathState;
  dailyLesson: DailyLesson | null;
  totalXP: number;
  streakDays: number;
  badges: Badge[];

  /** Call when a child finishes a module within a path session */
  completeNode: (nodeId: string, score: number, durationSecs: number) => Promise<{
    xpResult: XPResult;
    newBadges: Badge[];
  }>;

  /** Regenerate today's lesson (call on app focus) */
  refreshLesson: () => Promise<void>;

  /** Get the computed status of a specific node */
  getNodeState: (nodeId: string) => NodeState | null;

  /** Whether today's session is fully done */
  isTodayComplete: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const LearningPathContext = createContext<LearningPathContextType | undefined>(undefined);

export const LearningPathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathState, setPathState] = useState<PathState>(PathEngine.createInitialState());
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAndRefresh();
  }, []);

  const loadAndRefresh = async () => {
    setIsLoading(true);
    try {
      // Load persisted state
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let state: PathState = raw
        ? { ...PathEngine.createInitialState(), ...JSON.parse(raw) }
        : PathEngine.createInitialState();

      // Always re-compute node states from latest progress
      const progress = await ProgressAggregator.aggregate();
      state.nodeStates = PathEngine.computeNodeStates(progress, state);
      state.streakDays = progress.streakDays;
      state.totalXP = progress.totalXP;

      // Re-generate daily lesson if:
      // - No lesson exists
      // - Lesson was generated on a previous day
      // - Today's lesson is fully completed
      const shouldGenerate =
        !state.dailyLesson ||
        state.dailyLesson.isCompleted ||
        !PathEngine.isSameDay(state.dailyLesson.generatedAt, new Date().toISOString());

      if (shouldGenerate) {
        state.dailyLesson = PathEngine.generateDailyLesson(progress, state);
      }

      state.lastUpdated = new Date().toISOString();
      await persistState(state);
      setPathState(state);

      // Load badges
      const savedBadges = await XPEngine.loadBadges();
      setBadges(savedBadges);
    } catch (err) {
      console.warn('[LearningPathContext] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Complete a node ────────────────────────────────────────────────────────
  const completeNode = useCallback(async (
    nodeId: string,
    score: number,
    durationSecs: number
  ): Promise<{ xpResult: XPResult; newBadges: Badge[] }> => {
    const node = NODE_MAP[nodeId];
    if (!node) throw new Error(`Unknown node: ${nodeId}`);

    const existingState = pathState.nodeStates[nodeId];
    const isFirstAttempt = !existingState || existingState.attemptsCount === 0;

    // Calculate XP
    const xpResult = XPEngine.calculate({
      baseXP: node.baseXP,
      score,
      targetScore: node.targetScore,
      durationSecs,
      targetDurationSecs: node.targetDurationSecs,
      streakDays: pathState.streakDays,
      isFirstAttempt,
    });

    // Update node state
    const prevState = existingState ?? {
      nodeId,
      status: 'available' as const,
      bestScore: 0,
      attemptsCount: 0,
      lastCompletedDate: null,
      xpEarned: 0,
    };

    const newNodeState: NodeState = {
      ...prevState,
      bestScore: Math.max(prevState.bestScore, score),
      attemptsCount: prevState.attemptsCount + 1,
      lastCompletedDate: new Date().toISOString(),
      xpEarned: prevState.xpEarned + xpResult.totalXP,
      status: score >= node.targetScore ? 'completed' : prevState.status,
    };

    // Update completed list
    const newCompletedIds = score >= node.targetScore && !pathState.completedNodeIds.includes(nodeId)
      ? [...pathState.completedNodeIds, nodeId]
      : pathState.completedNodeIds;

    // Update daily lesson progress
    const updatedLesson = pathState.dailyLesson
      ? {
          ...pathState.dailyLesson,
          completedNodeIds: pathState.dailyLesson.completedNodeIds.includes(nodeId)
            ? pathState.dailyLesson.completedNodeIds
            : [...pathState.dailyLesson.completedNodeIds, nodeId],
        }
      : pathState.dailyLesson;

    // Mark lesson complete if all nodes done
    const allDone = updatedLesson
      ? updatedLesson.nodeIds.every(id => updatedLesson.completedNodeIds.includes(id))
      : false;

    const finalLesson = updatedLesson ? { ...updatedLesson, isCompleted: allDone } : null;

    // Build new path state
    const newPathState: PathState = {
      ...pathState,
      nodeStates: { ...pathState.nodeStates, [nodeId]: newNodeState },
      completedNodeIds: newCompletedIds,
      totalXP: pathState.totalXP + xpResult.totalXP,
      dailyLesson: finalLesson,
      lastUpdated: new Date().toISOString(),
    };

    // Re-compute statuses (prereqs may now be unlocked)
    const progress = await ProgressAggregator.aggregate();
    newPathState.nodeStates = PathEngine.computeNodeStates(progress, newPathState);

    // Record in ProgressAggregator meta
    if (['Tracing', 'ScalableGuidedTracing'].includes(node.moduleKey) && node.moduleParams?.letter) {
      await ProgressAggregator.recordTracingResult(node.moduleParams.letter, score);
    }
    await ProgressAggregator.recordSessionComplete(xpResult.totalXP);

    // Check badges
    const savedBadges = await XPEngine.loadBadges();
    const newBadges = await XPEngine.checkBadges({
      score,
      totalXP: newPathState.totalXP,
      streakDays: newPathState.streakDays,
      moduleKey: node.moduleKey,
      completedNodeIds: newCompletedIds,
      unlockedBadgeIds: savedBadges.map(b => b.id),
    });

    await persistState(newPathState);
    setPathState(newPathState);
    if (newBadges.length > 0) {
      setBadges(prev => [...prev, ...newBadges]);
    }

    return { xpResult, newBadges };
  }, [pathState]);

  // ── Refresh lesson ─────────────────────────────────────────────────────────
  const refreshLesson = useCallback(async () => {
    await loadAndRefresh();
  }, []);

  // ── Get node state ─────────────────────────────────────────────────────────
  const getNodeState = useCallback((nodeId: string): NodeState | null => {
    return pathState.nodeStates[nodeId] ?? null;
  }, [pathState]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isTodayComplete = pathState.dailyLesson?.isCompleted ?? false;

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persistState = async (state: PathState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[LearningPathContext] persistState failed:', e);
    }
  };

  return (
    <LearningPathContext.Provider value={{
      isLoading,
      pathState,
      dailyLesson: pathState.dailyLesson,
      totalXP: pathState.totalXP,
      streakDays: pathState.streakDays,
      badges,
      completeNode,
      refreshLesson,
      getNodeState,
      isTodayComplete,
    }}>
      {children}
    </LearningPathContext.Provider>
  );
};

export const useLearningPath = (): LearningPathContextType => {
  const ctx = useContext(LearningPathContext);
  if (!ctx) throw new Error('useLearningPath must be used within LearningPathProvider');
  return ctx;
};
