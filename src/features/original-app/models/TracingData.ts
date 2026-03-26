// Basic Geometric Types
export interface Point {
    x: number;
    y: number;
}

export interface BezierCurve {
    start: Point;
    control1: Point;
    control2: Point;
    end: Point;
}

export interface PathSegment {
    type: 'line' | 'bezier' | 'arc';
    start: Point;
    end: Point;
    control1?: Point;
    control2?: Point;
    radius?: number;
}

export interface LetterPath {
    letter: string;
    strokes: PathSegment[][];
    expectedStrokeCount: number;
    width: number;
    height: number;
    baseline: number;
    difficulty: 'easy' | 'medium' | 'hard';
    confusionPairs: string[];
}

export interface GuidelinePoint {
    x: number;
    y: number;
    index: number;
    normalX: number;
    normalY: number;
}

export interface IdealPathData {
    points: GuidelinePoint[];
    totalLength: number;
    strokeBoundaries: number[];
}

export interface RawTouchPoint {
    x: number;
    y: number;
    timestamp: number;
    pressure: number;
}

export interface ValidationResult {
    isValid: boolean;
    feedbackType: 'correct' | 'wrong_direction' | 'wrong_order' | 'too_far' | 'none';
    snapToPoint?: Point;
}

export interface SessionFeatureSummary {
    sessionId: string;
    letter: string;
    timestamp: string;
    overview: {
        isCorrect: boolean;
        completionTime: number;
        score: number;
        status: 'completed' | 'abandoned' | 'timeout';
    };
    clinical: any;
    ml: any;
    context: any;
}

export interface MLFeatures {
    predictedChar: string;
    expectedChar: string;
    isCorrect: boolean;
    confidence: number;
    topPredictions: Array<{ char: string; score: number }>;
    reversalDetected: boolean;
    reversalType?: 'horizontal_flip' | 'vertical_flip' | 'rotation_180';
    reversalConfidence?: number;
    analysisTimestamp: string;
}

export interface StrokeFeatureSummary {
    strokeId: number;
    initiationDelay: number;
    strokeDuration: number;
    pauseCount: number;
    avgPauseDuration: number;
    avgVelocity: number;
    avgPressure: number;
    maxAcceleration: number;
    normalizedJerk: number;
    velocityPeaks: number;
    velocityValleys: number;
    samplingRate: number;
    isBallistic: boolean;
    ballisticScore: number;
    baselineDeviation: number;
    convexityHullArea: number;
    reversalsCount: number;
    isDirectionCorrect: boolean;

    tremor: {
        tremor_power: number;
        tremor_amplitude: number;
        tremor_frequency: number;
    };
    spatial: {
        mean_path_deviation: number;
        max_path_deviation: number;
        deviation_std: number;
        off_track_events: any[];
        off_track_duration_total: number;
        off_track_recovery_times: number[];
        spatial_drift: number;
        deviation_profile: number[];
    };
}
