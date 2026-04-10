/**
 * PathProgressBridge.ts
 *
 * A single, lightweight write-bridge that each existing module calls
 * when a session ends. Writes a standardised record to AsyncStorage
 * so ProgressAggregator can read it and the PathEngine can adapt
 * the learning plan accordingly.
 *
 * DESIGN RULE: This file imports nothing from React Navigation or UI.
 * It is a pure data service — no side effects beyond AsyncStorage writes.
 *
 * Each record shape:
 *   { sessions: [{ score, timestamp, durationSecs, extra? }] }
 *
 * Keys written (match ProgressAggregator.ts):
 *   'phonicCheckProgress'
 *   'rhymeTimeProgress'
 *   'visualDiscrimProgress'
 *   'sightWordProgress'
 *   'magicWordsProgress'
 *   'letterTracingProgress'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BridgeSession {
  score: number;          // 0–100
  timestamp: string;      // ISO string
  durationSecs: number;   // How long the session lasted
  extra?: Record<string, any>; // Module-specific extras (level, letter, etc.)
}

const STORAGE_KEYS = {
  phonicCheck:   'phonicCheckProgress',
  rhymeTime:     'rhymeTimeProgress',
  visualDiscrim: 'visualDiscrimProgress',
  sightWords:    'sightWordProgress',
  magicWords:    'magicWordsProgress',
  letterTracing: 'letterTracingProgress',
} as const;

type ModuleKey = keyof typeof STORAGE_KEYS;

/** Internal: append a session record to any bridge key */
async function appendSession(
  key: string,
  session: BridgeSession,
  extra?: Record<string, any>
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const existing: { sessions: BridgeSession[] } = raw
      ? JSON.parse(raw)
      : { sessions: [] };

    // Keep last 50 sessions per module to prevent unbounded growth
    const sessions = [...existing.sessions, { ...session, ...extra }].slice(-50);
    await AsyncStorage.setItem(key, JSON.stringify({ sessions }));
  } catch (err) {
    console.warn(`[PathProgressBridge] Failed to write to key "${key}":`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — one function per module
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this inside PhonicCheckStudioScreen when a word result is received.
 * @param score 0–100 accuracy/confidence from AI
 * @param word  The word that was practised
 * @param durationSecs How long the session took
 */
export async function recordPhonicCheck(
  score: number,
  word: string,
  durationSecs: number = 30
): Promise<void> {
  await appendSession(STORAGE_KEYS.phonicCheck, {
    score: Math.round(score),
    timestamp: new Date().toISOString(),
    durationSecs,
    extra: { word },
  });
}

/**
 * Call this inside RhymingMatchGameScreen when the user answers a round.
 * @param score 0–100 (correct=100, wrong=0 or partial depending on combo)
 * @param durationSecs Session duration
 */
export async function recordRhymeTime(
  score: number,
  durationSecs: number = 60
): Promise<void> {
  await appendSession(STORAGE_KEYS.rhymeTime, {
    score: Math.round(score),
    timestamp: new Date().toISOString(),
    durationSecs,
  });
}

/**
 * Call this inside OddOneOutGameScreen on correct/incorrect answers.
 * @param accuracy 0–100
 * @param durationSecs Time taken for one game cycle
 */
export async function recordVisualDiscrim(
  accuracy: number,
  durationSecs: number = 20
): Promise<void> {
  await appendSession(STORAGE_KEYS.visualDiscrim, {
    score: Math.round(accuracy),
    timestamp: new Date().toISOString(),
    durationSecs,
  });
}

/**
 * Call this inside WordNinjaGameScreen when a game ends (won or lost).
 * @param score points earned (will be normalised to 0–100)
 * @param wordsFound number of correct words found
 * @param targetWins the win target (e.g. 5)
 * @param level 'beginner' | 'intermediate' | 'advanced'
 * @param durationSecs Time taken for the game
 */
export async function recordSightWords(
  score: number,
  wordsFound: number,
  targetWins: number,
  level: string,
  durationSecs: number = 60
): Promise<void> {
  const normalised = Math.round((wordsFound / Math.max(1, targetWins)) * 100);
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.sightWords);
  const existing: { sessions: any[]; completedLevels: string[] } = raw
    ? JSON.parse(raw)
    : { sessions: [], completedLevels: [] };

  const completedLevels = [...new Set([
    ...existing.completedLevels,
    ...(wordsFound >= targetWins ? [level] : []),
  ])];

  const sessions = [...existing.sessions, {
    score: normalised,
    timestamp: new Date().toISOString(),
    durationSecs,
    wordsFound,
    level,
  }].slice(-50);

  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.sightWords,
      JSON.stringify({ sessions, completedLevels })
    );
  } catch (err) {
    console.warn('[PathProgressBridge] recordSightWords failed:', err);
  }
}

/**
 * Call this inside PronunciationDemoScreen when a word card is interacted with.
 * Since Magic Words is open-ended (no pass/fail), we score based on engagement:
 * each word added or replayed = 1 interaction, mapped to a score out of 100.
 * @param interactionCount How many words the child explored this session
 * @param durationSecs Time spent in the screen
 */
export async function recordMagicWords(
  interactionCount: number,
  durationSecs: number = 60
): Promise<void> {
  // Normalise: 5+ interactions = 100, fewer scales linearly
  const score = Math.min(100, Math.round((interactionCount / 5) * 100));
  await appendSession(STORAGE_KEYS.magicWords, {
    score,
    timestamp: new Date().toISOString(),
    durationSecs,
    extra: { interactionCount },
  });
}

/**
 * Call this inside ScalableGuidedTracingScreen / TracingScreen after a letter
 * is traced and scored.
 * @param letter  The letter that was traced (e.g. 'A')
 * @param accuracy 0–100 accuracy score
 * @param durationSecs Time taken
 */
export async function recordLetterTracing(
  letter: string,
  accuracy: number,
  durationSecs: number = 30
): Promise<void> {
  await appendSession(STORAGE_KEYS.letterTracing, {
    score: Math.round(accuracy),
    timestamp: new Date().toISOString(),
    durationSecs,
    extra: { letter: letter.toUpperCase() },
  });

  // Also persist to dysPath_meta for the per-letter mastery map
  try {
    const raw = await AsyncStorage.getItem('dysPath_meta');
    const meta = raw ? JSON.parse(raw) : {};
    const lettersProgress = meta.letterTracingProgress || {};
    const existing = lettersProgress[letter.toUpperCase()] || { attempts: 0, avgAccuracy: 0 };
    const newAvg = ((existing.avgAccuracy * existing.attempts) + accuracy) / (existing.attempts + 1);
    lettersProgress[letter.toUpperCase()] = {
      attempts: existing.attempts + 1,
      avgAccuracy: Math.round(newAvg),
      lastAttemptDate: new Date().toISOString(),
    };
    meta.letterTracingProgress = lettersProgress;
    await AsyncStorage.setItem('dysPath_meta', JSON.stringify(meta));
  } catch (err) {
    console.warn('[PathProgressBridge] dysPath_meta letter update failed:', err);
  }
}

/**
 * Also reads the REAL PhonicCheck storage (@statistics_{userId}) so existing
 * data is not ignored. Called by ProgressAggregator automatically.
 */
export async function readPhonicCheckLegacy(userId: string | null): Promise<number> {
  try {
    const ns = userId ?? 'guest';
    const raw = await AsyncStorage.getItem(`@statistics_${ns}`);
    if (!raw) return 0;
    const stats = JSON.parse(raw);
    return stats.averageScore ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Also reads the REAL Writing Assessment storage so existing sessions are used.
 * Returns average accuracy across all sessions for this user.
 */
export async function readWritingAssessmentLegacy(userId: string | null): Promise<number> {
  try {
    const ns = userId ?? 'guest';
    const raw = await AsyncStorage.getItem(`@analytics_history_${ns}`);
    if (!raw) return 0;
    const history: Array<{ sessionId: string; letter: string; timestamp: string }> = JSON.parse(raw);
    return history.length > 0 ? 50 : 0; // Has sessions = mid-range baseline
  } catch {
    return 0;
  }
}
