/**
 * TracingStatsService.ts
 *
 * Single source of truth for persisted stats across:
 *   - ScalableGuidedTracingScreen (letter tracing accuracy)
 *   - WritingAssessmentScreen     (write & score sessions)
 *   - SessionSummary              (reads real reports)
 *
 * All writes go through here. All reads come from here.
 * Internally uses AsyncStorage with user-namespaced keys.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────
const KEYS = {
  writingStats:      '@writingAssessmentStats_v2',
  tracingReports:    '@tracingSessionReports_v2',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WritingAttempt {
  letter: string;
  isCorrect: boolean;
  confidence: number;   // 0–1 from model
  timingSecs: number;
  feedbackDetail?: string; // e.g. "Mirrored (Horizontal Flip)"
  timestamp: string;    // ISO
}

export interface WritingStatsStore {
  attempts: WritingAttempt[];
}

export interface TracingSessionReport {
  sessionId: string;
  letter: string;
  timestamp: string;       // ISO
  accuracy: number;        // 0–100 (real computed)
  durationSecs: number;
  segmentCount: number;
  segmentAccuracies: number[];   // per-segment coverage %
  // Optional rich fields from ShadowFeatureExtractor (original-app TracingScreen)
  overview?: any;
  clinical?: any;
  ml?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing Assessment Stats
// ─────────────────────────────────────────────────────────────────────────────

/** Persist one Write & Score attempt */
export async function saveWritingAttempt(attempt: WritingAttempt): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.writingStats);
    const store: WritingStatsStore = raw ? JSON.parse(raw) : { attempts: [] };
    // Keep last 200 attempts
    store.attempts = [...store.attempts, attempt].slice(-200);
    await AsyncStorage.setItem(KEYS.writingStats, JSON.stringify(store));
  } catch (err) {
    console.warn('[TracingStatsService] saveWritingAttempt failed:', err);
  }
}

/** Read aggregated Write & Score stats */
export async function getWritingStats(): Promise<{
  total: number;
  correct: number;
  accuracy: number;
  attempts: WritingAttempt[];
}> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.writingStats);
    if (!raw) return { total: 0, correct: 0, accuracy: 0, attempts: [] };
    const store: WritingStatsStore = JSON.parse(raw);
    const total = store.attempts.length;
    const correct = store.attempts.filter(a => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, accuracy, attempts: store.attempts };
  } catch (err) {
    console.warn('[TracingStatsService] getWritingStats failed:', err);
    return { total: 0, correct: 0, accuracy: 0, attempts: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter Tracing Session Reports
// ─────────────────────────────────────────────────────────────────────────────

/** Save a tracing session report (from ScalableGuidedTracing or original TracingScreen) */
export async function saveTracingSessionReport(report: TracingSessionReport): Promise<void> {
  try {
    const key = `${KEYS.tracingReports}_${report.sessionId}`;
    await AsyncStorage.setItem(key, JSON.stringify(report));

    // Also maintain an index of recent session IDs (newest first, max 100)
    const indexKey = `${KEYS.tracingReports}_index`;
    const rawIndex = await AsyncStorage.getItem(indexKey);
    const index: string[] = rawIndex ? JSON.parse(rawIndex) : [];
    const newIndex = [report.sessionId, ...index.filter(id => id !== report.sessionId)].slice(0, 100);
    await AsyncStorage.setItem(indexKey, JSON.stringify(newIndex));
  } catch (err) {
    console.warn('[TracingStatsService] saveTracingSessionReport failed:', err);
  }
}

/** Read a specific session report by ID */
export async function getTracingSessionReport(sessionId: string): Promise<TracingSessionReport | null> {
  try {
    const key = `${KEYS.tracingReports}_${sessionId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[TracingStatsService] getTracingSessionReport failed:', err);
    return null;
  }
}

/** Get the most recent N session reports */
export async function getRecentTracingReports(limit: number = 10): Promise<TracingSessionReport[]> {
  try {
    const indexKey = `${KEYS.tracingReports}_index`;
    const rawIndex = await AsyncStorage.getItem(indexKey);
    if (!rawIndex) return [];
    const index: string[] = JSON.parse(rawIndex);
    const ids = index.slice(0, limit);
    const reports = await Promise.all(ids.map(id => getTracingSessionReport(id)));
    return reports.filter((r): r is TracingSessionReport => r !== null);
  } catch (err) {
    console.warn('[TracingStatsService] getRecentTracingReports failed:', err);
    return [];
  }
}
