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

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers (pure math, no React Native dependencies)
// ─────────────────────────────────────────────────────────────────────────────

/** Euclidean distance squared (avoids sqrt in inner loops) */
function dist2(ax: number, ay: number, bx: number, by: number): number {
    return (ax - bx) ** 2 + (ay - by) ** 2;
}

/** Euclidean distance */
function dist(ax: number, ay: number, bx: number, by: number): number {
    return Math.sqrt(dist2(ax, ay, bx, by));
}

/** Population mean of a number array */
function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Population variance */
function variance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return mean(arr.map(v => (v - m) ** 2));
}

/** Std deviation */
function stddev(arr: number[]): number {
    return Math.sqrt(variance(arr));
}

/**
 * Count local maxima/minima in a signal via first-difference sign changes.
 * direction = 1 → peaks,  direction = -1 → valleys
 */
function countExtrema(signal: number[], direction: 1 | -1): number {
    if (signal.length < 3) return 0;
    let count = 0;
    for (let i = 1; i < signal.length - 1; i++) {
        const prev = signal[i] - signal[i - 1];
        const next = signal[i + 1] - signal[i];
        if (direction === 1 && prev > 0 && next < 0) count++;
        if (direction === -1 && prev < 0 && next > 0) count++;
    }
    return count;
}

/**
 * Simple high-pass filter via first-order difference (removes DC / slow trend).
 * Returns residual = signal - moving average of window size w.
 */
function highPass(signal: number[], windowSize: number = 5): number[] {
    return signal.map((v, i) => {
        const start = Math.max(0, i - windowSize);
        const window = signal.slice(start, i + 1);
        return v - mean(window);
    });
}

/**
 * Dominant frequency estimate via zero-crossing rate:
 *   f ≈ (zero_crossings / 2) / duration_seconds
 */
function dominantFrequency(signal: number[], durationMs: number): number {
    if (durationMs <= 0 || signal.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < signal.length; i++) {
        if ((signal[i - 1] >= 0) !== (signal[i] >= 0)) crossings++;
    }
    const durationSec = durationMs / 1000;
    return (crossings / 2) / durationSec;
}

// ─────────────────────────────────────────────────────────────────────────────
// ShadowFeatureExtractor
// ─────────────────────────────────────────────────────────────────────────────

export class ShadowFeatureExtractor {
    private rawPoints: RawTouchPoint[] = [];
    private strokeSummaries: StrokeFeatureSummary[] = [];
    private currentStrokePoints: RawTouchPoint[] = [];
    private strokeStartTime: number = 0;
    private letterPath: LetterPath | null = null;
    private idealPath: IdealPathData | null = null;
    private allStrokesHistory: RawTouchPoint[][] = [];

    // Tolerance for "on-track" spatial deviation (SVG units)
    private readonly SPATIAL_TOLERANCE = 50;

    public startSession(config?: { letterPath: LetterPath; idealPath: IdealPathData }) {
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
        this.allStrokesHistory.push([...this.currentStrokePoints]);
        const summary = this.computeStrokeFeatures(strokeId, this.currentStrokePoints);
        this.strokeSummaries.push(summary);
        this.currentStrokePoints = [];
    }

    // ─── PUBLIC: Generate Full Session Summary ────────────────────────────────

    public async generateSessionSummary(
        sessionId: string,
        letter: string,
        context: SessionFeatureSummary['context']
    ): Promise<SessionFeatureSummary> {

        // ── 1. Session Timing ──────────────────────────────────────────────────
        const startTime = this.rawPoints.length > 0 ? this.rawPoints[0].timestamp : Date.now();
        const endTime   = this.rawPoints.length > 0 ? this.rawPoints[this.rawPoints.length - 1].timestamp : Date.now();
        const completionTime = endTime - startTime;

        const timeInMotion = this.strokeSummaries.reduce((s, st) => s + st.strokeDuration, 0);
        const timePaused   = this.strokeSummaries.reduce((s, st) => s + st.pauseCount * st.avgPauseDuration, 0);
        const fluencyRatio = (timeInMotion + timePaused) > 0
            ? timeInMotion / (timeInMotion + timePaused)
            : 1;

        // ── 2. Aggregate Kinematics ───────────────────────────────────────────
        const allAvgVels   = this.strokeSummaries.map(s => s.avgVelocity);
        const allPeakVels  = this.strokeSummaries.map(s => s.maxAcceleration); // use per-stroke peak
        const allCoVs      = this.strokeSummaries.map(s => {
            // Re-derive CoV from stroke (already stored on summary)
            return s.avgVelocity > 0 ? s.normalizedJerk / s.avgVelocity : 0;
        });
        const allVelPeaks  = this.strokeSummaries.reduce((s, st) => s + st.velocityPeaks, 0);
        const allVelValls  = this.strokeSummaries.reduce((s, st) => s + st.velocityValleys, 0);

        // Compute velocity signal across ALL points for session-level aggregation
        const sessionVelocities = this.computeVelocitySignal(this.rawPoints);
        const avgVelocity  = mean(sessionVelocities);
        const peakVelocity = sessionVelocities.length > 0 ? Math.max(...sessionVelocities) : 0;
        const velocityCoV  = avgVelocity > 0 ? stddev(sessionVelocities) / avgVelocity : 0;

        // ── 3. Aggregate Dynamics (Jerk, Acceleration) ────────────────────────
        const accSignal   = this.computeAccelerationSignal(sessionVelocities, this.rawPoints);
        const jerkSignal  = this.computeJerkSignal(accSignal, this.rawPoints);

        const avgJerk         = mean(jerkSignal.map(Math.abs));
        const normalizedJerk  = avgJerk;
        const maxAcceleration = accSignal.length > 0 ? Math.max(...accSignal.map(Math.abs)) : 0;
        const posAcc = accSignal.filter(a => a > 0);
        const negAcc = accSignal.filter(a => a < 0).map(Math.abs);
        const accelerationSymmetry = negAcc.length > 0 && mean(negAcc) > 0
            ? mean(posAcc) / mean(negAcc)
            : 1;

        const ballisticCount = this.strokeSummaries.filter(s => s.isBallistic).length;

        // ── 4. Aggregate Tremor ───────────────────────────────────────────────
        const tremorPower     = mean(this.strokeSummaries.map(s => s.tremor.tremor_power));
        const tremorAmplitude = mean(this.strokeSummaries.map(s => s.tremor.tremor_amplitude));
        const tremorFrequency = mean(this.strokeSummaries.map(s => s.tremor.tremor_frequency));

        // ── 5. Aggregate Pressure ─────────────────────────────────────────────
        const allPressures = this.rawPoints.map(p => p.pressure);
        const avgPressure     = mean(allPressures);
        const pressureVariance = variance(allPressures);

        // ── 6. Spatial / Shape Analysis ───────────────────────────────────────
        const { aspectRatio, compactnessScore, closureSuccessRate, spatialDrift, offTrackEvents, pathVariance } =
            this.computeShapeFeatures();

        // ── 7. Sequencing ─────────────────────────────────────────────────────
        const strokeCountActual   = this.strokeSummaries.length;
        const strokeCountExpected = this.letterPath?.expectedStrokeCount || 0;
        const extraStrokes        = Math.max(0, strokeCountActual - strokeCountExpected);
        const liftOffCount        = strokeCountActual;

        // Inter-stroke latency: gap between last point of stroke i and first point of stroke i+1
        let avgInterStrokeLatency = 0;
        if (this.allStrokesHistory.length > 1) {
            const latencies: number[] = [];
            for (let i = 0; i < this.allStrokesHistory.length - 1; i++) {
                const end   = this.allStrokesHistory[i][this.allStrokesHistory[i].length - 1].timestamp;
                const start = this.allStrokesHistory[i + 1][0].timestamp;
                latencies.push(start - end);
            }
            avgInterStrokeLatency = mean(latencies);
        }

        // ── 8. ML Analysis ────────────────────────────────────────────────────
        let mlFeatures: MLFeatures = {
            predictedChar: '?',
            expectedChar: letter,
            isCorrect: false,
            confidence: 0,
            topPredictions: [],
            reversalDetected: false,
            analysisTimestamp: new Date().toISOString(),
        };

        try {
            const simpleStrokes = this.allStrokesHistory.map(stroke =>
                stroke.map(p => ({ x: p.x, y: p.y }))
            );
            const rasterized = rasterizeStrokes(simpleStrokes, 320, 320);
            const predictions = await modelService.predict(rasterized);

            if (predictions) {
                const maxIdx    = predictions.indexOf(Math.max(...predictions));
                const conf      = predictions[maxIdx];
                const predicted = getCharFromIndex(maxIdx);
                const isCorrect = predicted.toLowerCase() === letter.toLowerCase();

                // ── Reversal Detection ───────────────────────────────────────
                const { reversalDetected, reversalType, reversalConfidence } =
                    await this.detectReversals(rasterized, letter, predictions);

                mlFeatures = {
                    predictedChar: predicted,
                    expectedChar: letter,
                    isCorrect,
                    confidence: conf || 0,
                    topPredictions: predictions
                        .map((p, i) => ({ char: getCharFromIndex(i), score: p }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3),
                    reversalDetected,
                    reversalType,
                    reversalConfidence,
                    analysisTimestamp: new Date().toISOString(),
                };
            }
        } catch (error) {
            console.error('[ShadowFeatureExtractor] ML analysis failed:', error);
        }

        // ── 9. Construct Full Clinical Summary ────────────────────────────────
        const summary: SessionFeatureSummary = {
            sessionId,
            letter,
            timestamp: new Date().toISOString(),

            overview: {
                isCorrect: mlFeatures.isCorrect,
                completionTime,
                score: mlFeatures.confidence * 100,
                status: 'completed',
            },

            clinical: {
                dataQuality: {
                    samplingRate: this.estimateSamplingRate(),
                    completenessScore: 1.0,
                    totalSamples: this.rawPoints.length,
                    pointsDropped: 0,
                },
                kinematics: {
                    avgVelocity,
                    peakVelocity,
                    velocityCoV,
                    velocityPeaks: allVelPeaks,
                    velocityValleys: allVelValls,
                    timeInMotion,
                    timePaused,
                    fluencyRatio,
                },
                dynamics: {
                    maxAcceleration,
                    avgJerk,
                    normalizedJerk,
                    accelerationSymmetry,
                    ballisticMovements: ballisticCount,
                },
                graphomotor: {
                    tremorFrequency,
                    tremorAmplitude,
                    tremorPower,
                    avgPressure,
                    pressureVariance,
                    strokeWidthMean: 0,
                    strokeWidthVariance: 0,
                },
                shape: {
                    aspect_ratio: aspectRatio,
                    compactness_score: compactnessScore,
                    closure_success_rate: closureSuccessRate,
                    pathVariance,
                    spatialDrift,
                    offTrackEvents,
                    closureSuccess: closureSuccessRate > 0.8,
                },
                sequencing: {
                    strokeCountActual,
                    strokeCountExpected,
                    extraStrokes,
                    missingStrokes: Math.max(0, strokeCountExpected - strokeCountActual),
                    strokeSequenceCorrect: extraStrokes === 0,
                    liftOffCount,
                    avgInterStrokeLatency,
                },
                orientation: {
                    micropauseCount: this.strokeSummaries.reduce((s, st) => s + st.pauseCount, 0),
                    reversalDetected: mlFeatures.reversalDetected,
                    mirrorConfusionScore: mlFeatures.reversalDetected ? (mlFeatures.reversalConfidence ?? 0) : 0,
                    orientationConsistency: mlFeatures.reversalDetected ? 0.0 : 1.0,
                },
            },

            ml: mlFeatures,
            context,
        };

        return summary;
    }

    // ─── PRIVATE: Per-Stroke Feature Computation ─────────────────────────────

    private computeStrokeFeatures(strokeId: number, points: RawTouchPoint[]): StrokeFeatureSummary {
        if (points.length < 2) {
            return this.emptyStrokeSummary(strokeId);
        }

        const n = points.length;
        const strokeDuration = points[n - 1].timestamp - points[0].timestamp;

        // ── Velocity Signal ──────────────────────────────────────────────────
        const velocities: number[] = [];
        for (let i = 1; i < n; i++) {
            const dt = points[i].timestamp - points[i - 1].timestamp;
            if (dt <= 0) { velocities.push(0); continue; }
            const d = dist(points[i].x, points[i].y, points[i-1].x, points[i-1].y);
            velocities.push(d / dt); // px/ms
        }

        const avgVelocity  = mean(velocities);
        const velocityCoV  = avgVelocity > 0 ? stddev(velocities) / avgVelocity : 0;
        const velocityPeaks  = countExtrema(velocities, 1);
        const velocityValleys = countExtrema(velocities, -1);

        // ── Acceleration Signal ──────────────────────────────────────────────
        const accelerations: number[] = [];
        for (let i = 1; i < velocities.length; i++) {
            const dt = points[i + 1].timestamp - points[i].timestamp;
            if (dt <= 0) { accelerations.push(0); continue; }
            accelerations.push((velocities[i] - velocities[i - 1]) / dt);
        }
        const maxAcceleration = accelerations.length > 0
            ? Math.max(...accelerations.map(Math.abs))
            : 0;

        // ── Jerk Signal ──────────────────────────────────────────────────────
        const jerks: number[] = [];
        for (let i = 1; i < accelerations.length; i++) {
            const dt = points[i + 1].timestamp - points[i].timestamp;
            if (dt <= 0) { jerks.push(0); continue; }
            jerks.push(Math.abs((accelerations[i] - accelerations[i - 1]) / dt));
        }
        const normalizedJerk = mean(jerks);

        // ── Ballistic Classification ─────────────────────────────────────────
        // A ballistic stroke has exactly 1 velocity peak and 0 valleys (smooth bell curve)
        const isBallistic = velocityPeaks === 1 && velocityValleys === 0;
        const ballisticScore = isBallistic ? 1.0 : 0.0;

        // ── Pause Detection ──────────────────────────────────────────────────
        const PAUSE_THRESHOLD_MS = 200;
        let pauseCount = 0;
        const pauseDurations: number[] = [];
        for (let i = 1; i < n; i++) {
            const dt = points[i].timestamp - points[i - 1].timestamp;
            if (dt > PAUSE_THRESHOLD_MS) {
                pauseCount++;
                pauseDurations.push(dt);
            }
        }
        const avgPauseDuration = mean(pauseDurations);

        // ── Pressure ─────────────────────────────────────────────────────────
        const pressures = points.map(p => p.pressure);
        const avgPressure     = mean(pressures);

        // ── Tremor Analysis ───────────────────────────────────────────────────
        // High-pass filter the velocity signal → residual = tremor component
        const tremorSignal    = highPass(velocities, 5);
        const tremorPower     = variance(tremorSignal);
        const tremorAmplitude = stddev(tremorSignal);
        const tremorFrequency = dominantFrequency(tremorSignal, strokeDuration);

        // ── Spatial Deviation (vs Ideal Path) ────────────────────────────────
        const spatialStats = this.computeSpatialDeviation(points, strokeId);

        // ── Baseline Deviation ────────────────────────────────────────────────
        // Vertical deviation of last point from first point (should be 0 for many letters)
        const baselineDeviation = Math.abs(points[n - 1].y - points[0].y);

        // ── Convex Hull Area (Shoelace formula) ───────────────────────────────
        const convexityHullArea = this.convexHullArea(points);

        // ── Direction Correct (start → end of expected stroke) ─────────────
        const isDirectionCorrect = this.checkStrokeDirection(points, strokeId);

        return {
            strokeId,
            initiationDelay: points[0].timestamp - this.strokeStartTime,
            strokeDuration,
            pauseCount,
            avgPauseDuration,
            avgVelocity,
            avgPressure,
            maxAcceleration,
            normalizedJerk,
            velocityPeaks,
            velocityValleys,
            samplingRate: strokeDuration > 0 ? (n / (strokeDuration / 1000)) : 60,
            isBallistic,
            ballisticScore,
            baselineDeviation,
            convexityHullArea,
            reversalsCount: velocityValleys,
            isDirectionCorrect,
            tremor: {
                tremor_power: tremorPower,
                tremor_amplitude: tremorAmplitude,
                tremor_frequency: tremorFrequency,
            },
            spatial: spatialStats,
        };
    }

    // ─── PRIVATE: Spatial Deviation Calculation ───────────────────────────────

    private computeSpatialDeviation(points: RawTouchPoint[], strokeId: number): StrokeFeatureSummary['spatial'] {
        if (!this.idealPath || this.idealPath.points.length === 0) {
            return {
                mean_path_deviation: 0, max_path_deviation: 0,
                deviation_std: 0, off_track_events: [],
                off_track_duration_total: 0, off_track_recovery_times: [],
                spatial_drift: 0, deviation_profile: [],
            };
        }

        // Identify ideal points for this stroke
        const boundaries = this.idealPath.strokeBoundaries;
        let startIdx = 0;
        let endIdx   = this.idealPath.points.length;
        if (strokeId < boundaries.length - 1) {
            startIdx = boundaries[strokeId];
            endIdx   = boundaries[strokeId + 1];
        }
        const strokeIdealPts = this.idealPath.points.slice(startIdx, endIdx);
        if (strokeIdealPts.length === 0) {
            return {
                mean_path_deviation: 0, max_path_deviation: 0,
                deviation_std: 0, off_track_events: [],
                off_track_duration_total: 0, off_track_recovery_times: [],
                spatial_drift: 0, deviation_profile: [],
            };
        }

        // Per-point nearest-ideal-point distance
        const deviationProfile: number[] = [];
        for (const tp of points) {
            let minD = Infinity;
            for (const ip of strokeIdealPts) {
                const d = dist(tp.x, tp.y, ip.x, ip.y);
                if (d < minD) minD = d;
            }
            deviationProfile.push(minD);
        }

        const mean_path_deviation = mean(deviationProfile);
        const max_path_deviation  = Math.max(...deviationProfile);
        const deviation_std       = stddev(deviationProfile);

        // Off-track events: contiguous runs where deviation > tolerance
        const off_track_events: Array<{ startTime: number; endTime: number }> = [];
        let inOffTrack = false;
        let offStart   = 0;
        for (let i = 0; i < points.length; i++) {
            if (deviationProfile[i] > this.SPATIAL_TOLERANCE && !inOffTrack) {
                inOffTrack = true;
                offStart   = points[i].timestamp;
            } else if (deviationProfile[i] <= this.SPATIAL_TOLERANCE && inOffTrack) {
                inOffTrack = false;
                off_track_events.push({ startTime: offStart, endTime: points[i].timestamp });
            }
        }
        if (inOffTrack) off_track_events.push({ startTime: offStart, endTime: points[points.length - 1].timestamp });

        const off_track_duration_total = off_track_events.reduce(
            (s, e) => s + (e.endTime - e.startTime), 0
        );
        const off_track_recovery_times = off_track_events.map(e => e.endTime - e.startTime);

        // Spatial drift: displacement from centroid of user path to centroid of ideal stroke
        const userCx  = mean(points.map(p => p.x));
        const userCy  = mean(points.map(p => p.y));
        const idealCx = mean(strokeIdealPts.map(p => p.x));
        const idealCy = mean(strokeIdealPts.map(p => p.y));
        const spatial_drift = dist(userCx, userCy, idealCx, idealCy);

        return {
            mean_path_deviation,
            max_path_deviation,
            deviation_std,
            off_track_events,
            off_track_duration_total,
            off_track_recovery_times,
            spatial_drift,
            deviation_profile: deviationProfile,
        };
    }

    // ─── PRIVATE: Session-Level Shape Analysis ────────────────────────────────

    private computeShapeFeatures(): {
        aspectRatio: number;
        compactnessScore: number;
        closureSuccessRate: number;
        spatialDrift: number;
        offTrackEvents: number;
        pathVariance: number;
    } {
        if (this.rawPoints.length < 2) {
            return { aspectRatio: 1, compactnessScore: 0, closureSuccessRate: 1, spatialDrift: 0, offTrackEvents: 0, pathVariance: 0 };
        }

        const xs = this.rawPoints.map(p => p.x);
        const ys = this.rawPoints.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const width  = maxX - minX || 1;
        const height = maxY - minY || 1;

        const aspectRatio = width / height;

        // Total path length
        let totalPathLength = 0;
        for (let i = 1; i < this.rawPoints.length; i++) {
            totalPathLength += dist(
                this.rawPoints[i].x, this.rawPoints[i].y,
                this.rawPoints[i-1].x, this.rawPoints[i-1].y
            );
        }
        // Compactness: path length relative to perimeter of bounding box (normalized)
        const bbPerimeter = 2 * (width + height) || 1;
        const compactnessScore = Math.min(1, bbPerimeter / (totalPathLength || 1));

        // Closure success: for letters requiring closure (O, C, G etc.),
        // check if the last point is close to the first point of the letter
        const first = this.rawPoints[0];
        const last  = this.rawPoints[this.rawPoints.length - 1];
        const closureDistance = dist(last.x, last.y, first.x, first.y);
        const closureThreshold = Math.max(width, height) * 0.25;
        const closureSuccessRate = closureDistance < closureThreshold ? 1.0 : 0.0;

        // Aggregate off-track events count from all strokes
        const offTrackEvents = this.strokeSummaries.reduce(
            (s, st) => s + st.spatial.off_track_events.length, 0
        );

        // Path variance: variance of spatial deviations across all strokes
        const allDeviations = this.strokeSummaries.flatMap(st => st.spatial.deviation_profile);
        const pathVariance = variance(allDeviations);

        // Spatial drift: mean over all strokes
        const spatialDrift = mean(this.strokeSummaries.map(st => st.spatial.spatial_drift));

        return { aspectRatio, compactnessScore, closureSuccessRate, spatialDrift, offTrackEvents, pathVariance };
    }

    // ─── PRIVATE: Reversal Detection ─────────────────────────────────────────

    private async detectReversals(
        rasterized: Float32Array,
        letter: string,
        originalPredictions: number[]
    ): Promise<{ reversalDetected: boolean; reversalType?: MLFeatures['reversalType']; reversalConfidence?: number }> {
        const SIZE = 28;

        const flip = (img: Float32Array, mode: 'h' | 'v' | 'r'): Float32Array => {
            const out = new Float32Array(SIZE * SIZE);
            for (let y = 0; y < SIZE; y++) {
                for (let x = 0; x < SIZE; x++) {
                    const srcX = mode === 'h' ? SIZE - 1 - x : (mode === 'r' ? SIZE - 1 - x : x);
                    const srcY = mode === 'v' ? SIZE - 1 - y : (mode === 'r' ? SIZE - 1 - y : y);
                    out[y * SIZE + x] = img[srcY * SIZE + srcX];
                }
            }
            return out;
        };

        const REVERSAL_CONFIDENCE_THRESHOLD = 0.4;
        const expectedIdx = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

        const transforms: Array<{ mode: 'h'|'v'|'r'; type: MLFeatures['reversalType'] }> = [
            { mode: 'h', type: 'horizontal_flip' },
            { mode: 'v', type: 'vertical_flip' },
            { mode: 'r', type: 'rotation_180' },
        ];

        for (const { mode, type } of transforms) {
            try {
                const flipped = flip(rasterized, mode);
                const preds   = await modelService.predict(flipped);
                if (preds) {
                    const flippedConfForExpected = preds[expectedIdx] ?? 0;
                    // If the *flipped* image is recognized as the expected char
                    // → the child drew the letter mirrored/rotated
                    if (flippedConfForExpected > REVERSAL_CONFIDENCE_THRESHOLD) {
                        return {
                            reversalDetected: true,
                            reversalType: type,
                            reversalConfidence: flippedConfForExpected,
                        };
                    }
                }
            } catch {
                // Silently skip if inference fails for a transform
            }
        }

        return { reversalDetected: false };
    }

    // ─── PRIVATE: Session-Level Signal Helpers ────────────────────────────────

    private computeVelocitySignal(points: RawTouchPoint[]): number[] {
        const velocities: number[] = [];
        for (let i = 1; i < points.length; i++) {
            const dt = points[i].timestamp - points[i - 1].timestamp;
            if (dt <= 0) { velocities.push(0); continue; }
            velocities.push(
                dist(points[i].x, points[i].y, points[i-1].x, points[i-1].y) / dt
            );
        }
        return velocities;
    }

    private computeAccelerationSignal(velocities: number[], points: RawTouchPoint[]): number[] {
        const acc: number[] = [];
        for (let i = 1; i < velocities.length; i++) {
            const dt = points[i + 1] ? points[i + 1].timestamp - points[i].timestamp : 16;
            acc.push(dt > 0 ? (velocities[i] - velocities[i - 1]) / dt : 0);
        }
        return acc;
    }

    private computeJerkSignal(accelerations: number[], points: RawTouchPoint[]): number[] {
        const jerk: number[] = [];
        for (let i = 1; i < accelerations.length; i++) {
            const dt = points[i + 1] ? points[i + 1].timestamp - points[i].timestamp : 16;
            jerk.push(dt > 0 ? (accelerations[i] - accelerations[i - 1]) / dt : 0);
        }
        return jerk;
    }

    // ─── PRIVATE: Geometry Helpers ────────────────────────────────────────────

    /** Convex hull area via Shoelace formula on raw points (approximate: not true convex hull). */
    private convexHullArea(points: RawTouchPoint[]): number {
        const n = points.length;
        if (n < 3) return 0;
        let area = 0;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    /** Checks that the user traversed the stroke in the expected direction (start→end). */
    private checkStrokeDirection(points: RawTouchPoint[], strokeId: number): boolean {
        if (!this.idealPath || this.idealPath.points.length === 0) return true;
        const boundaries = this.idealPath.strokeBoundaries;
        if (strokeId >= boundaries.length - 1) return true;

        const idealStart = this.idealPath.points[boundaries[strokeId]];
        const idealEnd   = this.idealPath.points[boundaries[strokeId + 1] - 1];
        if (!idealStart || !idealEnd) return true;

        const userStart = points[0];
        const userEnd   = points[points.length - 1];

        // User start should be closer to ideal start than user end
        const startToIdealStart = dist(userStart.x, userStart.y, idealStart.x, idealStart.y);
        const endToIdealStart   = dist(userEnd.x, userEnd.y, idealStart.x, idealStart.y);

        return startToIdealStart <= endToIdealStart;
    }

    /** Sampling rate estimate in Hz */
    private estimateSamplingRate(): number {
        if (this.rawPoints.length < 2) return 60;
        const duration = this.rawPoints[this.rawPoints.length - 1].timestamp - this.rawPoints[0].timestamp;
        if (duration <= 0) return 60;
        return (this.rawPoints.length / (duration / 1000));
    }

    /** Returns an empty StrokeFeatureSummary (used when a stroke has < 2 points) */
    private emptyStrokeSummary(strokeId: number): StrokeFeatureSummary {
        return {
            strokeId,
            initiationDelay: 0, strokeDuration: 0,
            pauseCount: 0, avgPauseDuration: 0,
            avgVelocity: 0, avgPressure: 1,
            maxAcceleration: 0, normalizedJerk: 0,
            velocityPeaks: 0, velocityValleys: 0,
            samplingRate: 60, isBallistic: false, ballisticScore: 0,
            baselineDeviation: 0, convexityHullArea: 0,
            reversalsCount: 0, isDirectionCorrect: true,
            tremor: { tremor_power: 0, tremor_amplitude: 0, tremor_frequency: 0 },
            spatial: {
                mean_path_deviation: 0, max_path_deviation: 0,
                deviation_std: 0, off_track_events: [],
                off_track_duration_total: 0, off_track_recovery_times: [],
                spatial_drift: 0, deviation_profile: [],
            },
        };
    }
}
