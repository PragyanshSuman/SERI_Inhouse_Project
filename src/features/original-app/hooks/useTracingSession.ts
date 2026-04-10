import { useState, useRef, useCallback } from 'react';
import { LetterPath, Point } from '../models/TracingData';
import { ShadowFeatureExtractor } from '../services/ShadowFeatureExtractor';
import StorageService from '../services/StorageService';
import { generateIdealPath } from '../utils/GeometryUtils';

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

        try {
            if (completionStatus === 'completed') {
                await StorageService.saveAnalytics(report);
            }
        } catch (error) {
            console.error('Failed to save analytics:', error);
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
