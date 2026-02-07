// src/utils/WordRecognizer.ts
// Closed-Vocabulary Recognizer (The "Duolingo" Logic)

import { AudioData, PronunciationResult } from '../types';
import { PhonemeAnalyzer } from './phonemeAnalyzer';
import { DistractorGenerator, ShadowWord } from './DistractorGenerator';
import { NativeRecognizer } from './NativeRecognizer';

export interface RecognitionResult {
    capturedWord: string;     // The word we think they said
    isPass: boolean;          // Did they say the TARGET?
    winningScore: number;     // The score of the captured word
    targetScore: number;      // The score of the target word
    distractorScores: { word: string, score: number }[];
    fullAnalysis: PronunciationResult; // Analysis of the TARGET (standard feedback)
    isNativeFallback?: boolean; // Did we use Google/Siri?
}

export class WordRecognizer {
    private analyzer: PhonemeAnalyzer;
    private distractorGen: DistractorGenerator;
    private nativeRecognizer: NativeRecognizer;

    constructor() {
        this.analyzer = new PhonemeAnalyzer();
        this.distractorGen = new DistractorGenerator();
        this.nativeRecognizer = new NativeRecognizer();
    }

    public async recognize(
        audio: AudioData,
        targetWord: string,
        targetPhonemes: string[]
    ): Promise<RecognitionResult> {
        console.log(`[Recognizer] Analyzing '${targetWord}' vs Shadows...`);

        // 0. Length Check (Garbage Filter)
        const expectedDuration = targetPhonemes.length * 0.12;
        const actualDuration = audio.duration;
        const durationRatio = actualDuration / expectedDuration;

        let lengthPenalty = 0;
        if (durationRatio > 2.5 || durationRatio < 0.4) {
            console.warn(`[Recognizer] Length mismatch. Exp: ${expectedDuration.toFixed(2)}s, Act: ${actualDuration.toFixed(2)}s`);
            lengthPenalty = 30;
        }

        let targetAnalysis;
        let distractorResults = [];
        let engineFailed = false;

        // 1. Try Custom Analysis (Might crash on Android due to WAV/AAC)
        try {
            // Analyze TARGET
            targetAnalysis = await this.analyzer.analyze(audio, targetWord, targetPhonemes);

            // Analyze Distractors
            const distractors = this.distractorGen.generateDistractors(targetWord, targetPhonemes);

            for (const d of distractors) {
                const res = await this.analyzer.analyze(audio, d.word, d.phonemes);
                let dScore = Math.max(0, res.overallScore - lengthPenalty);

                distractorResults.push({
                    word: d.word,
                    score: dScore,
                    phonemeString: d.phonemes.join('-')
                });
            }
        } catch (error) {
            console.warn("[Recognizer] Custom Engine Failed (likely audio format issue). Switching to Native Fallback.");
            engineFailed = true;
            // Mock empty analysis so we can proceed
            targetAnalysis = {
                overallScore: 0,
                phonemeScores: [],
                syllableScores: [],
                feedback: "Analysis failed, trying fallback...",
                emoji: "⚠️",
                encouragement: "Let's try that again."
            };
        }

        let targetScore = Math.max(0, (targetAnalysis?.overallScore || 0) - lengthPenalty);

        // 4. Find Winner (if engine worked)
        let winner = { word: targetWord, score: targetScore, isTarget: true };

        if (!engineFailed) {
            for (const d of distractorResults) {
                if (d.score > winner.score + 10) {
                    winner = { word: d.word, score: d.score, isTarget: false };
                }
            }
        }

        // 5. Rejection / Native Fallback
        // Trigger if:
        // A) Custom Engine Crashed (engineFailed)
        // B) Score is too low (Custom engine says "Unclear")
        let isNativeFallback = false;

        if (engineFailed || winner.score < 45) {
            console.log(`[Recognizer] Fallback triggered. Reason: ${engineFailed ? 'Engine Crash' : 'Low Score'}`);
            try {
                // Determine locale? Defaulting to US English
                const nativeResult = await this.nativeRecognizer.recognizeOnce('en-US');

                if (nativeResult) {
                    console.log(`[Recognizer] Native Result: "${nativeResult}"`);

                    winner.word = nativeResult;
                    winner.isTarget = nativeResult.toLowerCase().trim() === targetWord.toLowerCase().trim();

                    if (winner.isTarget) {
                        winner.score = 85; // Give a good score for native match
                        targetScore = 85;
                        // Mock a successful analysis for UI
                        targetAnalysis = {
                            overallScore: 85,
                            phonemeScores: targetPhonemes.map(p => ({ phoneme: p, score: 85, accuracy: 'good' as const })),
                            syllableScores: [],
                            feedback: "Good pronunciation using native recognition!",
                            emoji: "🎉",
                            encouragement: "Great job!"
                        };
                    } else {
                        winner.score = 0; // Wrong word
                    }

                    isNativeFallback = true;
                } else {
                    if (engineFailed) {
                        // If everything failed
                        winner.word = "??? (Error)";
                        winner.isTarget = false;
                    }
                }
            } catch (e) {
                console.error("Native Fallback Failed", e);
                winner.word = "??? (Error)";
            }
        }

        console.log(`[Recognizer] Final Result: ${winner.word} (${winner.score})`);

        return {
            capturedWord: winner.word,
            isPass: winner.isTarget && winner.score >= 50,
            winningScore: winner.score,
            targetScore: targetScore,
            distractorScores: distractorResults.map(d => ({ word: d.word, score: d.score })),
            fullAnalysis: targetAnalysis,
            isNativeFallback
        };
    }
}
