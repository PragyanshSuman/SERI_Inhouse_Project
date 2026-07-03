// src/screens/TracingScreen.tsx

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
  Easing,
  Image,
  Platform,
  StatusBar,
  ScrollView,
  Text as RNText,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { AppText as Text } from '../../../components/AppText';
import {
  Svg,
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  Image as SvgImage,
  Text as SvgText,
} from 'react-native-svg';

import { ScalableLetters } from '../constants/ScalableLetterPaths';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useLanguage, useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';
import { recordLetterTracing } from '../../learning-path/services/PathProgressBridge';
import { saveTracingSessionReport } from '../../../services/TracingStatsService';

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_W = Math.min(420, SCREEN_W);
const CANVAS_H = Math.round(CANVAS_W * 1.5); // Extended Height boundary to accommodate pushing the letter far downward without clipping

const BOX_W = 360;
const BOX_H = 400;
const BOX_X = (CANVAS_W - BOX_W) / 2;
const BOX_Y = (CANVAS_H - BOX_H) / 2;

function nearestIndex(
  pts: { x: number; y: number; angle: number }[],
  p: { x: number; y: number }
) {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - p.x;
    const dy = pts[i].y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { index: best, dist2: bestD };
}

type SegmentState = 'locked' | 'active' | 'done';

function generateGeometricPointsFromSVG(svgString: string, samplesPerCurve: number = 60) {
    const points: Array<{x: number, y: number, angle: number}> = [];
    const regex = /M\s+([-\d.]+)\s+([-\d.]+)|C\s+([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+)|L\s+([-\d.]+)\s+([-\d.]+)/g;
    let match;
    let currentX = 0, currentY = 0;

    // Apply global math scale for standard 100x100 SVG dictionary traces
    const SVG_SCALE = 4.6;
    const tX = (CANVAS_W - (100 * SVG_SCALE)) / 2;
    const tY = ((CANVAS_H - (100 * SVG_SCALE)) / 2) - 50; // Shifted upwards (negative offset pulls origin up)

    let matchFound = false;

    while ((match = regex.exec(svgString)) !== null) {
        matchFound = true;
        if (match[1] !== undefined) {
            currentX = Number(match[1]);
            currentY = Number(match[2]);
            if (points.length === 0) {
                points.push({ x: (currentX * SVG_SCALE) + tX, y: (currentY * SVG_SCALE) + tY, angle: 0 });
            }
        } else if (match[3] !== undefined) {
            const cx1 = Number(match[3]), cy1 = Number(match[4]);
            const cx2 = Number(match[5]), cy2 = Number(match[6]);
            const x3 = Number(match[7]), cy3 = Number(match[8]);

            for (let i = 1; i <= samplesPerCurve; i++) {
                const t = i / samplesPerCurve;
                const x = Math.pow(1-t, 3)*currentX + 3*Math.pow(1-t, 2)*t*cx1 + 3*(1-t)*Math.pow(t, 2)*cx2 + Math.pow(t, 3)*x3;
                const y = Math.pow(1-t, 3)*currentY + 3*Math.pow(1-t, 2)*t*cy1 + 3*(1-t)*Math.pow(t, 2)*cy2 + Math.pow(t, 3)*cy3;
                points.push({ x: (x * SVG_SCALE) + tX, y: (y * SVG_SCALE) + tY, angle: 0 });
            }
            currentX = x3;
            currentY = cy3;
        } else if (match[9] !== undefined) {
            const x3 = Number(match[9]);
            const y3 = Number(match[10]);

            for (let i = 1; i <= samplesPerCurve; i++) {
                const t = i / samplesPerCurve;
                const x = currentX + (x3 - currentX) * t;
                const y = currentY + (y3 - currentY) * t;
                points.push({ x: (x * SVG_SCALE) + tX, y: (y * SVG_SCALE) + tY, angle: 0 });
            }
            currentX = x3;
            currentY = y3;
        }
    }

    // Safety fallback: if string failed all parsing, yield a phantom path to avoid crashes
    if (!matchFound || points.length === 0) {
        return [{ x: tX, y: tY, angle: 0 }, { x: tX + 1, y: tY + 1, angle: 0 }];
    }

    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i+1].x - points[i].x;
        const dy = points[i+1].y - points[i].y;
        points[i].angle = Math.atan2(dy, dx) * (180 / Math.PI);
    }
    
    if (points.length > 1) {
        points[points.length - 1].angle = points[points.length - 2].angle;
    } else if (points.length === 1) {
        points[0].angle = 0;
    }
    
    return points;
}

export default function ScalableGuidedTracingScreen() {
  const navigation = useNavigation();
  const { settings } = useSettings();
  const { language } = settings;
  const route = useRoute<RouteProp<RootStackParamList, 'Tracing'>>();
  const routeLetter = route.params?.letter ?? 'A';

  // Local letter state — lets picker override route param
  const [activeLetter, setActiveLetter] = useState(routeLetter);
  const [tourVisible, setTourVisible] = useState(false);

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Dynamically resolve rich, luminous holographic gradients for the trace geometry
  const pathGradientArray = settings.themeMode === 'dyslexicDark'
    ? ['#00F2FE', '#4FACFE', '#667EEA']
    : ['#FF6B6B', '#4ECDC4', '#FFE66D'];
  
  const theme = {
    colors: { pathGradient: pathGradientArray, guideDot: '#D1D5DB' },
    avatar: { idle: require('../assets/images/tiger-happy.png'), happy: require('../assets/images/tiger-happy.png'), surprised: require('../assets/images/tiger-surprised.png') },
    bee: { speedMsPerPoint: 3, pauseAtEndMs: 100 }
  };

  const svgStrings = ScalableLetters[activeLetter] || ScalableLetters['A'];
  
  const segments = useMemo(() => {
    return svgStrings.map(svg => {
      const pts = generateGeometricPointsFromSVG(svg, 60);
      
      // Specifically target requested letters to make them slightly narrower organically
      const narrowLetters = ['C', 'G', 'M', 'N', 'P'];
      const slightlyMoreNarrowLetters = ['O', 'Q', 'R'];
      const extraNarrowLetters = ['H', 'I'];
      
      let NARROW_FACTOR = 1.0;
      if (narrowLetters.includes(activeLetter)) {
          NARROW_FACTOR = 0.88;
      } else if (slightlyMoreNarrowLetters.includes(activeLetter)) {
          NARROW_FACTOR = 0.84;
      } else if (extraNarrowLetters.includes(activeLetter)) {
          NARROW_FACTOR = 0.78;
      }
      
      if (NARROW_FACTOR !== 1.0) {
          pts.forEach(p => {
              p.x = (CANVAS_W / 2) + (p.x - CANVAS_W / 2) * NARROW_FACTOR;
          });
      }

      // Mathematical offset shifts to perfectly center natively-lopsided letters
      const rightShiftLetters = ['C', 'P', 'R'];
      if (rightShiftLetters.includes(activeLetter)) {
          pts.forEach(p => p.x += 18);
      }

      let transformedD = "";
      if (pts.length > 0) {
          transformedD = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      }
      return {
        d: transformedD, 
        pts: pts,
        end: pts[pts.length - 1] || { x: 0, y: 0 }
      };
    });
  }, [svgStrings]);

  // Dynamically resolve gradient arrays purely mapped from user Dyslexia/Dark Mode configs
  const bgGradient = settings.themeMode === 'dyslexicDark' 
    ? ['#0F172A', '#1E1B4B']
    : ['#FFFAF0', '#E0E7FF'];

  const ambientHues = settings.themeMode === 'dyslexicDark' 
    ? ['rgba(139,92,246,0.3)', 'rgba(56,189,248,0.3)', 'rgba(236,72,153,0.3)', 'rgba(45,212,191,0.3)'] 
    : ['rgba(253,186,116,0.5)', 'rgba(192,132,252,0.5)', 'rgba(252,165,165,0.5)', 'rgba(94,234,212,0.5)'];

  const isDark = settings.themeMode === 'dyslexicDark';

  return (
    <ExpoLinearGradient colors={bgGradient as any} style={styles.bg}>
      <EmotionTracker moduleName="Letter Tracing" isActive={!tourVisible} />
      
      {/* Immersive Glassmorphism depth blobs */}
      <AmbientOrbs hues={ambientHues} />

      <View style={styles.overlay}>
        <BackButton 
          onPress={() => navigation.goBack()} 
          backgroundColor="transparent"
          color={DT.accent.indigo}
        />
        <InfoButton 
          onPress={() => setTourVisible(true)} 
          color={DT.accent.indigo}
        />
        
        <TraceLetter
          letter={activeLetter}
          theme={theme}
          segments={segments}
          onClose={() => navigation.goBack()}
          language={language}
        />

        {/* ── Letter Picker Strip ─────────────────────────────────────── */}
        <View style={[styles.pickerWrap, isDark && styles.pickerWrapDark]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerScroll}
          >
            {ALPHABET.map(l => {
              const isActive = l === activeLetter;
              return (
                <TouchableOpacity
                  key={l}
                  onPress={() => setActiveLetter(l)}
                  style={[
                    styles.letterPill,
                    isDark && styles.letterPillDark,
                    isActive && styles.letterPillActive,
                  ]}
                  activeOpacity={0.75}
                >
                  <RNText style={[
                    styles.letterPillText,
                    isDark && styles.letterPillTextDark,
                    isActive && styles.letterPillTextActive,
                  ]}>
                    {l}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FeatureTour
            visible={tourVisible}
            steps={[
              {
                title: getTranslation(language, 'tracing_tour_guide_title'),
                description: getTranslation(language, 'tracing_tour_guide_desc'),
                style: { top: 150, alignSelf: 'center' },
                arrowPosition: 'top',
              },
              {
                title: getTranslation(language, 'tracing_tour_progress_title'),
                description: getTranslation(language, 'tracing_tour_progress_desc'),
                style: { top: 70, alignSelf: 'center' },
                arrowPosition: 'top',
                arrowOffset: 0
              }
            ]}
            onComplete={() => { setTourVisible(false); }}
            onSkip={() => { setTourVisible(false); }}
        />
      </View>
    </ExpoLinearGradient>
  );
}

function AmbientOrbs({ hues }: { hues: string[] }) {
  // Generate 4 massive fluid ambient orbs drawing from the multi-colored light palette
  const orbs = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    initialX: (Math.random() * CANVAS_W) - (CANVAS_W * 0.2),
    initialY: (Math.random() * CANVAS_H) - 200,
    size: 250 + (Math.random() * 350), // Increased radius drastically for max blur overlapping
    hue: hues[i % hues.length]
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb) => (
        <AnimatedOrb key={orb.id} orb={orb} />
      ))}
    </View>
  );
}

function AnimatedOrb({ orb }: { orb: any }) {
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Majestic slow atmospheric drift
    const drift = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(driftX, { toValue: 60, duration: 8000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftX, { toValue: -40, duration: 9000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftX, { toValue: 0, duration: 6000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(driftY, { toValue: 40, duration: 7000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: -50, duration: 8000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 0, duration: 5000 + (Math.random() * 4000), easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.9, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ])
    );
    drift.start();
    return () => drift.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: orb.initialX,
      top: orb.initialY,
      width: orb.size,
      height: orb.size,
      transform: [
        { translateX: driftX },
        { translateY: driftY },
        { scale: pulse }
      ]
    }}>
      <Svg height="100%" width="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="grad" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={orb.hue} stopOpacity="1" />
            <Stop offset="40%" stopColor={orb.hue} stopOpacity="0.8" />
            <Stop offset="70%" stopColor={orb.hue} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={orb.hue} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill="url(#grad)" />
      </Svg>
    </Animated.View>
  );
}

function TraceLetter({
  letter,
  theme,
  segments,
  onClose,
  language,
}: {
  letter: string;
  theme: any;
  segments: any[];
  onClose: () => void;
  language: any;
}) {
  // Guard: if segments is missing or empty, render nothing but avoid crashes
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    console.warn("TraceLetter: segments is not a non-empty array", segments);
    return null;
  }

  // Track real per-segment coverage ratios (0–1) so we can compute true accuracy
  const segmentCoveragesRef = React.useRef<number[]>([]);

  const [segIndex, setSegIndex] = useState(0);
  const [states, setStates] = useState<SegmentState[]>(
    segments.map((_, i) => (i === 0 ? "active" : "locked"))
  );
  const [allDone, setAllDone] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const segSessionStart = useRef(Date.now());

  // Scalable physics-based reward array
  const rewardThemes = [
    { actor: '🐝', drop: '🍯', colors: ['#FFD93D', '#FACC15'], dash: "12,15" },
    { actor: '🚀', drop: '✨', colors: ['#60A5FA', '#3B82F6'], dash: "20,10" },
    { actor: '🦄', drop: '🌈', colors: ['#F472B6', '#E879F9'], dash: "8,10" },
    { actor: '🏎️', drop: '🏁', colors: ['#EF4444', '#DC2626'], dash: "15,5" },
    { actor: '🪄', drop: '⭐', colors: ['#A78BFA', '#8B5CF6'], dash: "5,8" },
  ];
  
  // Pick one variant natively on boot
  const [activeRewardTheme, setActiveRewardTheme] = useState(rewardThemes[0]);

  const goNext = useCallback((segmentCoverage: number = 1) => {
    // Accumulate this segment's real coverage (0–1)
    segmentCoveragesRef.current = [...segmentCoveragesRef.current, segmentCoverage];

    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 1000);

    setTimeout(() => {
      if (segIndex < segments.length - 1) {
        const next = segIndex + 1;
        setStates((s) =>
          s.map((st, i) => (i < next ? "done" : i === next ? "active" : "locked"))
        );
        setSegIndex(next);
      } else {
        // Letter complete! Compute REAL accuracy from segment coverage ratios.
        const secs = Math.round((Date.now() - segSessionStart.current) / 1000);
        const coverages = segmentCoveragesRef.current;
        const avgCoverage = coverages.length > 0
          ? coverages.reduce((sum, c) => sum + c, 0) / coverages.length
          : 1;
        // Map coverage (0–1) to accuracy score (0–100), minimum 10 for attempt credit
        const realAccuracy = Math.max(10, Math.min(100, Math.round(avgCoverage * 100)));

        const sessionId = `scalable_${letter}_${Date.now()}`;

        // Persist to bridge (learning path) with real accuracy
        recordLetterTracing(letter, realAccuracy, secs);

        // Persist full report for SessionSummary
        saveTracingSessionReport({
          sessionId,
          letter,
          timestamp: new Date().toISOString(),
          accuracy: realAccuracy,
          durationSecs: secs,
          segmentCount: segments.length,
          segmentAccuracies: coverages.map(c => Math.round(c * 100)),
        }).catch(() => {});

        // Roll new reward natively, trigger animation
        setActiveRewardTheme(rewardThemes[Math.floor(Math.random() * rewardThemes.length)]);
        setShowRewardAnimation(true);
      }
    }, 600);
  }, [segIndex, segments.length, letter]);

  const handleRestart = useCallback(() => {
    segmentCoveragesRef.current = [];
    setSegIndex(0);
    setStates(segments.map((_, i) => (i === 0 ? "active" : "locked")));
    setAllDone(false);
    setShowRewardAnimation(false);
  }, [segments]);

  useEffect(() => {
    segmentCoveragesRef.current = [];
    setSegIndex(0);
    setStates(segments.map((_, i) => (i === 0 ? "active" : "locked")));
    setAllDone(false);
    setShowRewardAnimation(false);
  }, [letter, segments]);

  return (
    <>
      <AnimatedTigerAvatar
        letter={letter}
        allDone={allDone}
        currentSegment={segIndex}
        images={theme.avatar}
        language={language}
      />

      {/* Back button removed here and moved to top of overlay for better positioning with InfoButton */}

      <View style={styles.canvasWrap}>
        <Svg width={CANVAS_W} height={CANVAS_H}>
          <Defs>
            <LinearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.pathGradient[0]} stopOpacity="1" />
              <Stop offset="50%" stopColor={theme.colors.pathGradient[1]} stopOpacity="1" />
              <Stop offset="100%" stopColor={theme.colors.pathGradient[2]} stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="glowGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="beeTrailGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFD93D" />
              <Stop offset="100%" stopColor="#FACC15" />
            </LinearGradient>
          </Defs>

          <G opacity={0.85}>
            {segments.map((s, i) => (
              <Path
                key={`base-${i}`}
                d={s.d}
                stroke="#F9FAFB"
                strokeWidth={50}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>
          <G>
            {segments.map((s, i) => (
              <Path
                key={`fg-${i}`}
                d={s.d}
                stroke="url(#pathGradient)"
                strokeWidth={34}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>

          {!showRewardAnimation && (
            <AnimatedGuideDots
              segment={segments[segIndex]}
              visible={!allDone}
              guideColor={theme.colors.guideDot}
            />
          )}

          {showRewardAnimation && (
            <RewardTracingAnimationSVG
              segments={segments}
              theme={activeRewardTheme}
              speedMsPerPoint={theme.bee.speedMsPerPoint}
              pauseAtEndMs={theme.bee.pauseAtEndMs}
              onDone={() => {
                setShowRewardAnimation(false);
                setAllDone(true);
              }}
            />
          )}
        </Svg>

        {showSparkles && (
          <SegmentCompleteSparkles segment={segments[segIndex]} />
        )}

        {!allDone && !showRewardAnimation ? (
          <SegmentTracer
            key={`${letter}-${segIndex}`}
            segment={segments[segIndex]}
            onDone={goNext}
          />
        ) : !showRewardAnimation ? (
          <SuccessBadge onRestart={handleRestart} language={language} />
        ) : null}
        {/* SegmentTracer passes real coverage ratio to goNext via onDone(coverage) */}
      </View>
    </>
  );
}

function RewardTracingAnimationSVG({ segments, theme, speedMsPerPoint, pauseAtEndMs, onDone }: any) {
  const [segIdx, setSegIdx] = useState(0);
  const [ptIdx, setPtIdx] = useState(0);
  const [visibleDrops, setVisibleDrops] = useState<boolean[]>(Array.from({ length: segments.length }, () => false));
  const [glitterCoveredIdx, setGlitterCoveredIdx] = useState<number[]>(segments.map(() => -1));

  useEffect(() => {
    if (segIdx < segments.length) {
      setVisibleDrops((arr) => {
        const next = arr.slice();
        next.fill(false);
        next[segIdx] = true;
        return next;
      });
      setPtIdx(0);
      setGlitterCoveredIdx((arr) => {
        const next = arr.slice();
        if (next[segIdx] < 0) next[segIdx] = 0;
        return next;
      });
    }
  }, [segIdx, segments.length]);

  useEffect(() => {
    if (segIdx >= segments.length) {
      onDone && onDone();
      return;
    }
    const pts = segments[segIdx].pts;
    if (!pts || pts.length === 0) {
      setSegIdx((s) => s + 1);
      return;
    }

    const id = setInterval(() => {
      setPtIdx((i) => {
        const nextI = Math.min(i + 1, pts.length - 1);
        setGlitterCoveredIdx((arr) => {
          const copy = arr.slice();
          copy[segIdx] = Math.max(copy[segIdx], nextI);
          return copy;
        });
        if (nextI < pts.length - 1) return nextI;
        clearInterval(id);
        setVisibleDrops((arr) => {
          const next = arr.slice();
          next[segIdx] = false;
          return next;
        });
        setTimeout(() => setSegIdx((s) => s + 1), pauseAtEndMs);
        return nextI;
      });
    }, speedMsPerPoint);

    return () => clearInterval(id);
  }, [segIdx, segments, speedMsPerPoint, pauseAtEndMs, onDone]);

  const currentSeg = segIdx < segments.length ? segments[segIdx] : null;
  const actorPos = currentSeg && currentSeg.pts.length > 0 ? currentSeg.pts[Math.min(ptIdx, currentSeg.pts.length - 1)] : null;

  const buildPathThrough = (pts: any[], toIdx: number) => {
    if (toIdx <= 0) return null;
    const clamped = Math.min(toIdx, pts.length - 1);
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1, clamped + 1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
  };

  return (
    <G>
      <Defs>
        <LinearGradient id="rewardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.colors[0]} />
          <Stop offset="100%" stopColor={theme.colors[1]} />
        </LinearGradient>
      </Defs>

      {segments.map((seg: any, idx: number) => {
        const coveredTo = glitterCoveredIdx[idx];
        if (coveredTo <= 0) return null;
        const d = buildPathThrough(seg.pts, coveredTo);
        if (!d) return null;
        return (
          <G key={`persist-${idx}`}>
            <Path d={d} stroke="#FFFFFF" strokeWidth={22} strokeLinecap="round" opacity={0.4} strokeDasharray="6,14" fill="none" />
            <Path d={d} stroke="url(#rewardGrad)" strokeWidth={10} strokeLinecap="round" opacity={0.95} strokeDasharray={theme.dash} fill="none"/>
          </G>
        );
      })}
      {segments.map((seg: any, idx: number) =>
        visibleDrops[idx] ? (
          <SvgText key={`drop-${idx}`} x={seg.end.x - 24} y={seg.end.y + 12} fontSize="36" fill="#000">{theme.drop}</SvgText>
        ) : null
      )}
      {actorPos && (
        <G transform={`translate(${actorPos.x}, ${actorPos.y}) rotate(${actorPos.angle + 90})`}>
          <SvgText x="-22" y="-5" fontSize="44" fill="#000">{theme.actor}</SvgText>
        </G>
      )}
    </G>
  );
}

function AnimatedTigerAvatar({ letter, allDone, currentSegment, images, language }: any) {
  const bounce = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const getImg = () => {
    if (allDone) return images.surprised;
    if (currentSegment === 0) return images.idle;
    return images.happy;
  };

  const getTTSLocale = () => {
      if (language === 'ta') return 'ta';
      if (language === 'hi') return 'hi';
      return 'en';
  };

  useEffect(() => {
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loopAnim.start();
    return () => loopAnim.stop();
  }, [bounce]);

  // Auditory reinforcement when a new letter is loaded
  useEffect(() => {
    if (letter) {
      const playLetter = async () => {
        try {
            await Speech.stop();
            const speechText = language === 'en' ? `Letter ${letter}` : letter.toLowerCase();
            Speech.speak(speechText, { language: getTTSLocale(), pitch: 1.2, rate: 0.8 });
        } catch (e) { console.warn('TTS error on letter load'); }
      };
      playLetter();
    }
  }, [letter, language]);

  useEffect(() => {
    let scaleLoop: Animated.CompositeAnimation | null = null;

    if (allDone) {
      const playReward = async () => {
        try {
            await Speech.stop();
            const amazingText = getTranslation(language, 'tracing_amazing');
            Speech.speak(amazingText, { language: getTTSLocale(), pitch: 1.3, rate: 0.95 });
        } catch (e) { console.warn('TTS error on success reward'); }
      };
      playReward();
      
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, friction: 3 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3 }),
          Animated.delay(200),
        ])
      );
      scaleLoop.start();
    } else {
      scale.setValue(1);
    }

    return () => {
       if (scaleLoop) scaleLoop.stop();
    };
  }, [allDone, language, scale]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <Animated.View style={[styles.tigerContainer, { transform: [{ translateY }, { scale }] }]}>
      <Image source={getImg()} style={styles.tigerImage} resizeMode="contain" />
      {allDone && (
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>{getTranslation(language, 'tracing_amazing')}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, { toValue: progress, useNativeDriver: false, friction: 8 }).start();
  }, [progress]);

  const widthInterpolate = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width: widthInterpolate }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

function AnimatedGuideDots({ segment, visible, guideColor }: any) {
  const [animations] = useState(() => Array.from({ length: 8 }, () => new Animated.Value(0)));

  useEffect(() => {
    let animGroup: Animated.CompositeAnimation | null = null;
    if (visible) {
      const anims = animations.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 100),
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        )
      );
      animGroup = Animated.parallel(anims);
      animGroup.start();
    }
    return () => {
      if (animGroup) animGroup.stop();
    };
  }, [visible, animations]);

  if (!visible) return null;

  const count = 8;
  const step = Math.floor(segment.pts.length / (count + 1));
  const points = Array.from({ length: count }, (_, i) => segment.pts[(i + 1) * step]);

  return (
    <>
      {points.map((p: any, i: number) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={6} fill={guideColor} opacity={0.5} />
          <Circle cx={p.x} cy={p.y} r={8} fill="url(#glowGradient)" opacity={animations[i] as any} />
        </G>
      ))}
    </>
  );
}

function SegmentCompleteSparkles({ segment }: any) {
  const sparkles = Array.from({ length: 12 }, (_, i) => ({ id: i, angle: (i * 30) * (Math.PI / 180) }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparkles.map((s) => (
        <Sparkle key={s.id} x={segment.end.x} y={segment.end.y} angle={s.angle} />
      ))}
    </View>
  );
}

function Sparkle({ x, y, angle }: any) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: Math.cos(angle) * 80, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: Math.sin(angle) * 80, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text style={[styles.sparkle, { left: x - 12, top: y - 12, opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>
      ✨
    </Animated.Text>
  );
}

function AnimatedHeaderHUD({ currentSegment, language }: any) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <View style={styles.hud}>
      <Animated.View style={[styles.tip, { transform: [{ translateY }] }]}>
        <Text style={styles.tipText}>{getTranslation(language, 'tracing_trace_glowing')}</Text>
      </Animated.View>
    </View>
  );
}

function AnimatedLegend({ states, language }: any) {
  const labels = ['1', '2', '3'];
  return (
    <View style={styles.legend}>
      {states.map((st: any, i: number) => (
        <AnimatedLegendItem key={i} label={labels[i] ?? `${i + 1}`} state={st} language={language} />
      ))}
    </View>
  );
}

function AnimatedLegendItem({ label, state, language }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'done') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3 }),
      ]).start();
    }
  }, [state]);

  return (
    <Animated.View style={[styles.legendItem, { transform: [{ scale }] }]}>
      <View style={[styles.dot, state === 'done' ? styles.dotDone : state === 'active' ? styles.dotActive : styles.dotLocked]} />
      <Text style={styles.legendText}>{getTranslation(language, 'tracing_step')} {label}</Text>
    </Animated.View>
  );
}

function SuccessBadge({ onRestart }: any) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 20, speed: 8 }).start();
  }, []);

  return (
    <Animated.View style={[styles.success, { transform: [{ scale }] }]}>
      <Text style={styles.successEmoji}>🎉</Text>
      <Text style={styles.successText}>Amazing! 🌟</Text>
      <Text style={styles.successSub}>You traced the letter!</Text>
      <TouchableOpacity style={styles.restartBtn} onPress={onRestart} activeOpacity={0.8}>
        <Text style={styles.restartText}>🔄 Trace Again!</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SegmentTracer({ segment, onDone }: any) {
  const TOLERANCE = 35;
  const puckR = 18;
  const progressIndexRef = useRef(0);
  // Track max progress reached to compute real coverage at completion
  const maxProgressRef = useRef(0);
  const [offTrack, setOffTrack] = useState(false);
  const [rotation, setRotation] = useState(segment.pts[0]?.angle || 0);
  const puck = useRef(new Animated.ValueXY({ x: segment.pts[0].x, y: segment.pts[0].y })).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const setPuckToIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(segment.pts.length - 1, idx));
      const pt = segment.pts[clamped];
      puck.setValue({ x: pt.x, y: pt.y });
      setRotation(pt.angle);
    },
    [segment.pts, puck]
  );

  useEffect(() => {
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    glowAnim.start();
    pulseAnim.start();
    return () => {
      glowAnim.stop();
      pulseAnim.stop();
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setOffTrack(false);
          setPuckToIndex(progressIndexRef.current);
        },
        onPanResponderMove: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const touchY = evt.nativeEvent.locationY;
          const { index, dist2 } = nearestIndex(segment.pts, { x: touchX, y: touchY });
          const within = dist2 <= TOLERANCE * TOLERANCE;
          if (!within) {
            setOffTrack(true);
            return;
          }
          setOffTrack(false);
          const prev = progressIndexRef.current;

          // Loop-Closure Detection: enclosed shapes like 'O' and 'Q'
          if (prev > segment.pts.length - 30 && index < 20) {
              progressIndexRef.current = segment.pts.length - 1;
          } else if (index <= prev + 40) {
              progressIndexRef.current = Math.max(prev - 15, index);
          }

          // Track the furthest point reached for real accuracy measurement
          if (progressIndexRef.current > maxProgressRef.current) {
            maxProgressRef.current = progressIndexRef.current;
          }

          setPuckToIndex(progressIndexRef.current);
          if (progressIndexRef.current >= segment.pts.length - 2) {
            // Coverage = fraction of path points reached
            const coverage = segment.pts.length > 1
              ? maxProgressRef.current / (segment.pts.length - 1)
              : 1;
            setTimeout(() => onDone(coverage), 300);
          }
        },
        onPanResponderRelease: () => {
          if (offTrack) setPuckToIndex(progressIndexRef.current);
        },
      }),
    [segment.pts, onDone, offTrack, setPuckToIndex]
  );

  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(34,197,94,0.0)', 'rgba(255,215,0,0.8)'] });

  const puckStyle = {
    transform: [
      { translateX: Animated.subtract(puck.x as any, puckR) },
      { translateY: Animated.subtract(puck.y as any, puckR) },
      { scale: pulse },
    ],
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" {...panResponder.panHandlers}>
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="rainbowTrail" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#EC4899" stopOpacity="1" />
            <Stop offset="33%" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="66%" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#14B8A6" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${segment.pts[0].x} ${segment.pts[0].y} ` + segment.pts.slice(1, progressIndexRef.current + 1).map((p: any) => `L ${p.x} ${p.y}`).join(' ')}
          stroke={offTrack ? '#F87171' : 'url(#rainbowTrail)'}
          strokeWidth={16}
          strokeLinecap="round"
          opacity={0.95}
          fill="none"
        />
      </Svg>
      <Animated.View style={[styles.puck, puckStyle, offTrack && styles.puckOff]}>
        <Animated.View style={[styles.puckGlow, { backgroundColor: glowColor as any }]} />
        <RNText style={[styles.puckArrow, { transform: [{ rotate: `${rotation}deg` }] }]}>→</RNText>
      </Animated.View>
    </View>
  );
}

const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: SAFE_TOP,
  },
  canvasWrap: { width: CANVAS_W, height: CANVAS_H, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  tigerContainer: { position: 'absolute', bottom: 80, left: 30, zIndex: 1000, pointerEvents: 'none' },
  tigerImage: { width: 350, height: 350 },
  speechBubble: {
    position: 'absolute',
    top: -40,
    left: 140,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  speechText: { color: '#1F2937', fontSize: 13, fontWeight: '800' },
  progressBarContainer: {
    position: 'absolute',
    top: SAFE_TOP + 65,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#22C55E',
    zIndex: 10,
  },
  progressBarBg: {
    width: 200,
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  progressBarFill: { height: '100%', backgroundColor: '#22C55E', borderRadius: 6 },
  progressText: { fontSize: 13, fontWeight: '900', color: '#1F2937' },
  hud: { position: 'absolute', top: SAFE_TOP + 15, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  letterBadge: {
    position: 'absolute',
    top: SAFE_TOP + 115,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    fontWeight: '900',
    color: '#0F172A',
    zIndex: 10,
  },
  tip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    marginTop: -2,
  },
  tipText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  legend: {
    position: 'absolute',
    bottom: -30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  dotDone: { backgroundColor: '#22C55E', shadowColor: '#22C55E', shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 },
  dotActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 },
  dotLocked: { backgroundColor: '#94A3B8' },
  legendText: { color: '#0F172A', fontWeight: '700', fontSize: 11 },
  puck: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFA500',
  },
  puckOff: { backgroundColor: '#EF4444', borderColor: '#DC2626', shadowColor: '#EF4444' },
  puckGlow: { position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 34 },
  puckArrow: {
    color: 'white',
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  success: {
    position: 'absolute',
    top: CANVAS_H / 3.5,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 28,
    backgroundColor: 'rgba(34,197,94,0.98)',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  successEmoji: { fontSize: 64, marginBottom: 12 },
  successText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  successSub: { color: 'white', fontSize: 16, textAlign: 'center', marginTop: 6, opacity: 0.95, fontWeight: '700' },
  restartBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  restartText: { color: 'white', fontSize: 18, fontWeight: '800' },
  star: { position: 'absolute', fontSize: 20 },
  sparkle: { position: 'absolute', fontSize: 24 },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2 },

  // ── Letter Picker Strip ────────────────────────────────────────────────
  pickerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(99,102,241,0.18)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  pickerWrapDark: {
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderTopColor: 'rgba(129,140,248,0.25)',
  },
  pickerScroll: {
    paddingHorizontal: 10,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  letterPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(241,245,249,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterPillDark: {
    backgroundColor: 'rgba(30,41,59,0.9)',
    borderColor: 'rgba(100,116,139,0.4)',
  },
  letterPillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
    shadowColor: '#6366F1',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    transform: [{ scale: 1.15 }],
  },
  letterPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Bold',
  },
  letterPillTextDark: {
    color: '#CBD5E1',
  },
  letterPillTextActive: {
    color: '#FFFFFF',
  },
});
