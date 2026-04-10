/**
 * ProgressAggregator.ts
 * 
 * Reads progress data from all existing module AsyncStorage keys
 * and synthesizes a unified ChildProgressModel.
 * This is the data layer the PathEngine reads from.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readPhonicCheckLegacy, readWritingAssessmentLegacy } from './PathProgressBridge';

export interface LetterProgress {
  attempts: number;
  avgAccuracy: number;
  lastAttemptDate: string | null;
  isFluentlyTraced: boolean; // avgAccuracy > 80 over 3+ attempts
}

export interface ChildProgressModel {
  // Letter Tracing (from OriginalApp StorageService)
  letterMastery: Record<string, LetterProgress>;

  // Phonic Check (from phonic-check StorageService)
  phonicsAvgScore: number;       // 0–100
  phonicsSessionCount: number;
  phonicsRecentWords: string[];  // Last 10 words practiced

  // Rhyme Time (stored by RhymingMatchGame)
  rhymeAvgScore: number;         // 0–100
  rhymeSessionCount: number;

  // Visual Discrimination (OddOneOut + LetterSorting)
  visualDiscrimScore: number;    // 0–100
  visualSessionCount: number;

  // Sight Words (WordNinja)
  sightWordHighestLevel: 'none' | 'beginner' | 'intermediate' | 'advanced';
  sightWordAvgScore: number;

  // Magic Words (PhonicsPhonemes) — stored locally
  magicWordsSessionCount: number;
  magicWordsAvgScore: number;

  // Cross-module meta
  frustrationEventCount: number; // From EmotionContext recent sessions
  streakDays: number;
  lastSessionDate: string | null;
  totalXP: number;
}

const DEFAULT_PROGRESS: ChildProgressModel = {
  letterMastery: {},
  phonicsAvgScore: 0,
  phonicsSessionCount: 0,
  phonicsRecentWords: [],
  rhymeAvgScore: 0,
  rhymeSessionCount: 0,
  visualDiscrimScore: 0,
  visualSessionCount: 0,
  sightWordHighestLevel: 'none',
  sightWordAvgScore: 0,
  magicWordsSessionCount: 0,
  magicWordsAvgScore: 0,
  frustrationEventCount: 0,
  streakDays: 0,
  lastSessionDate: null,
  totalXP: 0,
};

export class ProgressAggregator {
  /**
   * Reads all module storage keys and synthesizes a unified progress model.
   * Uses safe-read pattern — if a key is missing, defaults to 0.
   */
  static async aggregate(): Promise<ChildProgressModel> {
    try {
      const [
        phonicRaw,
        rhymeRaw,
        visualRaw,
        sightWordRaw,
        magicWordsRaw,
        emotionRaw,
        dysPathMetaRaw,
      ] = await AsyncStorage.multiGet([
        'phonicCheckProgress',    // Written by PathProgressBridge (from PhonicCheckStudio)
        'rhymeTimeProgress',      // Written by PathProgressBridge (from RhymingMatchGame)
        'visualDiscrimProgress',  // Written by PathProgressBridge (from OddOneOutGame)
        'sightWordProgress',      // Written by PathProgressBridge (from WordNinjaGame)
        'magicWordsProgress',     // Written by PathProgressBridge (from PhonicsPhonemes)
        'emotionLogs',            // Written by EmotionContext
        'dysPath_meta',           // Written by DysPath system
        'letterTracingProgress',  // Written by PathProgressBridge (from ScalableGuidedTracing)
      ]);

      // ── Also read the REAL existing PhonicCheck storage ──────────────────
      const userToken = await AsyncStorage.getItem('userToken');
      let userId: string | null = null;
      if (userToken) {
        try {
          const payload = userToken.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          userId = decoded.sub ?? null;
        } catch { /* ignore */ }
      }
      const [phonicStatRaw, phonicHistRaw] = await AsyncStorage.multiGet([
        `@statistics_${userId ?? 'guest'}`,
        `@practice_history_${userId ?? 'guest'}`,
      ]);
      const phonicStats = ProgressAggregator.safeParseJSON(phonicStatRaw[1], {});
      const phonicHistory: any[] = ProgressAggregator.safeParseJSON(phonicHistRaw[1], []);
      const legacyPhonicsScore = phonicStats.averageScore ?? 0;
      const legacyPhonicsCount = phonicHistory.length;

      const phonic = ProgressAggregator.safeParseJSON(phonicRaw[1], {});
      const rhyme = ProgressAggregator.safeParseJSON(rhymeRaw[1], {});
      const visual = ProgressAggregator.safeParseJSON(visualRaw[1], {});
      const sightWord = ProgressAggregator.safeParseJSON(sightWordRaw[1], {});
      const magicWords = ProgressAggregator.safeParseJSON(magicWordsRaw[1], {});
      const emotionLogs: any[] = ProgressAggregator.safeParseJSON(emotionRaw[1], []);
      const dysPathMeta = ProgressAggregator.safeParseJSON(dysPathMetaRaw[1], {});
      const letterTracing = ProgressAggregator.safeParseJSON(phonicRaw[1], {}); // reuse phonicRaw slot

      // ── Phonics ─────────────────────────────────────────────────────────
      // Merge bridge sessions with the real legacy PhonicCheck stats
      const phonicSessions: any[] = phonic.sessions || [];
      const bridgePhonicAvg = ProgressAggregator.calcAvg(
        phonicSessions.map((s: any) => s.score ?? s.accuracy ?? 0)
      );
      // Weighted merge: 70% real legacy data, 30% bridge sessions (bridge may be sparse)
      const phonicsAvgScore = legacyPhonicsCount > 0
        ? Math.round(legacyPhonicsScore * 0.7 + bridgePhonicAvg * 0.3)
        : bridgePhonicAvg;
      const phonicsSessionCount = legacyPhonicsCount + phonicSessions.length;

      // ── Rhyme Time ──────────────────────────────────────────────────────
      const rhymeSessions: any[] = rhyme.sessions || [];
      const rhymeAvgScore = ProgressAggregator.calcAvg(
        rhymeSessions.map((s: any) => s.score ?? 0)
      );

      // ── Visual Discrimination ───────────────────────────────────────────
      const visualSessions: any[] = visual.sessions || [];
      const visualDiscrimScore = ProgressAggregator.calcAvg(
        visualSessions.map((s: any) => s.accuracy ?? s.score ?? 0)
      );

      // ── Sight Words ─────────────────────────────────────────────────────
      const sightWordSessions: any[] = sightWord.sessions || [];
      const sightWordAvgScore = ProgressAggregator.calcAvg(
        sightWordSessions.map((s: any) => s.score ?? 0)
      );
      const sightWordHighestLevel = ProgressAggregator.calcSightWordLevel(sightWord);

      // ── Magic Words ─────────────────────────────────────────────────────
      const magicSessions: any[] = magicWords.sessions || [];
      const magicWordsAvgScore = ProgressAggregator.calcAvg(
        magicSessions.map((s: any) => s.score ?? 0)
      );

      // ── Letter Mastery ─────────────────────────────────────────────────────────
      // Read dedicated bridge key + dysPath_meta fallback
      const letterTracingRaw = await AsyncStorage.getItem('letterTracingProgress');
      const letterTracingBridge = ProgressAggregator.safeParseJSON(letterTracingRaw, {});
      const letterMastery = ProgressAggregator.buildLetterMasteryFromBridge(
        letterTracingBridge.sessions ?? [], dysPathMeta
      );

      // ── Emotion / Frustration ───────────────────────────────────────────
      const recentLogs = emotionLogs.slice(-20); // last 20 emotion events
      const frustrationEventCount = recentLogs.filter(
        (log: any) => log.emotion === 'frustrated' || log.emotion === 'confused'
      ).length;

      // ── Streak ──────────────────────────────────────────────────────────
      const streakDays = dysPathMeta.streakDays ?? 0;
      const lastSessionDate = dysPathMeta.lastSessionDate ?? null;
      const totalXP = dysPathMeta.totalXP ?? 0;

      return {
        letterMastery,
        phonicsAvgScore,
        phonicsSessionCount,
        phonicsRecentWords: [
          ...phonicHistory.slice(-5).map((s: any) => s.word ?? ''),
          ...phonicSessions.slice(-5).map((s: any) => s.word ?? ''),
        ].slice(-10),
        rhymeAvgScore,
        rhymeSessionCount: rhymeSessions.length,
        visualDiscrimScore,
        visualSessionCount: visualSessions.length,
        sightWordHighestLevel,
        sightWordAvgScore,
        magicWordsSessionCount: magicSessions.length,
        magicWordsAvgScore,
        frustrationEventCount,
        streakDays,
        lastSessionDate,
        totalXP,
      };
    } catch (err) {
      console.warn('[ProgressAggregator] Failed to aggregate, returning defaults:', err);
      return DEFAULT_PROGRESS;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private static safeParseJSON(raw: string | null, fallback: any): any {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  private static calcAvg(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private static calcSightWordLevel(sightData: any): ChildProgressModel['sightWordHighestLevel'] {
    const completedLevels: string[] = sightData.completedLevels || [];
    if (completedLevels.includes('advanced')) return 'advanced';
    if (completedLevels.includes('intermediate')) return 'intermediate';
    if (completedLevels.includes('beginner')) return 'beginner';
    if ((sightData.sessions || []).length > 0) return 'beginner';
    return 'none';
  }

  private static buildLetterMastery(phonicData: any, dysPathMeta: any): Record<string, LetterProgress> {
    const mastery: Record<string, LetterProgress> = {};
    const tracingData: Record<string, any> = dysPathMeta.letterTracingProgress || {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
      const data = tracingData[letter];
      if (data) {
        mastery[letter] = {
          attempts: data.attempts ?? 0,
          avgAccuracy: data.avgAccuracy ?? 0,
          lastAttemptDate: data.lastAttemptDate ?? null,
          isFluentlyTraced: (data.attempts >= 3) && (data.avgAccuracy >= 80),
        };
      }
    }
    return mastery;
  }

  /**
   * Builds letter mastery from the PathProgressBridge session array.
   * Each session has { score, extra: { letter } }.
   * Falls back to dysPath_meta for legacy data.
   */
  private static buildLetterMasteryFromBridge(
    sessions: any[],
    dysPathMeta: any
  ): Record<string, LetterProgress> {
    // Start with legacy mastery as baseline
    const mastery = ProgressAggregator.buildLetterMastery({}, dysPathMeta);

    // Overlay bridge sessions
    for (const session of sessions) {
      const letter = session.letter ?? session.extra?.letter;
      if (!letter) continue;
      const L = letter.toUpperCase();
      const existing = mastery[L] ?? { attempts: 0, avgAccuracy: 0, lastAttemptDate: null, isFluentlyTraced: false };
      const newAvg = ((existing.avgAccuracy * existing.attempts) + (session.score ?? 0)) / (existing.attempts + 1);
      mastery[L] = {
        attempts: existing.attempts + 1,
        avgAccuracy: Math.round(newAvg),
        lastAttemptDate: session.timestamp ?? null,
        isFluentlyTraced: (existing.attempts + 1 >= 3) && (newAvg >= 80),
      };
    }
    return mastery;
  }


  /**
   * Updates the dysPath_meta key with new tracing result for a letter.
   * Called by PathNodeScreen when a Tracing session completes.
   */
  static async recordTracingResult(letter: string, accuracy: number): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem('dysPath_meta');
      const meta = ProgressAggregator.safeParseJSON(raw, {});
      const lettersProgress = meta.letterTracingProgress || {};
      const existing = lettersProgress[letter] || { attempts: 0, avgAccuracy: 0 };
      const newAvg = ((existing.avgAccuracy * existing.attempts) + accuracy) / (existing.attempts + 1);
      lettersProgress[letter] = {
        attempts: existing.attempts + 1,
        avgAccuracy: Math.round(newAvg),
        lastAttemptDate: new Date().toISOString(),
      };
      meta.letterTracingProgress = lettersProgress;
      await AsyncStorage.setItem('dysPath_meta', JSON.stringify(meta));
    } catch (err) {
      console.warn('[ProgressAggregator] recordTracingResult failed:', err);
    }
  }

  /**
   * Updates streak and XP in dysPath_meta.
   */
  static async recordSessionComplete(xpEarned: number): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem('dysPath_meta');
      const meta = ProgressAggregator.safeParseJSON(raw, {});
      const today = new Date().toDateString();
      const lastDate = meta.lastSessionDate;
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      let streak = meta.streakDays ?? 0;
      if (lastDate === yesterday) {
        streak += 1; // Continued streak
      } else if (lastDate !== today) {
        streak = 1; // Broken streak, restart
      }
      // If lastDate === today, streak stays the same

      meta.streakDays = streak;
      meta.lastSessionDate = today;
      meta.totalXP = (meta.totalXP ?? 0) + xpEarned;

      await AsyncStorage.setItem('dysPath_meta', JSON.stringify(meta));
    } catch (err) {
      console.warn('[ProgressAggregator] recordSessionComplete failed:', err);
    }
  }
}
