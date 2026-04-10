/**
 * XPEngine.ts
 * 
 * Calculates XP earned from a completed path node session and manages
 * badge milestones. All rewards are local — no server needed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface XPResult {
  baseXP: number;
  accuracyBonus: number;
  speedBonus: number;
  streakMultiplier: number;
  firstAttemptBonus: number;
  totalXP: number;
  badgesEarned: Badge[];
  breakdown: string; // Human-readable summary
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
}

const BADGES: Omit<Badge, 'earnedDate'>[] = [
  { id: 'first_step', title: 'First Step! 👣', description: 'Completed your first path activity', icon: '👣' },
  { id: 'sound_star', title: 'Sound Star! 🔊', description: 'Scored 90%+ on a phonics activity', icon: '🔊' },
  { id: 'perfect_trace', title: 'Perfect Trace! ✏️', description: 'Scored 95%+ on letter tracing', icon: '✏️' },
  { id: 'rhyme_king', title: 'Rhyme King! 🎵', description: 'Completed 5 rhyme activities', icon: '🎵' },
  { id: 'word_ninja', title: 'Word Ninja! 🥷', description: 'Completed 3 sight word sessions', icon: '🥷' },
  { id: 'streak_3', title: '3-Day Streak! 🔥', description: 'Learned for 3 days in a row', icon: '🔥' },
  { id: 'streak_7', title: 'Week Warrior! 🗓️', description: 'Learned for 7 days in a row', icon: '🗓️' },
  { id: 'streak_30', title: 'Monthly Master! 📅', description: 'Learned for 30 days in a row', icon: '📅' },
  { id: 'xp_100', title: '100 XP Club! ⭐', description: 'Earned 100 total XP', icon: '⭐' },
  { id: 'xp_500', title: '500 XP Legend! 💫', description: 'Earned 500 total XP', icon: '💫' },
  { id: 'xp_1000', title: 'XP Champion! 🏅', description: 'Earned 1000 total XP', icon: '🏅' },
  { id: 'unit_1_complete', title: 'Letter Hero! 🔤', description: 'Completed Unit 1 — Letter Foundations', icon: '🔤' },
  { id: 'unit_2_complete', title: 'Sound Bridge! 🔊', description: 'Completed Unit 2 — Sound Bridges', icon: '🌉' },
  { id: 'unit_3_complete', title: 'Word Builder! 📖', description: 'Completed Unit 3 — Word Building', icon: '📖' },
  { id: 'unit_4_complete', title: 'Fluency Star! 🗣️', description: 'Completed Unit 4 — Fluency & Speech', icon: '🗣️' },
  { id: 'path_champion', title: 'DysPath Champion! 🏆', description: 'Completed the entire DysPath curriculum!', icon: '🏆' },
];

export class XPEngine {
  /**
   * Calculate XP earned from completing a curriculum node.
   */
  static calculate(params: {
    baseXP: number;
    score: number;            // 0–100
    targetScore: number;      // Threshold for "completed"
    durationSecs: number;     // How long child took
    targetDurationSecs: number;
    streakDays: number;
    isFirstAttempt: boolean;
  }): XPResult {
    const { baseXP, score, targetScore, durationSecs, targetDurationSecs, streakDays, isFirstAttempt } = params;

    // ── Accuracy Bonus ────────────────────────────────────────────────────
    let accuracyBonus = 0;
    if (score >= 95) accuracyBonus = Math.round(baseXP * 1.5); // 150% bonus
    else if (score >= 85) accuracyBonus = Math.round(baseXP * 0.75);
    else if (score >= targetScore) accuracyBonus = Math.round(baseXP * 0.25);

    // ── Speed Bonus ───────────────────────────────────────────────────────
    let speedBonus = 0;
    if (durationSecs <= targetDurationSecs * 0.75) {
      speedBonus = 15; // Finished faster than 75% of expected time
    } else if (durationSecs <= targetDurationSecs) {
      speedBonus = 5;
    }

    // ── Streak Multiplier ─────────────────────────────────────────────────
    let streakMultiplier = 1;
    if (streakDays >= 30) streakMultiplier = 2.0;
    else if (streakDays >= 14) streakMultiplier = 1.75;
    else if (streakDays >= 7) streakMultiplier = 1.5;
    else if (streakDays >= 3) streakMultiplier = 1.25;

    // ── First Attempt Bonus ───────────────────────────────────────────────
    const firstAttemptBonus = isFirstAttempt && score >= targetScore ? 10 : 0;

    // ── Total XP ──────────────────────────────────────────────────────────
    const rawTotal = (baseXP + accuracyBonus + speedBonus + firstAttemptBonus) * streakMultiplier;
    const totalXP = Math.round(rawTotal);

    const breakdown = XPEngine.buildBreakdown({
      baseXP, accuracyBonus, speedBonus, firstAttemptBonus,
      streakMultiplier, totalXP,
    });

    return {
      baseXP,
      accuracyBonus,
      speedBonus,
      streakMultiplier,
      firstAttemptBonus,
      totalXP,
      badgesEarned: [], // Populated by checkBadges
      breakdown,
    };
  }

  /**
   * Check which new badges the child has earned. Updates AsyncStorage.
   */
  static async checkBadges(params: {
    score: number;
    totalXP: number;
    streakDays: number;
    moduleKey: string;
    completedNodeIds: string[];
    unlockedBadgeIds: string[];
  }): Promise<Badge[]> {
    const { score, totalXP, streakDays, moduleKey, completedNodeIds, unlockedBadgeIds } = params;
    const newBadges: Badge[] = [];

    const earn = (id: string) => {
      if (!unlockedBadgeIds.includes(id)) {
        const def = BADGES.find(b => b.id === id);
        if (def) {
          newBadges.push({ ...def, earnedDate: new Date().toISOString() });
        }
      }
    };

    // First ever activity
    if (completedNodeIds.length === 1) earn('first_step');

    // Score-based
    if (score >= 90 && ['PhonicCheck', 'PhonicCheckStudio'].includes(moduleKey)) earn('sound_star');
    if (score >= 95 && ['Tracing', 'ScalableGuidedTracing'].includes(moduleKey)) earn('perfect_trace');

    // Module count
    const rhymeNodes = completedNodeIds.filter(id => id.includes('u2_n') || id.includes('rhyme')).length;
    if (rhymeNodes >= 5) earn('rhyme_king');

    const ninjaNodes = completedNodeIds.filter(id => id.includes('u3_n')).length;
    if (ninjaNodes >= 3) earn('word_ninja');

    // Streak
    if (streakDays >= 3) earn('streak_3');
    if (streakDays >= 7) earn('streak_7');
    if (streakDays >= 30) earn('streak_30');

    // XP milestones
    if (totalXP >= 100) earn('xp_100');
    if (totalXP >= 500) earn('xp_500');
    if (totalXP >= 1000) earn('xp_1000');

    // Unit completion
    const unit1Ids = ['u1_n1','u1_n2','u1_n3','u1_n4','u1_n5','u1_n6','u1_n7','u1_n8','u1_n9'];
    if (unit1Ids.every(id => completedNodeIds.includes(id))) earn('unit_1_complete');

    const unit2Ids = ['u2_n1','u2_n2','u2_n3','u2_n4','u2_n5','u2_n6','u2_n7','u2_n8','u2_n9'];
    if (unit2Ids.every(id => completedNodeIds.includes(id))) earn('unit_2_complete');

    const unit3Ids = ['u3_n1','u3_n2','u3_n3','u3_n4','u3_n5','u3_n6','u3_n7','u3_n8','u3_n9'];
    if (unit3Ids.every(id => completedNodeIds.includes(id))) earn('unit_3_complete');

    const unit4Ids = ['u4_n1','u4_n2','u4_n3','u4_n4','u4_n5','u4_n6','u4_n7','u4_n8'];
    if (unit4Ids.every(id => completedNodeIds.includes(id))) earn('unit_4_complete');

    const unit5Ids = ['u5_n1','u5_n2','u5_n3','u5_n4','u5_n5'];
    if (unit5Ids.every(id => completedNodeIds.includes(id))) earn('path_champion');

    // Persist new badges
    if (newBadges.length > 0) {
      try {
        const raw = await AsyncStorage.getItem('dysPath_badges');
        const existing: Badge[] = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem('dysPath_badges', JSON.stringify([...existing, ...newBadges]));
      } catch (e) {
        console.warn('[XPEngine] Failed to save badges:', e);
      }
    }

    return newBadges;
  }

  static async loadBadges(): Promise<Badge[]> {
    try {
      const raw = await AsyncStorage.getItem('dysPath_badges');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static buildBreakdown(p: {
    baseXP: number; accuracyBonus: number; speedBonus: number;
    firstAttemptBonus: number; streakMultiplier: number; totalXP: number;
  }): string {
    const parts: string[] = [`Base: +${p.baseXP} XP`];
    if (p.accuracyBonus > 0) parts.push(`Accuracy bonus: +${p.accuracyBonus}`);
    if (p.speedBonus > 0) parts.push(`Speed bonus: +${p.speedBonus}`);
    if (p.firstAttemptBonus > 0) parts.push(`First try: +${p.firstAttemptBonus}`);
    if (p.streakMultiplier > 1) parts.push(`Streak ×${p.streakMultiplier}`);
    parts.push(`Total: ${p.totalXP} XP`);
    return parts.join(' • ');
  }
}
