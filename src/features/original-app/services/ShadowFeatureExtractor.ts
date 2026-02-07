import {
    RawTouchPoint,
    SessionFeatureSummary,
    StrokeFeatureSummary,
    IdealPathData,
    LetterPath,
    MLFeatures
} from '../models/TracingData';
import { modelService } from './ModelService';
import { rasterizeStrokes, getCharFromIndex } from '../utils/WritingUtils';

export class ShadowFeatureExtractor {
    private rawPoints: RawTouchPoint[] = [];
    private strokeSummaries: StrokeFeatureSummary[] = [];
    private currentStrokePoints: RawTouchPoint[] = [];
    private strokeStartTime: number = 0;
    private letterPath: LetterPath | null = null;
    private idealPath: IdealPathData | null = null;
    // History for global analysis
    private allStrokesHistory: RawTouchPoint[][] = [];

    public startSession(config?: { letterPath: LetterPath, idealPath: IdealPathData }) {
        this.rawPoints = [];
        this.strokeSummaries = [];
        this.currentStrokePoints = [];
        this.allStrokesHistory = [];
        if (config) {
            this.letterPath = config.letterPath;
            this.idealPath = config.idealPath;
        }
    }

    public addPoint(point: RawTouchPoint) {
        this.rawPoints.push(point);
        this.currentStrokePoints.push(point);
        if (this.currentStrokePoints.length === 1) {
            this.strokeStartTime = point.timestamp;
        }
    }

    public endStroke(strokeId: number) {
        if (this.currentStrokePoints.length < 2) return;

        // Save stroke for global history
        this.allStrokesHistory.push([...this.currentStrokePoints]);

        const summary = this.computeStrokeFeatures(strokeId, this.currentStrokePoints);
        this.strokeSummaries.push(summary);
        this.currentStrokePoints = [];
    }

    public async generateSessionSummary(
        sessionId: string,
        letter: string,
        context: SessionFeatureSummary['context']
    ): Promise<SessionFeatureSummary> {

        // 1. Basic Aggregation
        const totalPauses = this.strokeSummaries.reduce((acc, s) => acc + s.pauseCount, 0);
        const totalDuration = this.strokeSummaries.reduce((acc, s) => acc + s.strokeDuration, 0) +
            this.strokeSummaries.reduce((acc, s) => acc + (s.pauseCount * s.avgPauseDuration), 0);
        const startTime = this.rawPoints.length > 0 ? this.rawPoints[0].timestamp : Date.now();
        const endTime = this.rawPoints.length > 0 ? this.rawPoints[this.rawPoints.length - 1].timestamp : Date.now();
        const completionTime = endTime - startTime;

        // 2. ML Analysis using ModelService
        let mlFeatures: MLFeatures = {
            predictedChar: '?',
            expectedChar: letter,
            isCorrect: false,
            confidence: 0,
            topPredictions: [],
            reversalDetected: false,
            analysisTimestamp: new Date().toISOString()
        };

        try {
            // Convert RawTouchPoint[][] to Stroke[] ({x,y}[])
            const simpleStrokes = this.allStrokesHistory.map(stroke =>
                stroke.map(p => ({ x: p.x, y: p.y }))
            );

            // Rasterize (assuming canvas size ~300-400, doesn't strictly matter as rasterizer centers it)
            // We use a dummy canvas size, rasterizer handles bounds.
            const rasterized = rasterizeStrokes(simpleStrokes, 320, 320);

            // Predict
            const predictions = await modelService.predict(rasterized);

            if (predictions) {
                const maxProbIndex = predictions.indexOf(Math.max(...predictions));
                const conf = predictions[maxProbIndex];
                const predictedChar = getCharFromIndex(maxProbIndex);

                // Basic "Correctness" check (case insensitive for now?)
                const isCorrect = predictedChar.toLowerCase() === letter.toLowerCase();

                mlFeatures = {
                    predictedChar,
                    expectedChar: letter,
                    isCorrect,
                    confidence: conf || 0,
                    topPredictions: predictions.map((p, i) => ({ char: getCharFromIndex(i), score: p }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3), // Top 3
                    reversalDetected: false, // Placeholder
                    analysisTimestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('[ShadowFeatureExtractor] ML analysis failed:', error);
        }

        // 5. Construct Clinical Summary
        const summary: SessionFeatureSummary = {
            sessionId,
            letter,
            timestamp: new Date().toISOString(),

            overview: {
                isCorrect: mlFeatures.isCorrect,
                completionTime,
                score: mlFeatures.confidence * 100,
                status: 'completed'
            },

            clinical: {
                dataQuality: {
                    samplingRate: 60, // Mock
                    completenessScore: 1.0,
                    totalSamples: this.rawPoints.length,
                    pointsDropped: 0
                },
                kinematics: {
                    avgVelocity: 0, // Mocked for now to save time
                    peakVelocity: 0,
                    velocityCoV: 0,
                    velocityPeaks: 0,
                    velocityValleys: 0,
                    timeInMotion: totalDuration,
                    timePaused: 0,
                    fluencyRatio: 1
                },
                dynamics: {
                    maxAcceleration: 0,
                    avgJerk: 0,
                    normalizedJerk: 0,
                    accelerationSymmetry: 1,
                    ballisticMovements: 0,
                },
                graphomotor: {
                    tremorFrequency: 0,
                    tremorAmplitude: 0,
                    tremorPower: 0,
                    avgPressure: 1,
                    pressureVariance: 0,
                    strokeWidthMean: 0,
                    strokeWidthVariance: 0
                },
                shape: {
                    closure_success_rate: 1,
                    pathVariance: 0,
                    spatialDrift: 0,
                    offTrackEvents: 0,
                    closureSuccess: true
                },
                sequencing: {
                    strokeCountActual: this.strokeSummaries.length,
                    strokeCountExpected: this.letterPath?.expectedStrokeCount || 0,
                    extraStrokes: Math.max(0, this.strokeSummaries.length - (this.letterPath?.expectedStrokeCount || 0)),
                    missingStrokes: 0,
                    strokeSequenceCorrect: true,
                    liftOffCount: this.strokeSummaries.length,
                    avgInterStrokeLatency: 0
                },
                orientation: {
                    micropauseCount: 0,
                    reversalDetected: mlFeatures.reversalDetected,
                    mirrorConfusionScore: 0,
                    orientationConsistency: 1.0,
                }
            },

            ml: mlFeatures,
            context
        };

        return summary;
    }

    private computeStrokeFeatures(strokeId: number, points: RawTouchPoint[]): StrokeFeatureSummary {
        // Simplified feature extraction
        return {
            strokeId,
            initiationDelay: 0,
            strokeDuration: 0,
            pauseCount: 0,
            avgPauseDuration: 0,
            avgVelocity: 0,
            avgPressure: 1,
            maxAcceleration: 0,
            normalizedJerk: 0,
            velocityPeaks: 0,
            velocityValleys: 0,
            samplingRate: 60,
            isBallistic: false,
            ballisticScore: 0,
            baselineDeviation: 0,
            convexityHullArea: 0,
            reversalsCount: 0,
            isDirectionCorrect: true,
            tremor: { tremor_power: 0, tremor_amplitude: 0, tremor_frequency: 0 },
            spatial: {
                mean_path_deviation: 0,
                max_path_deviation: 0,
                deviation_std: 0,
                off_track_events: [],
                off_track_duration_total: 0,
                off_track_recovery_times: [],
                spatial_drift: 0,
                deviation_profile: []
            }
        };
    }
}
