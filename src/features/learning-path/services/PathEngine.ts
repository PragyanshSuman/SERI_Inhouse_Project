/**
 * PathEngine.ts
 *
 * The adaptive brain of DysPath.
 * Takes the child's ChildProgressModel and:
 *  1. Scores every curriculum node for relevance
 *  2. Decides which nodes are locked / available / completed / review
 *  3. Generates today's curated DailyLesson (3–5 nodes)
 *  4. Generates a plain-English parent explanation for why today's plan was chosen
 */

import {
  ALL_NODES,
  NODE_MAP,
  CURRICULUM_UNITS,
  CurriculumNode,
  NodeStatus,
  SkillTag,
} from '../data/pathCurriculum';
import { ChildProgressModel } from './ProgressAggregator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NodeState {
  nodeId: string;
  status: NodeStatus;
  bestScore: number;       // 0–100, 0 if never attempted
  attemptsCount: number;
  lastCompletedDate: string | null;
  xpEarned: number;
}

export interface DailyLesson {
  lessonId: string;         // Unique ID for this lesson plan
  nodeIds: string[];        // Ordered list of 3–5 node IDs for today
  reason: string;           // Parent-facing explanation
  generatedAt: string;      // ISO timestamp
  isCompleted: boolean;
  completedNodeIds: string[];
}

export interface PathState {
  nodeStates: Record<string, NodeState>;
  dailyLesson: DailyLesson | null;
  completedNodeIds: string[];
  unlockedBadgeIds: string[];
  totalXP: number;
  streakDays: number;
  lastUpdated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PathEngine
// ─────────────────────────────────────────────────────────────────────────────

export class PathEngine {
  /**
   * Compute which nodes are locked/available/completed given the child's
   * current progress model and existing path state.
   */
  static computeNodeStates(
    progress: ChildProgressModel,
    existingState: PathState
  ): Record<string, NodeState> {
    const states: Record<string, NodeState> = {};

    for (const node of ALL_NODES) {
      const existing = existingState.nodeStates[node.id];
      const bestScore = existing?.bestScore ?? 0;
      const attemptsCount = existing?.attemptsCount ?? 0;
      const lastCompletedDate = existing?.lastCompletedDate ?? null;
      const xpEarned = existing?.xpEarned ?? 0;

      // Determine status
      let status: NodeStatus = 'locked';

      const prereqsMet = node.prerequisiteIds.every(
        prereqId => existingState.completedNodeIds.includes(prereqId)
      );

      if (existingState.completedNodeIds.includes(node.id)) {
        // Check if it needs a spaced-repetition review
        if (node.reviewIntervalDays && lastCompletedDate) {
          const daysSince = PathEngine.daysSince(lastCompletedDate);
          if (daysSince >= node.reviewIntervalDays && bestScore < 85) {
            status = 'review';
          } else {
            status = 'completed';
          }
        } else {
          status = 'completed';
        }
      } else if (prereqsMet) {
        status = 'available';
      } else {
        status = 'locked';
      }

      // Bootstrap: always make Unit 1 first node available
      if (node.id === 'u1_n1' && !existingState.completedNodeIds.includes('u1_n1')) {
        status = 'available';
      }

      states[node.id] = {
        nodeId: node.id,
        status,
        bestScore,
        attemptsCount,
        lastCompletedDate,
        xpEarned,
      };
    }

    return states;
  }

  /**
   * THE CORE ALGORITHM: Generate today's curated lesson.
   * 
   * Scoring system (0–1 scale per node):
   *  - 60% weight: skillRelevance (targets child's weakest skill)
   *  - 25% weight: spacedRepBoost (nodes not done in 5+ days with <80% score)
   *  - 15% weight: noveltyBoost   (never-attempted nodes)
   *  - Penalty: recently done today
   *  - Guard: if frustration high, cap difficulty
   */
  static generateDailyLesson(
    progress: ChildProgressModel,
    pathState: PathState
  ): DailyLesson {
    const nodeStates = pathState.nodeStates;
    const completedToday = pathState.dailyLesson?.completedNodeIds ?? [];

    // Find candidate nodes (available or review)
    const candidates = ALL_NODES.filter(node => {
      const state = nodeStates[node.id];
      return state && (state.status === 'available' || state.status === 'review');
    });

    if (candidates.length === 0) {
      // Fallback: re-queue some completed nodes for review
      return PathEngine.generateReviewLesson(pathState);
    }

    // ── Compute skill weakness map ────────────────────────────────────────
    const weaknessScores = PathEngine.computeWeaknessMap(progress);

    // ── Score each candidate ──────────────────────────────────────────────
    const scored = candidates.map(node => {
      const state = nodeStates[node.id];

      // 1. Skill relevance (0–1)
      const skillScore = weaknessScores[node.skillTag] ?? 0.5;

      // 2. Spaced repetition boost (0–1)
      let srBoost = 0;
      if (state.lastCompletedDate) {
        const days = PathEngine.daysSince(state.lastCompletedDate);
        if (days >= 7 && state.bestScore < 80) srBoost = 1.0;
        else if (days >= 5 && state.bestScore < 80) srBoost = 0.6;
        else if (days >= 3) srBoost = 0.3;
      }

      // 3. Novelty boost (0–1)
      const noveltyBoost = state.attemptsCount === 0 ? 1.0 : 0;

      // 4. Difficulty guard: if child is frustrated, penalize hard nodes
      let difficultyPenalty = 0;
      if (progress.frustrationEventCount >= 3) {
        if (node.difficulty === 'advanced') difficultyPenalty = 0.8;
        else if (node.difficulty === 'intermediate') difficultyPenalty = 0.4;
      }

      // 5. Already done today penalty
      const todayPenalty = completedToday.includes(node.id) ? 2.0 : 0;

      const compositeScore =
        (0.60 * skillScore) +
        (0.25 * srBoost) +
        (0.15 * noveltyBoost) -
        difficultyPenalty -
        todayPenalty;

      return { node, score: compositeScore };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick top 5 candidates
    const top = scored.slice(0, 5).map(s => s.node);

    // Order them: easy → hard → fun (end on a high)
    const ordered = PathEngine.orderForEngagement(top, progress);

    // Build parent explanation
    const reason = PathEngine.buildParentReason(ordered, progress, weaknessScores);

    return {
      lessonId: `lesson_${Date.now()}`,
      nodeIds: ordered.map(n => n.id),
      reason,
      generatedAt: new Date().toISOString(),
      isCompleted: false,
      completedNodeIds: [],
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Maps each skill tag to a weakness score (1 = very weak, 0 = strong).
   * The higher the score, the more the engine will prioritize that skill.
   */
  private static computeWeaknessMap(p: ChildProgressModel): Record<SkillTag, number> {
    const normalize = (score: number) => Math.max(0, Math.min(1, 1 - score / 100));

    return {
      letter_tracing: PathEngine.computeLetterFormationWeakness(p),
      visual_discrimination: normalize(p.visualDiscrimScore),
      phonics: normalize(p.phonicsAvgScore),
      magic_words: normalize(p.magicWordsAvgScore),
      rhyming: normalize(p.rhymeAvgScore),
      sight_words: normalize(p.sightWordAvgScore),
      writing: PathEngine.computeLetterFormationWeakness(p),
    };
  }

  private static computeLetterFormationWeakness(p: ChildProgressModel): number {
    const letters = Object.values(p.letterMastery);
    if (letters.length === 0) return 1.0; // No data = very weak
    const avgAcc = letters.reduce((sum, l) => sum + l.avgAccuracy, 0) / letters.length;
    return Math.max(0, 1 - avgAcc / 100);
  }

  /**
   * Orders selected nodes for maximum engagement:
   * - Start with medium difficulty to warm up
   * - Put hardest in the middle
   * - End with a fun/rhyme/game node if possible
   */
  private static orderForEngagement(
    nodes: CurriculumNode[],
    progress: ChildProgressModel
  ): CurriculumNode[] {
    if (nodes.length <= 1) return nodes;

    const funModules = ['RhymeDashboard', 'SightWordsDashboard', 'VisualDiscriminationDashboard'];
    const funNodes = nodes.filter(n => funModules.includes(n.moduleKey));
    const workNodes = nodes.filter(n => !funModules.includes(n.moduleKey));

    // Sort work nodes: beginner → intermediate → advanced
    workNodes.sort((a, b) => {
      const order = { beginner: 0, intermediate: 1, advanced: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });

    // If frustrated, move fun to front
    if (progress.frustrationEventCount >= 3) {
      return [...funNodes, ...workNodes];
    }

    // Normal: work first, end with fun
    return [...workNodes, ...funNodes];
  }

  /**
   * Generates a review-only lesson when all nodes are completed.
   */
  private static generateReviewLesson(pathState: PathState): DailyLesson {
    // Find completed nodes not done recently
    const reviewCandidates = pathState.completedNodeIds
      .map(id => NODE_MAP[id])
      .filter(Boolean)
      .filter(node => {
        const state = pathState.nodeStates[node.id];
        if (!state?.lastCompletedDate) return false;
        return PathEngine.daysSince(state.lastCompletedDate) >= 5;
      })
      .slice(0, 4);

    return {
      lessonId: `review_${Date.now()}`,
      nodeIds: reviewCandidates.map(n => n.id),
      reason: 'Great work completing all available activities! Today we revisit some earlier challenges to keep the knowledge fresh — this is called spaced repetition, one of the most powerful learning techniques!',
      generatedAt: new Date().toISOString(),
      isCompleted: false,
      completedNodeIds: [],
    };
  }

  /**
   * Builds a simple, parent-friendly explanation of today's lesson plan.
   */
  private static buildParentReason(
    nodes: CurriculumNode[],
    progress: ChildProgressModel,
    weaknessScores: Record<SkillTag, number>
  ): string {
    const parts: string[] = [];

    // Find dominant skill
    const dominantSkill = Object.entries(weaknessScores)
      .sort(([, a], [, b]) => b - a)[0][0] as SkillTag;

    const skillLabels: Partial<Record<SkillTag, string>> = {
      phonics: 'phonics and speaking sounds clearly',
      rhyming: 'recognising rhyming words',
      letter_tracing: 'letter writing and tracing',
      visual_discrimination: 'telling letters apart visually',
      sight_words: 'reading common sight words',
      magic_words: 'hearing and separating sounds in words',
      writing: 'writing letters from memory',
    };
    const skillLabel = skillLabels[dominantSkill] ?? 'key reading skills';

    parts.push(`Today's lesson focuses on strengthening **${skillLabel}**, where recent data shows room for growth.`);

    if (progress.frustrationEventCount >= 3) {
      parts.push(`We noticed some difficulty in the last session, so today starts with a fun activity to rebuild confidence before tackling harder material.`);
    }

    if (progress.streakDays >= 7) {
      parts.push(`🔥 ${progress.streakDays}-day learning streak — amazing consistency!`);
    }

    const moduleNames = nodes.map(n => n.title).join(', ');
    parts.push(`Activities planned: ${moduleNames}.`);

    return parts.join(' ');
  }

  static isSameDay(dateA: string, dateB: string): boolean {
    return new Date(dateA).toDateString() === new Date(dateB).toDateString();
  }

  static daysSince(dateStr: string): number {
    const then = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.floor((now - then) / 86400000);
  }

  /**
   * Creates a fresh empty PathState for a brand new user.
   */
  static createInitialState(): PathState {
    return {
      nodeStates: {},
      dailyLesson: null,
      completedNodeIds: [],
      unlockedBadgeIds: [],
      totalXP: 0,
      streakDays: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
