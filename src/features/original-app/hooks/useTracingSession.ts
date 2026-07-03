import { useState, useRef, useCallback } from 'react';
import { LetterPath, Point } from '../models/TracingData';
import { ShadowFeatureExtractor } from '../services/ShadowFeatureExtractor';
import StorageService from '../services/StorageService';
import { generateIdealPath } from '../utils/GeometryUtils';
import { saveTracingSessionReport } from '../../../services/TracingStatsService';
import { recordLetterTracing } from '../../learning-path/services/PathProgressBridge';

interface UseTracingSessionProps {
    letterPath: LetterPath;
    userId: string;
    userDemographics: any;
}

export const useTracingSession = ({
    letterPath,
    userId,
    userDemographics,
}: UseTracingSessionProps) => {
    const [isActive, setIsActive] = useState(false);
    const isActiveRef = useRef(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [activeStrokeIndex, setActiveStrokeIndex] = useState(0);

    // Refs for engines
    const shadowEngineRef = useRef<ShadowFeatureExtractor>(new ShadowFeatureExtractor());
    const idealPathRef = useRef<any>(null);
    // Independent counter for shadow engine — increments on every lift-off
    // This is separate from activeStrokeIndex (which tracks the visual guide)
    const engineStrokeCounterRef = useRef<number>(0);

    /**
     * Initialize session
     */
    const initializeSession = useCallback(() => {
        const idealPath = generateIdealPath(letterPath.strokes, 30);
        idealPathRef.current = idealPath;

        shadowEngineRef.current.startSession({ letterPath, idealPath });
        engineStrokeCounterRef.current = 0;

        setSessionStarted(true);
        setActiveStrokeIndex(0);
    }, [letterPath]);

    /**
     * Start tracing
     */
    const startTracing = useCallback((x?: number, y?: number) => {
        if (!sessionStarted) {
            initializeSession();
        }
        setIsActive(true);
        isActiveRef.current = true;
        
        // Push the very first touch point to prevent dropped headers
        if (x !== undefined && y !== undefined) {
             shadowEngineRef.current.addPoint({
                x, y,
                timestamp: Date.now(),
                pressure: 1.0
            });
        }
    }, [sessionStarted, initializeSession]);

    /**
     * Handle touch move — feeds raw data into the shadow engine for metric computation
     * NOTE: We do NOT block or validate here — the student can draw anything freely.
     * The engine collects all kinematics data regardless of path accuracy.
     */
    const handleTouchMove = useCallback((x: number, y: number, pressure: number) => {
        if (!isActiveRef.current) return;

        // 1. Shadow Engine: always record (free drawing, no blocking)
        shadowEngineRef.current.addPoint({
            x, y,
            timestamp: Date.now(),
            pressure: pressure ?? 1.0
        });
    }, []);

    /**
     * Handle touch END — called on every finger lift-off.
     * Always ends the current engine stroke so metrics are fully computed for that stroke.
     */
    const handleTouchEnd = useCallback(() => {
        if (!isActiveRef.current) return;
        // Close the current stroke in the shadow engine so all metric arrays are computed
        shadowEngineRef.current.endStroke(engineStrokeCounterRef.current);
        engineStrokeCounterRef.current += 1;
    }, []);

    /**
     * Advance to next stroke (visual guide only)
     * The shadow engine stroke was already ended in handleTouchEnd.
     */
    const advanceStroke = useCallback((strokeIndex?: number) => {
        setActiveStrokeIndex(prev => {
            const next = prev + 1;
            return next < letterPath.strokes.length ? next : prev;
        });
    }, [letterPath]);

    /**
     * Handle audio playback
     */
    const handleAudioPlay = useCallback(() => {
        // placeholder for audio event logging
    }, []);

    /**
     * End session and calculate analytics
     * All strokes are already finalized via handleTouchEnd; this just computes the session summary.
     */
    const endSession = useCallback(async (
        completionStatus: 'completed' | 'abandoned' | 'timed_out'
    ) => {
        setIsActive(false);

        const report = await shadowEngineRef.current.generateSessionSummary(
            `session_${Date.now()}`,
            letterPath.letter,
            {
                inputType: 'finger',
                screenSize: 'medium'
            }
        );

        if (completionStatus === 'completed') {
            try {
                await StorageService.saveAnalytics(report);
            } catch (error) {
                console.error('Failed to save analytics to StorageService:', error);
            }

            // Also persist to TracingStatsService so SessionSummary can read by sessionId
            const accuracy = Math.round(report.spatial_accuracy_deviation?.accuracy_score ?? report.overview?.score ?? 0);
            const durationSecs = Math.round(
                (report.time_based_performance?.total_session_duration ?? (report.overview?.completionTime ? report.overview.completionTime / 1000 : 30))
            );
            const actualStrokes = report.stroke_count_sequencing?.actual_stroke_count_used ?? 0;

            await saveTracingSessionReport({
                sessionId: report.sessionId,
                letter: letterPath.letter,
                timestamp: report.timestamp ?? new Date().toISOString(),
                accuracy,
                durationSecs,
                segmentCount: actualStrokes,
                segmentAccuracies: [],   // rich report uses kinematics, not per-segment %
                // Attach full report for buildFromRichAnalytics
                overview: report.overview,
                clinical: report.clinical,
                ml: report.ml,
            }).catch(err => console.warn('[useTracingSession] saveTracingSessionReport failed:', err));

            // Feed learning path bridge
            await recordLetterTracing(letterPath.letter, accuracy, durationSecs).catch(() => {});
        }

        return report;
    }, [letterPath]);

    /**
     * Reset session
     */
    const resetSession = useCallback(() => {
        setIsActive(false);
        isActiveRef.current = false;
        setSessionStarted(false);
        setActiveStrokeIndex(0);
        engineStrokeCounterRef.current = 0;
    }, []);

    return {
        isActive,
        sessionStarted,
        analytics: null,
        idealPath: idealPathRef.current || { points: [], strokeBoundaries: [] },
        activeStrokeIndex,
        startTracing,
        handleTouchMove,
        handleTouchEnd,
        advanceStroke,
        handleAudioPlay,
        endSession,
        resetSession,
        initializeSession,
    };
};
