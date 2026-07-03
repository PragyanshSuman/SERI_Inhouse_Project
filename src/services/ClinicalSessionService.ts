import { WordService, WordEntry } from './WordService';

export interface ClinicalWordResult {
    word: string;
    dds: number;
    level: string;
    isTricky: boolean;
    accuracy: number;
    phonemes: { p: string; score: number }[];
    transcriptionHeard: string;
    attemptDurationMs: number;
    verdict: string;
}

export interface ClinicalSession {
    sessionId: string;
    patientId: string;
    startedAt: string;
    endedAt?: string;
    words: ClinicalWordResult[];
    sessionMode: 'screening' | 'deep_dive';
}

export type ClinicalFlag = 'On-Track' | 'Monitor' | 'High-Risk';

/**
 * ClinicalSessionService
 *
 * Manages the full lifecycle of a clinical speech assessment session:
 *  - Word auto-selection from ranked corpus (Easy/Medium/Hard/Tricky balance)
 *  - Result aggregation per word
 *  - Clinical report generation with phoneme error pattern analysis
 */
export class ClinicalSessionService {
    private session: ClinicalSession;

    constructor(patientId: string, mode: 'screening' | 'deep_dive' = 'screening') {
        this.session = {
            sessionId: `SESS-${Date.now()}`,
            patientId,
            startedAt: new Date().toISOString(),
            words: [],
            sessionMode: mode,
        };
    }

    /**
     * Auto-selects a balanced word list from the ranked corpus.
     * Screening: 10 words — 3 Easy + 4 Medium + 2 Hard + 1 Tricky
     * Deep Dive:  20 words — 5 Easy + 7 Medium + 5 Hard + 3 Tricky
     */
    getAssessmentWords(): WordEntry[] {
        const isDeep = this.session.sessionMode === 'deep_dive';

        const easy   = WordService.getWordsByLevel('Easy',   isDeep ? 5 : 3);
        const medium = WordService.getWordsByLevel('Medium', isDeep ? 7 : 4);
        const hard   = WordService.getWordsByLevel('Hard',   isDeep ? 5 : 2);
        const tricky = WordService.getTrickyWords(           isDeep ? 3 : 1);

        const allWords = [...easy, ...medium, ...hard, ...tricky];

        // Return full WordEntry objects for display + DDS access
        return allWords
            .map(w => WordService.getWordInfo(w))
            .filter((e): e is WordEntry => e !== undefined);
    }

    /**
     * Log the result of a single word attempt.
     */
    logWordResult(
        word: string,
        apiResult: any,
        attemptDurationMs: number
    ): void {
        const wordInfo = WordService.getWordInfo(word);

        const result: ClinicalWordResult = {
            word,
            dds:    wordInfo?.dds    ?? 3.0,
            level:  wordInfo?.level  ?? 'Medium',
            isTricky: wordInfo?.isTricky ?? false,
            accuracy: apiResult?.word_accuracy ?? 0,
            phonemes: apiResult?.phonemes ?? [],
            transcriptionHeard: apiResult?.transcription_heard ?? '',
            attemptDurationMs,
            verdict: apiResult?.verdict ?? 'No data',
        };

        this.session.words.push(result);
    }

    /**
     * Finalise the session and compute aggregate report data.
     */
    finalise(): ClinicalSession {
        this.session.endedAt = new Date().toISOString();
        return this.session;
    }

    // ─── Report Computations ────────────────────────────────────────────────

    getAverageAccuracy(): number {
        if (this.session.words.length === 0) return 0;
        const sum = this.session.words.reduce((s, w) => s + w.accuracy, 0);
        return Math.round(sum / this.session.words.length);
    }

    getIntelligibilityIndex(): number {
        // Words where >60% accuracy = "intelligible"
        const intelligible = this.session.words.filter(w => w.accuracy >= 60).length;
        return Math.round((intelligible / this.session.words.length) * 100);
    }

    getClinicalFlag(): ClinicalFlag {
        const avg = this.getAverageAccuracy();
        if (avg >= 80) return 'On-Track';
        if (avg >= 55) return 'Monitor';
        return 'High-Risk';
    }

    /**
     * Finds phonemes that were consistently substituted.
     * Returns top-3 weakest phonemes with their average score.
     */
    getPhonemeErrorMap(): { phoneme: string; avgScore: number; count: number }[] {
        const phonemeMap: Record<string, { total: number; count: number }> = {};

        for (const wordResult of this.session.words) {
            for (const p of wordResult.phonemes) {
                if (!phonemeMap[p.p]) phonemeMap[p.p] = { total: 0, count: 0 };
                phonemeMap[p.p].total += p.score;
                phonemeMap[p.p].count += 1;
            }
        }

        return Object.entries(phonemeMap)
            .map(([phoneme, data]) => ({
                phoneme,
                avgScore: Math.round(data.total / data.count),
                count: data.count,
            }))
            .sort((a, b) => a.avgScore - b.avgScore)
            .slice(0, 5); // Top 5 weakest
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

    getSession(): ClinicalSession { return this.session; }
}
