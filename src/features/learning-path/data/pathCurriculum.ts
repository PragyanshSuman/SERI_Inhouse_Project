/**
 * pathCurriculum.ts
 *
 * Curriculum for DysPath — uses ONLY the 7 features already on the Home Screen.
 * Each node opens the EXACT same route that the Home Screen opens.
 *
 * The 7 real features:
 *   1. LetterTracing          – "Letter Tracing" (Master the alphabet)
 *   2. PhonicCheck            – "Phonic Check"   (Practice speaking)
 *   3. PhonicsPhonemes        – "Magic Words"    (Magic Word Studio)
 *   4. OriginalApp            – "Writing Assessment"
 *   5. SightWordsDashboard    – "Word Ninja"     (Fast-paced slicing)
 *   6. RhymeDashboard         – "Rhyme Time"     (Find matching words)
 *   7. VisualDiscriminationDashboard – "Visual Discrimination"
 */

// Only the real route names that exist in RootNavigator
export type ModuleKey =
  | 'LetterTracing'
  | 'PhonicCheck'
  | 'PhonicsPhonemes'
  | 'OriginalApp'
  | 'SightWordsDashboard'
  | 'RhymeDashboard'
  | 'VisualDiscriminationDashboard';

export type SkillTag =
  | 'letter_tracing'
  | 'phonics'
  | 'magic_words'
  | 'writing'
  | 'sight_words'
  | 'rhyming'
  | 'visual_discrimination';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'review';

export interface CurriculumNode {
  id: string;
  unitId: string;
  title: string;
  description: string;        // What to do in this session
  icon: string;
  moduleKey: ModuleKey;
  moduleParams?: Record<string, any>;
  skillTag: SkillTag;
  difficulty: Difficulty;
  baseXP: number;
  targetScore: number;
  targetDurationSecs: number;
  prerequisiteIds: string[];
  isBonus?: boolean;
  reviewIntervalDays?: number;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  themeColor: string;
  bgColor: string;
  nodeIds: string[];
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT 1 — See & Recognise
// Skill focus: visual discrimination + letter tracing (beginner)
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_1_NODES: CurriculumNode[] = [
  {
    id: 'u1_n1',
    unitId: 'unit_1',
    title: 'Visual Discrimination',
    description: 'Open Visual Discrimination and try to spot which letter is different. Play at least one round of the "Find the Letter" game.',
    icon: '👁️',
    moduleKey: 'VisualDiscriminationDashboard',
    skillTag: 'visual_discrimination',
    difficulty: 'beginner',
    baseXP: 15,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: [],
  },
  {
    id: 'u1_n2',
    unitId: 'unit_1',
    title: 'Letter Tracing',
    description: 'Open Letter Tracing and trace any 3 letters from the alphabet using your finger.',
    icon: '✏️',
    moduleKey: 'LetterTracing',
    skillTag: 'letter_tracing',
    difficulty: 'beginner',
    baseXP: 15,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: [],
  },
  {
    id: 'u1_n3',
    unitId: 'unit_1',
    title: 'Sort the Letters',
    description: 'Go to Visual Discrimination and play the Letter Sorting game — drag each letter to the right monster!',
    icon: '🗂️',
    moduleKey: 'VisualDiscriminationDashboard',
    skillTag: 'visual_discrimination',
    difficulty: 'beginner',
    baseXP: 15,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: ['u1_n1'],
  },
  {
    id: 'u1_n4',
    unitId: 'unit_1',
    title: 'Letter Tracing — Round 2',
    description: 'Continue tracing — pick 3 more letters and try for a smoother stroke this time.',
    icon: '✏️',
    moduleKey: 'LetterTracing',
    skillTag: 'letter_tracing',
    difficulty: 'beginner',
    baseXP: 15,
    targetScore: 65,
    targetDurationSecs: 120,
    prerequisiteIds: ['u1_n2'],
  },
  {
    id: 'u1_n5',
    unitId: 'unit_1',
    title: 'Visual Challenge',
    description: 'Go back to Visual Discrimination and try a harder letter pair. Can you beat your previous score?',
    icon: '🎯',
    moduleKey: 'VisualDiscriminationDashboard',
    skillTag: 'visual_discrimination',
    difficulty: 'intermediate',
    baseXP: 20,
    targetScore: 70,
    targetDurationSecs: 90,
    prerequisiteIds: ['u1_n3', 'u1_n4'],
    reviewIntervalDays: 3,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UNIT 2 — Hear & Say
// Skill focus: phonics, rhyming, magic words (beginner → intermediate)
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_2_NODES: CurriculumNode[] = [
  {
    id: 'u2_n1',
    unitId: 'unit_2',
    title: 'Rhyme Time',
    description: 'Open Rhyme Time and help MC Frog find matching rhyming words. Try to get 5 correct pairs!',
    icon: '🎵',
    moduleKey: 'RhymeDashboard',
    skillTag: 'rhyming',
    difficulty: 'beginner',
    baseXP: 15,
    targetScore: 60,
    targetDurationSecs: 180,
    prerequisiteIds: ['u1_n2'],
  },
  {
    id: 'u2_n2',
    unitId: 'unit_2',
    title: 'Magic Words Studio',
    description: 'Open Magic Words and listen carefully to the sounds — try to identify where each phoneme hides in the word.',
    icon: '✨',
    moduleKey: 'PhonicsPhonemes',
    skillTag: 'magic_words',
    difficulty: 'beginner',
    baseXP: 20,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: ['u2_n1'],
  },
  {
    id: 'u2_n3',
    unitId: 'unit_2',
    title: 'Phonic Check',
    description: 'Open Phonic Check and speak the words shown on screen. Our AI will measure how clearly you say each sound.',
    icon: '🎤',
    moduleKey: 'PhonicCheck',
    skillTag: 'phonics',
    difficulty: 'beginner',
    baseXP: 20,
    targetScore: 60,
    targetDurationSecs: 90,
    prerequisiteIds: ['u2_n2'],
  },
  {
    id: 'u2_n4',
    unitId: 'unit_2',
    title: 'Rhyme Time — Round 2',
    description: 'Go back to Rhyme Time for another session. Can you find even more rhyming pairs than last time?',
    icon: '🎵',
    moduleKey: 'RhymeDashboard',
    skillTag: 'rhyming',
    difficulty: 'intermediate',
    baseXP: 20,
    targetScore: 65,
    targetDurationSecs: 150,
    prerequisiteIds: ['u2_n1'],
    reviewIntervalDays: 3,
  },
  {
    id: 'u2_n5',
    unitId: 'unit_2',
    title: 'Magic Words — Level Up',
    description: 'Return to Magic Words Studio and try harder words. Focus on blending the sounds together.',
    icon: '✨',
    moduleKey: 'PhonicsPhonemes',
    skillTag: 'magic_words',
    difficulty: 'intermediate',
    baseXP: 20,
    targetScore: 65,
    targetDurationSecs: 120,
    prerequisiteIds: ['u2_n2', 'u2_n3'],
  },
  {
    id: 'u2_n6',
    unitId: 'unit_2',
    title: 'Phonic Check — Beat Your Score',
    description: 'Open Phonic Check again. You spoke before — now try to score even higher by being clearer!',
    icon: '🎤',
    moduleKey: 'PhonicCheck',
    skillTag: 'phonics',
    difficulty: 'intermediate',
    baseXP: 25,
    targetScore: 70,
    targetDurationSecs: 90,
    prerequisiteIds: ['u2_n3', 'u2_n5'],
    reviewIntervalDays: 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UNIT 3 — Read & Remember
// Skill focus: sight words, writing, mixed
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_3_NODES: CurriculumNode[] = [
  {
    id: 'u3_n1',
    unitId: 'unit_3',
    title: 'Word Ninja',
    description: 'Open Word Ninja and slice as many sight words as you can. These are the words that appear on every page!',
    icon: '🥷',
    moduleKey: 'SightWordsDashboard',
    skillTag: 'sight_words',
    difficulty: 'beginner',
    baseXP: 20,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: ['u2_n1'],
  },
  {
    id: 'u3_n2',
    unitId: 'unit_3',
    title: 'Writing Assessment',
    description: 'Open Writing Assessment and write a letter from memory. The app will give you a score on your accuracy!',
    icon: '📝',
    moduleKey: 'OriginalApp',
    skillTag: 'writing',
    difficulty: 'beginner',
    baseXP: 25,
    targetScore: 60,
    targetDurationSecs: 120,
    prerequisiteIds: ['u1_n4'],
  },
  {
    id: 'u3_n3',
    unitId: 'unit_3',
    title: 'Word Ninja — Harder Words',
    description: 'Go back to Word Ninja and pick a harder difficulty level. How many can you slice before time runs out?',
    icon: '⚡',
    moduleKey: 'SightWordsDashboard',
    skillTag: 'sight_words',
    difficulty: 'intermediate',
    baseXP: 25,
    targetScore: 65,
    targetDurationSecs: 120,
    prerequisiteIds: ['u3_n1'],
  },
  {
    id: 'u3_n4',
    unitId: 'unit_3',
    title: 'Writing Assessment — Round 2',
    description: 'Open Writing Assessment and try different letters. See if your accuracy has improved since last time!',
    icon: '📝',
    moduleKey: 'OriginalApp',
    skillTag: 'writing',
    difficulty: 'intermediate',
    baseXP: 25,
    targetScore: 65,
    targetDurationSecs: 120,
    prerequisiteIds: ['u3_n2'],
    reviewIntervalDays: 5,
  },
  {
    id: 'u3_n5',
    unitId: 'unit_3',
    title: 'Word Ninja — Speed Mode',
    description: 'Word Ninja on advanced! Fastest mode — how many sight words can you identify correctly?',
    icon: '🥷',
    moduleKey: 'SightWordsDashboard',
    skillTag: 'sight_words',
    difficulty: 'advanced',
    baseXP: 30,
    targetScore: 70,
    targetDurationSecs: 90,
    prerequisiteIds: ['u3_n3'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UNIT 4 — Master & Review
// Cross-skill review to reinforce all previously covered areas
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_4_NODES: CurriculumNode[] = [
  {
    id: 'u4_n1',
    unitId: 'unit_4',
    title: 'Fluency Check',
    description: 'Open Phonic Check and speak as clearly and quickly as you can. This tests your reading fluency.',
    icon: '💨',
    moduleKey: 'PhonicCheck',
    skillTag: 'phonics',
    difficulty: 'advanced',
    baseXP: 30,
    targetScore: 70,
    targetDurationSecs: 90,
    prerequisiteIds: ['u2_n6'],
    reviewIntervalDays: 5,
  },
  {
    id: 'u4_n2',
    unitId: 'unit_4',
    title: 'Advanced Magic Words',
    description: 'Open Magic Words for the most challenging phoneme exercises — digraphs, blends, and complex sounds.',
    icon: '✨',
    moduleKey: 'PhonicsPhonemes',
    skillTag: 'magic_words',
    difficulty: 'advanced',
    baseXP: 30,
    targetScore: 70,
    targetDurationSecs: 150,
    prerequisiteIds: ['u2_n5'],
  },
  {
    id: 'u4_n3',
    unitId: 'unit_4',
    title: 'Letter Tracing — Master',
    description: 'Open Letter Tracing and attempt the most difficult letters in the alphabet — G, J, Q, Z.',
    icon: '✏️',
    moduleKey: 'LetterTracing',
    skillTag: 'letter_tracing',
    difficulty: 'advanced',
    baseXP: 25,
    targetScore: 70,
    targetDurationSecs: 90,
    prerequisiteIds: ['u1_n5'],
  },
  {
    id: 'u4_n4',
    unitId: 'unit_4',
    title: 'Rhyme Master',
    description: 'Open Rhyme Time one more time — aim for the highest score you have ever achieved!',
    icon: '🎵',
    moduleKey: 'RhymeDashboard',
    skillTag: 'rhyming',
    difficulty: 'advanced',
    baseXP: 30,
    targetScore: 75,
    targetDurationSecs: 150,
    prerequisiteIds: ['u2_n4'],
    reviewIntervalDays: 7,
  },
  {
    id: 'u4_n5',
    unitId: 'unit_4',
    title: 'Writing — Grand Test',
    description: 'Open Writing Assessment and write as many letters as accurately as you can. This is your final writing milestone!',
    icon: '🏆',
    moduleKey: 'OriginalApp',
    skillTag: 'writing',
    difficulty: 'advanced',
    baseXP: 35,
    targetScore: 75,
    targetDurationSecs: 120,
    prerequisiteIds: ['u3_n4'],
    isBonus: true,
    reviewIntervalDays: 7,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UNIT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const CURRICULUM_UNITS: CurriculumUnit[] = [
  {
    id: 'unit_1',
    title: 'See & Recognise',
    subtitle: 'Visual + Tracing',
    icon: '👁️',
    themeColor: '#5B6EC8',
    bgColor: '#F3F1FA',
    nodeIds: UNIT_1_NODES.map(n => n.id),
    description: 'Train your eyes to tell letters apart, then trace them with confidence.',
  },
  {
    id: 'unit_2',
    title: 'Hear & Say',
    subtitle: 'Phonics + Rhymes',
    icon: '🔊',
    themeColor: '#2E8B7A',
    bgColor: '#F0F7F4',
    nodeIds: UNIT_2_NODES.map(n => n.id),
    description: 'Listen to sounds, speak words clearly, and discover rhyming patterns.',
  },
  {
    id: 'unit_3',
    title: 'Read & Write',
    subtitle: 'Sight Words + Writing',
    icon: '📖',
    themeColor: '#D97706',
    bgColor: '#FEF9EE',
    nodeIds: UNIT_3_NODES.map(n => n.id),
    description: 'Learn common sight words and practise writing letters from memory.',
  },
  {
    id: 'unit_4',
    title: 'Master & Shine',
    subtitle: 'Advanced Review',
    icon: '🏆',
    themeColor: '#7C3AED',
    bgColor: '#F5F3FF',
    nodeIds: UNIT_4_NODES.map(n => n.id),
    description: 'Advanced sessions across every skill — prove you have mastered them all!',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Flat list and lookup maps
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_NODES: CurriculumNode[] = [
  ...UNIT_1_NODES,
  ...UNIT_2_NODES,
  ...UNIT_3_NODES,
  ...UNIT_4_NODES,
];

export const NODE_MAP: Record<string, CurriculumNode> = Object.fromEntries(
  ALL_NODES.map(n => [n.id, n])
);

export const UNIT_MAP: Record<string, CurriculumUnit> = Object.fromEntries(
  CURRICULUM_UNITS.map(u => [u.id, u])
);
