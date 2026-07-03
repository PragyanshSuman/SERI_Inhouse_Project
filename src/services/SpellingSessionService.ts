import { WordService, WordEntry } from './WordService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SpellingErrorType =
    | 'correct'
    | 'reversal'        // b↔d, p↔q, n↔u
    | 'omission'        // missing a letter
    | 'insertion'       // added an extra letter
    | 'transposition'   // swapped two adjacent letters (ei→ie)
    | 'substitution'    // replaced a letter with another
    | 'blank';          // nothing written

export interface SpellingWordResult {
    word: string;
    dds: number;
    level: string;
    isTricky: boolean;
    writtenAnswer: string;         // What child indicated they wrote
    selfAssessment: 'yes' | 'mostly' | 'no';
    accuracy: number;              // 0-100 based on edit distance
    errorTypes: SpellingErrorType[];
    svgPathData: string;           // Raw SVG path for report display
    attemptDurationMs: number;
}

export interface SpellingSession {
    sessionId: string;
    patientId: string;
    startedAt: string;
    endedAt?: string;
    words: SpellingWordResult[];
    sessionMode: 'screening' | 'deep_dive';
}

export type SpellingClinicalFlag = 'On-Track' | 'Monitor' | 'High-Risk';

/**
 * SpellingSessionService
 *
 * Manages the full lifecycle of a clinical "Listen & Write" spelling assessment:
 *  - Word auto-selection from ranked corpus
 *  - Levenshtein-based spelling accuracy scoring
 *  - Dyslexia-specific error type classification
 *  - Clinical report generation
 */
export class SpellingSessionService {
    private session: SpellingSession;

    constructor(patientId: string, mode: 'screening' | 'deep_dive' = 'screening') {
        this.session = {
            sessionId: `SPELL-${Date.now()}`,
            patientId,
            startedAt: new Date().toISOString(),
            words: [],
            sessionMode: mode,
        };
    }

    /**
     * Auto-selects a balanced word list from the ranked corpus.
     * Screening: 10 words — 3 Easy + 4 Medium + 2 Hard + 1 Tricky
     */
    getAssessmentWords(): WordEntry[] {
        const isDeep = this.session.sessionMode === 'deep_dive';
        const easy   = WordService.getWordsByLevel('Easy',   isDeep ? 5 : 3);
        const medium = WordService.getWordsByLevel('Medium', isDeep ? 7 : 4);
        const hard   = WordService.getWordsByLevel('Hard',   isDeep ? 5 : 2);
        const tricky = WordService.getTrickyWords(           isDeep ? 3 : 1);

        const allWords = [...easy, ...medium, ...hard, ...tricky];
        return allWords
            .map(w => WordService.getWordInfo(w))
            .filter((e): e is WordEntry => e !== undefined);
    }

    /**
     * Compute spelling accuracy using Levenshtein edit distance.
     */
    private computeAccuracy(expected: string, written: string): number {
        const a = expected.toLowerCase().trim();
        const b = written.toLowerCase().trim();
        if (a === b) return 100;
        if (b === '') return 0;

        // Levenshtein Distance
        const m = a.length, n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }

        const editDist = dp[m][n];
        return Math.max(0, Math.round((1 - editDist / Math.max(m, n)) * 100));
    }

    /**
     * Classify dyslexia-specific spelling errors.
     */
    private classifyErrors(expected: string, written: string): SpellingErrorType[] {
        const a = expected.toLowerCase().trim();
        const b = written.toLowerCase().trim();

        if (b === '') return ['blank'];
        if (a === b) return ['correct'];

        const errors: SpellingErrorType[] = [];

        // Reversal check — classic dyslexia b↔d, p↔q, n↔u, m↔w
        const REVERSAL_PAIRS: [string, string][] = [
            ['b', 'd'], ['p', 'q'], ['n', 'u'], ['m', 'w']
        ];
        const normalise = (s: string) => {
            let r = s;
            for (const [x, y] of REVERSAL_PAIRS) {
                r = r.replace(new RegExp(y, 'g'), x);
            }
            return r;
        };
        if (normalise(a) === normalise(b) && a !== b) {
            errors.push('reversal');
        }

        // Transposition check — adjacent letter swap (thier → their)
        const isTransposition = (s1: string, s2: string): boolean => {
            if (s1.length !== s2.length) return false;
            let diffs = 0;
            for (let i = 0; i < s1.length; i++) {
                if (s1[i] !== s2[i]) diffs++;
            }
            if (diffs === 2) {
                // Check if swapping the two different positions gives s1
                const diffPositions: number[] = [];
                for (let i = 0; i < s1.length; i++) {
                    if (s1[i] !== s2[i]) diffPositions.push(i);
                }
                const [p1, p2] = diffPositions;
                const swapped = b.split('');
                [swapped[p1], swapped[p2]] = [swapped[p2], swapped[p1]];
                return swapped.join('') === a;
            }
            return false;
        };
        if (isTransposition(a, b)) errors.push('transposition');

        // Length-based: omission or insertion
        if (b.length < a.length && !errors.includes('transposition')) errors.push('omission');
        if (b.length > a.length && !errors.includes('transposition')) errors.push('insertion');

        // Generic substitution fallback
        if (errors.length === 0) errors.push('substitution');

        return errors;
    }

    /**
     * Log the result of one spelling attempt.
     */
    logWordResult(
        word: string,
        writtenAnswer: string,
        selfAssessment: 'yes' | 'mostly' | 'no',
        svgPathData: string,
        attemptDurationMs: number
    ): void {
        const wordInfo = WordService.getWordInfo(word);
        const accuracy = this.computeAccuracy(word, writtenAnswer);
        const errorTypes = this.classifyErrors(word, writtenAnswer);

        const result: SpellingWordResult = {
            word,
            dds:    wordInfo?.dds    ?? 3.0,
            level:  wordInfo?.level  ?? 'Medium',
            isTricky: wordInfo?.isTricky ?? false,
            writtenAnswer,
            selfAssessment,
            accuracy,
            errorTypes,
            svgPathData,
            attemptDurationMs,
        };

        this.session.words.push(result);
    }

    finalise(): SpellingSession {
        this.session.endedAt = new Date().toISOString();
        return this.session;
    }

    // ─── Report Computations ────────────────────────────────────────────────

    getAverageAccuracy(): number {
        if (this.session.words.length === 0) return 0;
        return Math.round(
            this.session.words.reduce((s, w) => s + w.accuracy, 0) / this.session.words.length
        );
    }

    getClinicalFlag(): SpellingClinicalFlag {
        const avg = this.getAverageAccuracy();
        if (avg >= 80) return 'On-Track';
        if (avg >= 55) return 'Monitor';
        return 'High-Risk';
    }

    /** Count how many times each error type appeared. */
    getErrorFrequency(): Record<SpellingErrorType, number> {
        const freq: Record<SpellingErrorType, number> = {
            correct: 0, reversal: 0, omission: 0,
            insertion: 0, transposition: 0, substitution: 0, blank: 0,
        };
        for (const w of this.session.words) {
            for (const e of w.errorTypes) {
                freq[e] = (freq[e] ?? 0) + 1;
            }
        }
        return freq;
    }

    /** Returns dominant error type for clinical narrative. */
    getDominantError(): SpellingErrorType | null {
        const freq = this.getErrorFrequency();
        const entries = Object.entries(freq)
            .filter(([k]) => k !== 'correct' && k !== 'blank')
            .sort((a, b) => b[1] - a[1]);
        return entries.length > 0 ? (entries[0][0] as SpellingErrorType) : null;
    }

    getReversalCount(): number {
        return this.session.words.filter(w => w.errorTypes.includes('reversal')).length;
    }

    getTrickyWordAccuracy(): number {
        const tricky = this.session.words.filter(w => w.isTricky);
        if (tricky.length === 0) return 100;
        return Math.round(tricky.reduce((s, w) => s + w.accuracy, 0) / tricky.length);
    }

    getSessionDurationMs(): number {
        const start = new Date(this.session.startedAt).getTime();
        const end = this.session.endedAt
            ? new Date(this.session.endedAt).getTime()
            : Date.now();
        return end - start;
    }

    /** Generates the full plain-text clinical report for sharing. */
    generateReportText(): string {
        const durationSec = Math.round(this.getSessionDurationMs() / 1000);
        const durationStr = `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
        const flag = this.getClinicalFlag();
        const freq = this.getErrorFrequency();
        const dominant = this.getDominantError();

        const wordRows = this.session.words.map(w => {
            const icon = w.accuracy >= 80 ? '✅' : w.accuracy >= 50 ? '⚠️' : '🔴';
            return `${icon}  ${w.word.padEnd(14)} DDS:${w.dds.toFixed(1)}  Acc:${w.accuracy}%  Written:"${w.writtenAnswer}"  Errors:[${w.errorTypes.join(',')}]`;
        }).join('\n');

        const errorRows = Object.entries(freq)
            .filter(([, v]) => v > 0 && !['correct', 'blank'].includes(_))
            .map(([k, v]) => `  ${k.padEnd(14)}: ${v} occurrence(s)`)
            .join('\n');

        const recommendations: string[] = [];
        if (freq.reversal > 0) recommendations.push('• Mirror-letter discrimination exercises (b/d, p/q) — Orton-Gillingham Unit 4');
        if (freq.omission > 0) recommendations.push('• Phoneme segmentation drills — finger-tapping each sound while writing');
        if (freq.transposition > 0) recommendations.push('• Syllable-by-syllable dictation practice to reinforce letter order');
        if (freq.substitution > 0) recommendations.push('• Multisensory spelling (see it → hear it → write it → check it)');
        if (this.getTrickyWordAccuracy() < 60) recommendations.push('• Heart Word wall — irregular word memorisation via repeated exposure');
        if (recommendations.length === 0) recommendations.push('• Continue current curriculum; re-assess in 8 weeks');

        return `
══════════════════════════════════════════════
  DYSLEXIA SPELLING ASSESSMENT REPORT
  UnifiedLearningApp — Clinical Edition
══════════════════════════════════════════════
Patient ID     : ${this.session.patientId.toUpperCase()}
Session ID     : ${this.session.sessionId}
Date           : ${new Date(this.session.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
Duration       : ${durationStr}
Words Tested   : ${this.session.words.length}
Assessment     : Listen & Write (Handwriting Canvas)

OVERALL PERFORMANCE
───────────────────
Clinical Flag         : ${flag === 'High-Risk' ? '🔴' : flag === 'Monitor' ? '⚠️' : '✅'} ${flag.toUpperCase()}
Average Accuracy      : ${this.getAverageAccuracy()}%
Tricky Word Accuracy  : ${this.getTrickyWordAccuracy()}%
Reversal Instances    : ${this.getReversalCount()}

WORD-BY-WORD ANALYSIS
──────────────────────
${wordRows}

SPELLING ERROR FREQUENCY
─────────────────────────
${errorRows || '  No errors recorded.'}

DOMINANT ERROR PATTERN
───────────────────────
${dominant ? `"${dominant}" errors are the most frequent pattern.` : 'No dominant error pattern identified.'}

CLINICAL RECOMMENDATIONS
─────────────────────────
${recommendations.join('\n')}

══════════════════════════════════════════════
Generated by UnifiedLearningApp v1.2
For clinical use only — not a substitute for formal SLP evaluation
══════════════════════════════════════════════
        `.trim();
    }

    getSession(): SpellingSession { return this.session; }
}

// Helper used in generateReportText — suppress TS unused var
function _<T>(x: T): T { return x; }
