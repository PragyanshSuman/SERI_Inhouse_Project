import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Animated, Easing,
    PanResponder, Dimensions, Share, ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import Svg, { Path } from 'react-native-svg';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';
import { SpellingSessionService, SpellingWordResult } from '../../../services/SpellingSessionService';
import { WordEntry } from '../../../services/WordService';
import { useAuth } from '../../../context/AuthContext';
import { getApiBaseUrl } from '../../../config/apiConfig';

const { width: SW } = Dimensions.get('window');
const CANVAS_W = SW - 32;
const CANVAS_H = 350;

type Phase = 'intro' | 'listen' | 'write' | 'recognizing' | 'result' | 'report';
interface Point { x: number; y: number; }

const pointsToPath = (strokes: Point[][]): string =>
    strokes.map(s =>
        s.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    ).join(' ');

const SpellingAssessmentScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const auth = useAuth() as any;
    const patientId = auth?.username ?? 'PATIENT';

    const serviceRef = useRef(new SpellingSessionService(patientId, 'screening'));
    const [assessmentWords, setAssessmentWords] = useState<WordEntry[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>('intro');
    const [completedWords, setCompletedWords] = useState<SpellingWordResult[]>([]);
    const [recognizedText, setRecognizedText] = useState('');
    const [lastAccuracy, setLastAccuracy] = useState(0);

    // Canvas — use ref for current stroke to avoid stale closures in PanResponder
    const [strokes, setStrokes] = useState<Point[][]>([]);
    const [displayStroke, setDisplayStroke] = useState<Point[]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
    const attemptStartRef = useRef<number>(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        setAssessmentWords(serviceRef.current.getAssessmentWords());
    }, []);

    const currentWord = assessmentWords[currentIndex];

    // ── Accept word directly — avoids stale-closure when called from setTimeout ──
    const speakWord = useCallback((wordOverride?: string) => {
        const target = wordOverride ?? currentWord?.word;
        if (!target) return;
        // Stop any currently playing speech first (Android audio focus fix)
        Speech.stop();
        setTimeout(() => {
            Speech.speak(target, {
                rate: 0.75,
                language: 'en-US',
                onStart: () => console.log('[TTS] Speaking:', target),
                onError: (e) => console.warn('[TTS] Error:', e),
            });
        }, 150); // small gap after stop()
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.35, duration: 300, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [currentWord]);

    // ── FIX: use evt.nativeEvent.locationX/Y — always relative to the canvas view ──
    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const pt = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
            currentStrokeRef.current = [pt];
            setDisplayStroke([pt]);
        },
        onPanResponderMove: (evt) => {
            const pt = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
            currentStrokeRef.current = [...currentStrokeRef.current, pt];
            setDisplayStroke([...currentStrokeRef.current]);
        },
        onPanResponderRelease: () => {
            // ── IMPORTANT: snapshot BEFORE clearing the ref ──────────────
            // setStrokes updater runs lazily; if we clear the ref first
            // it captures [] instead of the completed stroke.
            const completedStroke = [...currentStrokeRef.current];
            currentStrokeRef.current = [];
            setDisplayStroke([]);

            if (completedStroke.length > 1) {
                setStrokes(prev => [...prev, completedStroke]);
            }
        },
    });

    const clearCanvas = () => {
        setStrokes([]);
        setDisplayStroke([]);
        currentStrokeRef.current = [];
    };

    const enterListenPhase = (wordEntry?: WordEntry) => {
        // Resolve the word NOW (synchronously) before any async state updates
        const word = wordEntry?.word ?? assessmentWords[currentIndex]?.word;
        clearCanvas();
        setPhase('listen');
        // Pass word explicitly so speakWord never relies on possibly-stale state
        setTimeout(() => speakWord(word), 600);
    };

    const enterWritePhase = () => {
        clearCanvas();
        attemptStartRef.current = Date.now();
        setPhase('write');
    };

    // ── Auto-recognition via backend ──────────────────────────────────────────
    const handleDone = async () => {
        if (strokes.length === 0) return;
        setPhase('recognizing');

        const durationMs = Date.now() - attemptStartRef.current;
        const allStrokes = [...strokes];
        const svgPath = pointsToPath(allStrokes);

        try {
            const API_URL = getApiBaseUrl();
            const payload = {
                strokes: allStrokes.map(s => s.map(p => ({ x: p.x, y: p.y }))),
                canvas_width: CANVAS_W,
                canvas_height: CANVAS_H,
                expected_word: currentWord.word,
            };

            const resp = await fetch(`${API_URL}/recognize-spelling`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            // TrOCR sometimes predicts punctuation (e.g. "and."). Strip it.
            const recognized = (data.recognized ?? '').replace(/[^a-z]/gi, '').toLowerCase();
            setRecognizedText(recognized);

            // Score using backend fuzzy matching if available, otherwise fallback to strict
            const isMatch = data.is_match ?? (recognized === currentWord.word.toLowerCase());
            const selfAssessment = isMatch ? 'yes' : (recognized.length > 0 ? 'mostly' : 'no');

            serviceRef.current.logWordResult(
                currentWord.word, recognized, selfAssessment, svgPath, durationMs
            );
        } catch (error) {
            // Fallback if backend unreachable
            console.error('[SpellingAssessmentScreen] Backend fetch error:', error);
            serviceRef.current.logWordResult(
                currentWord.word, '', 'no', svgPath, durationMs
            );
            setRecognizedText('(could not connect to backend)');
        }

        const results = serviceRef.current.getSession().words;
        setLastAccuracy(results[results.length - 1]?.accuracy ?? 0);
        setCompletedWords([...results]);
        setPhase('result');
    };

    const handleNext = () => {
        const next = currentIndex + 1;
        if (next >= assessmentWords.length) {
            serviceRef.current.finalise();
            setPhase('report');
        } else {
            const nextWord = assessmentWords[next]; // resolve BEFORE setCurrentIndex
            setCurrentIndex(next);
            enterListenPhase(nextWord);             // pass it explicitly
        }
    };

    const handleShare = async () => {
        await Share.share({
            message: serviceRef.current.generateReportText(),
            title: 'Spelling Assessment Report',
        });
    };

    // ── Renders ───────────────────────────────────────────────────────────────
    const renderProgressDots = () => (
        <View style={styles.dots}>
            {assessmentWords.map((_, i) => (
                <View key={i} style={[
                    styles.dot,
                    i < currentIndex && { backgroundColor: DT.text.success },
                    i === currentIndex && { backgroundColor: DT.accent.navy, width: 20 },
                ]} />
            ))}
        </View>
    );

    if (phase === 'intro') return (
        <SafeAreaView style={styles.root}>
            <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
            <BackButton color={DT.accent.navy} />
            <View style={styles.center}>
                <Text style={styles.bigEmoji}>✍️</Text>
                <Text style={styles.title}>Listen & Write</Text>
                <Text style={styles.sub}>Hear a word · Write it on the canvas · AI reads your writing</Text>
                <View style={styles.pillRow}>
                    {[['3','Easy','#4ade80'],['4','Medium','#fbbf24'],['2','Hard','#f87171'],['1','Tricky','#a78bfa']]
                        .map(([n, l, c]) => (
                            <View key={l} style={[styles.pill, { backgroundColor: c + '22' }]}>
                                <Text style={[styles.pillTxt, { color: c }]}>{n} {l}</Text>
                            </View>
                        ))}
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => enterListenPhase()}>
                    <Text style={styles.btnTxt}>Begin →</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    if (phase === 'listen') return (
        <SafeAreaView style={styles.root}>
            <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
            <BackButton color={DT.accent.navy} />
            <View style={styles.center}>
                {renderProgressDots()}
                <View style={styles.levelBadge}>
                    <Text style={styles.levelTxt}>{currentWord?.level} · DDS {currentWord?.dds.toFixed(1)}</Text>
                </View>
                <Text style={styles.sub}>Listen carefully…</Text>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity style={styles.speakerBtn} onPress={() => speakWord()}>
                        <Text style={{ fontSize: 58 }}>🔊</Text>
                    </TouchableOpacity>
                </Animated.View>
                <Text style={[styles.sub, { marginTop: 12 }]}>Tap to hear again</Text>
                <TouchableOpacity style={[styles.btn, { marginTop: 32 }]} onPress={enterWritePhase}>
                    <Text style={styles.btnTxt}>Write It ✍️</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    if (phase === 'write') return (
        <SafeAreaView style={styles.root}>
            <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.writeWrap}>
                {renderProgressDots()}
                <View style={styles.writeTopBar}>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => speakWord()}>
                        <Text style={styles.smallBtnTxt}>🔊 Hear Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fee2e2' }]} onPress={clearCanvas}>
                        <Text style={[styles.smallBtnTxt, { color: DT.text.error }]}>🗑 Clear</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.instruction}>Write the word with your finger</Text>

                {/* CANVAS — PanResponder on the outer View, SVG renders inside */}
                <View style={styles.canvas} {...panResponder.panHandlers}>
                    <Svg width={CANVAS_W} height={CANVAS_H}>
                        {/* Baseline guides */}
                        {[70, 140, 190].map(y => (
                            <Path key={y} d={`M 0 ${y} L ${CANVAS_W} ${y}`}
                                stroke="#E2E8F0" strokeWidth={1} strokeDasharray="6,4" />
                        ))}
                        {/* Completed strokes */}
                        {strokes.map((s, i) => (
                            <Path key={i} d={pointsToPath([s])}
                                stroke={DT.accent.navy} strokeWidth={8}
                                strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        ))}
                        {/* Live stroke */}
                        {displayStroke.length > 1 && (
                            <Path d={pointsToPath([displayStroke])}
                                stroke={DT.accent.indigo} strokeWidth={8}
                                strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        )}
                    </Svg>
                </View>

                <TouchableOpacity
                    style={[styles.btn, { marginTop: 20, opacity: strokes.length === 0 ? 0.4 : 1 }]}
                    onPress={handleDone}
                    disabled={strokes.length === 0}
                >
                    <Text style={styles.btnTxt}>Done — Read My Writing ✅</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    if (phase === 'recognizing') return (
        <SafeAreaView style={styles.root}>
            <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.center}>
                <ActivityIndicator size="large" color={DT.accent.navy} />
                <Text style={[styles.sub, { marginTop: 20 }]}>AI is reading your handwriting…</Text>
            </View>
        </SafeAreaView>
    );

    if (phase === 'result') {
        const color = lastAccuracy >= 80 ? DT.text.success : lastAccuracy >= 50 ? DT.accent.amber : DT.text.error;
        const icon  = lastAccuracy >= 80 ? '🎉' : lastAccuracy >= 50 ? '📝' : '🔁';
        const last  = completedWords[completedWords.length - 1];
        return (
            <SafeAreaView style={styles.root}>
                <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
                <View style={styles.center}>
                    <Text style={{ fontSize: 54, marginBottom: 8 }}>{icon}</Text>
                    <View style={[styles.scoreCircle, { borderColor: color }]}>
                        <Text style={[styles.scoreVal, { color }]}>{lastAccuracy}%</Text>
                        <Text style={styles.scoreLbl}>Spelling Score</Text>
                    </View>
                    <View style={styles.compareBox}>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareLabel}>Expected</Text>
                            <Text style={styles.compareWord}>{currentWord?.word}</Text>
                        </View>
                        <Text style={{ fontSize: 24, color: DT.text.muted }}>→</Text>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareLabel}>AI Read</Text>
                            <Text style={[styles.compareWord, { color: lastAccuracy >= 80 ? DT.text.success : DT.text.error }]}>
                                {recognizedText || '—'}
                            </Text>
                            {recognizedText !== '' && (
                                <Text style={styles.compareLabel}>
                                    {lastAccuracy >= 80 ? '✅ Match' : '❌ Mismatch'}
                                </Text>
                            )}
                            {recognizedText === '' && (
                                <Text style={[styles.compareLabel, { color: DT.accent.amber }]}>
                                    ⚠️ Could not read
                                </Text>
                            )}
                        </View>
                    </View>
                    {last && (
                        <View style={styles.errorTagRow}>
                            {last.errorTypes.map((e, i) => (
                                <View key={i} style={[styles.errorTag, {
                                    backgroundColor: e === 'correct' ? '#4ade8022' : '#f8717122'
                                }]}>
                                    <Text style={[styles.errorTagTxt, {
                                        color: e === 'correct' ? '#16a34a' : '#dc2626'
                                    }]}>{e}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    <TouchableOpacity style={styles.btn} onPress={handleNext}>
                        <Text style={styles.btnTxt}>
                            {currentIndex + 1 >= assessmentWords.length ? 'View Report 🩺' : 'Next Word →'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // REPORT
    const svc = serviceRef.current;
    const flag = svc.getClinicalFlag();
    const flagColor = flag === 'High-Risk' ? DT.text.error : flag === 'Monitor' ? DT.accent.amber : DT.text.success;
    const freq = svc.getErrorFrequency();
    const ERROR_LABELS: Record<string, string> = {
        reversal: '🔄 Reversals', omission: '➖ Omissions',
        transposition: '🔀 Transpositions', insertion: '➕ Insertions',
        substitution: '🔁 Substitutions', blank: '⬜ Blank', correct: '✅ Correct',
    };

    return (
        <SafeAreaView style={styles.root}>
            <LinearGradient colors={[DT.bg.lemon, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />
            <ScrollView contentContainerStyle={styles.reportScroll}>
                <Text style={styles.title}>Spelling Report ✍️</Text>
                <Text style={styles.reportSub}>{svc.getSession().sessionId}</Text>

                <View style={[styles.flagBanner, { borderColor: flagColor }]}>
                    <Text style={{ fontSize: 32 }}>{flag === 'High-Risk' ? '🔴' : flag === 'Monitor' ? '⚠️' : '✅'}</Text>
                    <View>
                        <Text style={[styles.flagTitle, { color: flagColor }]}>{flag}</Text>
                        <Text style={styles.flagSub}>Clinical Classification</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    {[
                        { l: 'Avg Accuracy', v: `${svc.getAverageAccuracy()}%` },
                        { l: 'Tricky Words', v: `${svc.getTrickyWordAccuracy()}%` },
                        { l: 'Reversals',    v: `${svc.getReversalCount()}` },
                    ].map((s, i) => (
                        <View key={i} style={styles.statCard}>
                            <Text style={styles.statVal}>{s.v}</Text>
                            <Text style={styles.statLbl}>{s.l}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.secHdr}>Error Pattern Analysis</Text>
                {Object.entries(freq).filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                        <View key={k} style={styles.freqRow}>
                            <Text style={styles.freqLbl}>{ERROR_LABELS[k] ?? k}</Text>
                            <View style={styles.freqBarBg}>
                                <View style={[styles.freqBarFill, {
                                    width: `${Math.min(100, v * 20)}%`,
                                    backgroundColor: k === 'correct' ? DT.text.success : DT.text.error,
                                }]} />
                            </View>
                            <Text style={styles.freqCnt}>{v}×</Text>
                        </View>
                    ))}

                <Text style={styles.secHdr}>Word-by-Word</Text>
                {completedWords.map((w, i) => {
                    const c = w.accuracy >= 80 ? '#16a34a' : w.accuracy >= 50 ? '#d97706' : '#dc2626';
                    return (
                        <View key={i} style={styles.wordRow}>
                            <Text style={styles.wordIcon}>{w.accuracy >= 80 ? '✅' : w.accuracy >= 50 ? '⚠️' : '🔴'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.wordTxt}>{w.word}</Text>
                                <Text style={styles.wordDet}>AI read: "{w.writtenAnswer || '—'}" · {w.errorTypes.join(', ')}</Text>
                            </View>
                            <Text style={[styles.wordAcc, { color: c }]}>{w.accuracy}%</Text>
                        </View>
                    );
                })}

                <TouchableOpacity style={styles.exportBtn} onPress={handleShare}>
                    <Text style={styles.exportTxt}>📤  Export for Specialist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { marginTop: 12, marginBottom: 50 }]}
                    onPress={() => navigation.goBack()}>
                    <Text style={styles.btnTxt}>Done</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    root:          { flex: 1 },
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: 60 },
    writeWrap:     { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 16 },
    bigEmoji:      { fontSize: 64, marginBottom: 12 },
    title:         { fontSize: 28, fontWeight: '900', color: DT.text.primary, marginBottom: 8, textAlign: 'center' },
    sub:           { fontSize: 15, color: DT.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 16 },
    instruction:   { fontSize: 15, color: DT.text.secondary, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
    pillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 },
    pill:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    pillTxt:       { fontSize: 13, fontWeight: '800' },
    btn:           { backgroundColor: DT.accent.navy, borderRadius: DT.radius.pill, paddingVertical: 16, paddingHorizontal: 36, ...DT.shadow.medium },
    btnTxt:        { color: '#FFF', fontSize: 17, fontWeight: '800' },
    dots:          { flexDirection: 'row', gap: 6, marginBottom: 24, alignSelf: 'center' },
    dot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1' },
    levelBadge:    { backgroundColor: '#4f46e522', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
    levelTxt:      { fontSize: 13, fontWeight: '700', color: DT.accent.navy },
    speakerBtn:    { width: 120, height: 120, borderRadius: 60, backgroundColor: DT.surface.card, justifyContent: 'center', alignItems: 'center', ...DT.shadow.medium },
    writeTopBar:   { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
    smallBtn:      { backgroundColor: DT.bg.skyBlue, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    smallBtnTxt:   { color: DT.accent.navy, fontWeight: '700', fontSize: 14 },
    canvas: {
        width: CANVAS_W, height: CANVAS_H,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 2, borderColor: DT.surface.cardBorder,
        ...DT.shadow.soft, overflow: 'hidden',
    },
    scoreCircle:   { width: 150, height: 150, borderRadius: 75, borderWidth: 7, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: DT.surface.card },
    scoreVal:      { fontSize: 36, fontWeight: '900' },
    scoreLbl:      { fontSize: 12, color: DT.text.muted, fontWeight: '700', textTransform: 'uppercase' },
    compareBox:    { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: DT.surface.card, borderRadius: 16, padding: 16, marginBottom: 16, ...DT.shadow.soft },
    compareCol:    { alignItems: 'center' },
    compareLabel:  { fontSize: 11, color: DT.text.muted, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
    compareWord:   { fontSize: 24, fontWeight: '900', color: DT.accent.navy, letterSpacing: 2 },
    errorTagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
    errorTag:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    errorTagTxt:   { fontSize: 13, fontWeight: '700' },
    reportScroll:  { padding: 24, paddingTop: 60 },
    reportSub:     { fontSize: 12, color: DT.text.muted, marginBottom: 24 },
    flagBanner:    { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 2, backgroundColor: DT.surface.card, marginBottom: 20, ...DT.shadow.soft },
    flagTitle:     { fontSize: 22, fontWeight: '900' },
    flagSub:       { fontSize: 12, color: DT.text.muted, marginTop: 2 },
    statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard:      { flex: 1, backgroundColor: DT.surface.card, borderRadius: 14, padding: 14, alignItems: 'center', ...DT.shadow.soft },
    statVal:       { fontSize: 22, fontWeight: '900', color: DT.accent.navy },
    statLbl:       { fontSize: 11, color: DT.text.muted, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
    secHdr:        { fontSize: 13, fontWeight: '800', color: DT.text.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },
    freqRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    freqLbl:       { width: 130, fontSize: 13, fontWeight: '700', color: DT.text.primary },
    freqBarBg:     { flex: 1, height: 8, backgroundColor: DT.surface.divider, borderRadius: 4, overflow: 'hidden' },
    freqBarFill:   { height: '100%', borderRadius: 4 },
    freqCnt:       { fontSize: 13, fontWeight: '700', color: DT.text.secondary, width: 26, textAlign: 'right' },
    wordRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: DT.surface.card, borderRadius: 12, padding: 12, marginBottom: 8, ...DT.shadow.soft },
    wordIcon:      { fontSize: 18, marginRight: 10 },
    wordTxt:       { fontSize: 17, fontWeight: '800', color: DT.text.primary },
    wordDet:       { fontSize: 12, color: DT.text.muted, marginTop: 2, fontStyle: 'italic' },
    wordAcc:       { fontSize: 20, fontWeight: '900' },
    exportBtn:     { backgroundColor: '#1E3A5F', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, ...DT.shadow.medium },
    exportTxt:     { color: '#FFF', fontSize: 17, fontWeight: '800' },
});

export default SpellingAssessmentScreen;
