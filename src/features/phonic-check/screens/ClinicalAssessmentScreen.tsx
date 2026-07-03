import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Animated,
    Easing,
    Alert,
    ActivityIndicator,
    Share,
    Linking,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { ClinicalSessionService, ClinicalWordResult } from '../../../services/ClinicalSessionService';
import { AudioRecorder } from '../services/audioRecorder';
import { checkPronunciation, exportPdfReport } from '../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import { WordEntry } from '../../../services/WordService';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'listen' | 'speak' | 'result' | 'report';

// ─── Main Component ───────────────────────────────────────────────────────────
const ClinicalAssessmentScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const auth = useAuth() as any;
    const patientId = auth?.username ?? 'PATIENT';

    // ── Session State ──────────────────────────────────────────────────────
    const serviceRef = useRef(new ClinicalSessionService(patientId, 'screening'));
    const [assessmentWords, setAssessmentWords] = useState<WordEntry[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>('intro');
    const [lastResult, setLastResult] = useState<any>(null);
    const [completedWords, setCompletedWords] = useState<ClinicalWordResult[]>([]);

    // ── Recording State ────────────────────────────────────────────────────
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioRecorder] = useState(() => new AudioRecorder());
    const attemptStartRef = useRef<number>(0);

    // ── Animations ─────────────────────────────────────────────────────────
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    // ── Initialise word list ───────────────────────────────────────────────
    useEffect(() => {
        const words = serviceRef.current.getAssessmentWords();
        setAssessmentWords(words);
        return () => { audioRecorder.cleanup(); };
    }, []);

    // ── Pulse animation for mic ────────────────────────────────────────────
    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [isRecording]);

    // ─── Phase Helpers ────────────────────────────────────────────────────
    const currentWord = assessmentWords[currentIndex];

    const speakCurrentWord = useCallback(() => {
        if (!currentWord) return;
        Speech.speak(currentWord.word, { rate: 0.8, pitch: 1.0 });
    }, [currentWord]);

    const enterListenPhase = useCallback((overrideWord?: string) => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        setPhase('listen');
        // Auto-speak after brief delay
        setTimeout(() => { 
            if (typeof overrideWord === 'string') {
                Speech.speak(overrideWord, { rate: 0.8, pitch: 1.0 });
            } else {
                speakCurrentWord(); 
            }
        }, 500);
    }, [speakCurrentWord, fadeAnim]);

    const enterSpeakPhase = useCallback(() => {
        setPhase('speak');
    }, []);

    const handleToggleRecording = async () => {
        if (isProcessing) return;
        try {
            if (isRecording) {
                const uri = await audioRecorder.stopRecording();
                setIsRecording(false);
                handleAnalyze(uri);
            } else {
                attemptStartRef.current = Date.now();
                await audioRecorder.startRecording();
                setIsRecording(true);
            }
        } catch (err) {
            Alert.alert('Recording Error', 'Could not access microphone. Please check permissions.');
            setIsRecording(false);
        }
    };

    const handleAnalyze = async (uri: string) => {
        if (!uri || !currentWord) return;
        setIsProcessing(true);
        try {
            const durationMs = Date.now() - attemptStartRef.current;
            const result = await checkPronunciation(currentWord.word, uri);
            serviceRef.current.logWordResult(currentWord.word, result, durationMs);
            setLastResult(result);
            setCompletedWords(prev => [...prev, serviceRef.current.getSession().words.slice(-1)[0]]);
            setPhase('result');
        } catch (err) {
            Alert.alert('Backend Error', 'Could not connect to the server. Ensure the backend is running.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNext = () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= assessmentWords.length) {
            serviceRef.current.finalise();
            setPhase('report');
        } else {
            setCurrentIndex(nextIndex);
            fadeAnim.setValue(0);
            setLastResult(null);
            enterListenPhase(assessmentWords[nextIndex].word);
        }
    };

    const handleShareReport = async () => {
        const svc = serviceRef.current;
        const session = svc.getSession();
        const durationSec = Math.round(svc.getSessionDurationMs() / 1000);
        const durationStr = `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
        const flag = svc.getClinicalFlag();
        const phonemeErrors = svc.getPhonemeErrorMap();

        const wordRows = session.words.map(w => {
            const icon = w.accuracy >= 80 ? '✅' : w.accuracy >= 50 ? '⚠️' : '🔴';
            return `${icon}  ${w.word.padEnd(14)} DDS:${w.dds.toFixed(1)}  Accuracy:${Math.round(w.accuracy)}%  Heard:"${w.transcriptionHeard}"`;
        }).join('\n');

        const phonemeRows = phonemeErrors.length > 0
            ? phonemeErrors.map(p => `  /${p.phoneme}/ — Avg ${p.avgScore}% (${p.count} samples)`).join('\n')
            : '  No significant phoneme errors detected.';

        const text = `
══════════════════════════════════════════════
  DYSLEXIA SPEECH ASSESSMENT REPORT
  UnifiedLearningApp — Clinical Edition
══════════════════════════════════════════════
Patient ID     : ${session.patientId.toUpperCase()}
Session ID     : ${session.sessionId}
Date           : ${new Date(session.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
Duration       : ${durationStr}
Words Tested   : ${session.words.length}
Mode           : ${session.sessionMode === 'deep_dive' ? 'Deep Dive (20 words)' : 'Screening (10 words)'}

OVERALL PERFORMANCE
───────────────────
Clinical Flag         : ${flag === 'High-Risk' ? '🔴' : flag === 'Monitor' ? '⚠️' : '✅'} ${flag.toUpperCase()}
Intelligibility Index : ${svc.getIntelligibilityIndex()}%
Average Accuracy      : ${svc.getAverageAccuracy()}%
Tricky Word Accuracy  : ${svc.getTrickyWordAccuracy()}%

WORD-BY-WORD ANALYSIS
──────────────────────
${wordRows}

PHONEME ERROR PATTERNS (Weakest Sounds)
────────────────────────────────────────
${phonemeRows}

CLINICAL RECOMMENDATIONS
─────────────────────────
${flag === 'High-Risk'
  ? `• Immediate structured phonics intervention recommended (Orton-Gillingham Level 1-3)\n• Weekly 1:1 speech-language therapy sessions advised\n• Focus: phonological awareness and decoding fluency`
  : flag === 'Monitor'
  ? `• Continue daily reading practice with decodable texts\n• Monitor progress every 4 weeks\n• Focus on tricky/irregular word memorisation (Heart Words)`
  : `• Child is performing within expected range\n• Continue current curriculum\n• Re-assess in 8 weeks for progress tracking`
}

══════════════════════════════════════════════
Generated by UnifiedLearningApp v1.2
For clinical use only — not a substitute for formal SLP evaluation
══════════════════════════════════════════════
    `.trim();

        try {
            const pdfUrl = await exportPdfReport(text);
            await Linking.openURL(pdfUrl);
        } catch (error) {
            console.error('PDF Export failed, falling back to text:', error);
            await Share.share({ message: text, title: 'Clinical Speech Assessment Report' });
        }
    };

    // ─── Renders ─────────────────────────────────────────────────────────────
    const renderIntro = () => (
        <View style={styles.centeredContent}>
            <Text style={styles.phaseEmoji}>🩺</Text>
            <Text style={styles.phaseTitle}>Clinical Assessment</Text>
            <Text style={styles.phaseSubtitle}>
                {assessmentWords.length} words will be tested.{'\n'}
                Listen carefully, then repeat each word.
            </Text>
            <View style={styles.wordPillRow}>
                <View style={[styles.wordPill, { backgroundColor: '#4ade8020' }]}><Text style={[styles.wordPillText, {color:'#16a34a'}]}>3 Easy</Text></View>
                <View style={[styles.wordPill, { backgroundColor: '#fbbf2420' }]}><Text style={[styles.wordPillText, {color:'#d97706'}]}>4 Medium</Text></View>
                <View style={[styles.wordPill, { backgroundColor: '#f8717120' }]}><Text style={[styles.wordPillText, {color:'#dc2626'}]}>2 Hard</Text></View>
                <View style={[styles.wordPill, { backgroundColor: '#a78bfa20' }]}><Text style={[styles.wordPillText, {color:'#7c3aed'}]}>1 Tricky</Text></View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => enterListenPhase()}>
                <Text style={styles.primaryBtnText}>Begin Assessment →</Text>
            </TouchableOpacity>
        </View>
    );

    const renderListen = () => (
        <View style={styles.centeredContent}>
            <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Word {currentIndex + 1} / {assessmentWords.length}</Text>
                <View style={[styles.levelPill, { backgroundColor: currentWord?.level === 'Easy' ? '#4ade8030' : currentWord?.level === 'Medium' ? '#fbbf2430' : '#f8717130' }]}>
                    <Text style={styles.levelPillText}>{currentWord?.level} · DDS {currentWord?.dds.toFixed(1)}</Text>
                </View>
            </View>
            <Text style={styles.phaseEmoji}>🔊</Text>
            <Text style={styles.bigWord}>{currentWord?.word}</Text>
            <Text style={styles.phaseSubtitle}>Listen to the word carefully</Text>
            <TouchableOpacity style={styles.speakAgainBtn} onPress={speakCurrentWord}>
                <Text style={styles.speakAgainText}>🔁  Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={enterSpeakPhase}>
                <Text style={styles.primaryBtnText}>I'm Ready to Speak 🎤</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSpeak = () => (
        <View style={styles.centeredContent}>
            <Text style={styles.progressLabel}>Word {currentIndex + 1} / {assessmentWords.length}</Text>
            <Text style={styles.bigWord}>{currentWord?.word}</Text>
            <Text style={styles.phaseSubtitle}>Say the word clearly into the mic</Text>

            <View style={styles.micArea}>
                {isRecording && (
                    <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                )}
                <TouchableOpacity
                    style={[styles.micBtn, isRecording && styles.micBtnActive, isProcessing && styles.micBtnDisabled]}
                    onPress={handleToggleRecording}
                    disabled={isProcessing}
                >
                    {isProcessing
                        ? <ActivityIndicator size="large" color="#FFF" />
                        : <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
                    }
                </TouchableOpacity>
            </View>
            <Text style={styles.statusText}>
                {isProcessing ? 'Analysing...' : isRecording ? 'Recording... tap to stop' : 'Tap mic to record'}
            </Text>
        </View>
    );

    const renderResult = () => {
        if (!lastResult) return null;
        const accuracy = Math.round(lastResult.word_accuracy ?? 0);
        const color = accuracy >= 80 ? DT.text.success : accuracy >= 50 ? DT.accent.amber : DT.text.error;
        const icon  = accuracy >= 80 ? '🎉' : accuracy >= 50 ? '📢' : '🔁';

        return (
            <View style={styles.centeredContent}>
                <Text style={styles.resultIcon}>{icon}</Text>
                <View style={[styles.scoreCircle, { borderColor: color }]}>
                    <Text style={[styles.scoreValue, { color }]}>{accuracy}%</Text>
                    <Text style={styles.scoreLabel}>Accuracy</Text>
                </View>
                {lastResult.phonemes?.length > 0 && (
                    <View style={styles.phonemeRow}>
                        {lastResult.phonemes.map((p: any, i: number) => {
                            const c = p.score >= 80 ? DT.text.success : p.score >= 50 ? DT.accent.amber : DT.text.error;
                            return (
                                <View key={i} style={[styles.phonemeBox, { borderColor: c }]}>
                                    <Text style={[styles.phonemeLetter, { color: c }]}>{p.p}</Text>
                                    <Text style={styles.phonemeScore}>{Math.round(p.score)}%</Text>
                                </View>
                            );
                        })}
                    </View>
                )}
                {lastResult.transcription_heard && (
                    <Text style={styles.heardText}>Heard: "{lastResult.transcription_heard}"</Text>
                )}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                    <Text style={styles.primaryBtnText}>
                        {currentIndex + 1 >= assessmentWords.length ? 'View Report 🩺' : 'Next Word →'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderReport = () => {
        const svc = serviceRef.current;
        const flag = svc.getClinicalFlag();
        const flagColor = flag === 'High-Risk' ? DT.text.error : flag === 'Monitor' ? DT.accent.amber : DT.text.success;
        const flagIcon  = flag === 'High-Risk' ? '🔴' : flag === 'Monitor' ? '⚠️' : '✅';

        return (
            <ScrollView contentContainerStyle={styles.reportScroll}>
                <Text style={styles.reportTitle}>Clinical Report 🩺</Text>
                <Text style={styles.reportSubtitle}>Session: {svc.getSession().sessionId}</Text>

                {/* Flag Banner */}
                <View style={[styles.flagBanner, { borderColor: flagColor }]}>
                    <Text style={[styles.flagIcon]}>{flagIcon}</Text>
                    <View>
                        <Text style={[styles.flagTitle, { color: flagColor }]}>{flag}</Text>
                        <Text style={styles.flagSub}>Clinical Classification</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {[
                        { label: 'Avg Accuracy', value: `${svc.getAverageAccuracy()}%` },
                        { label: 'Intelligibility', value: `${svc.getIntelligibilityIndex()}%` },
                        { label: 'Tricky Words', value: `${svc.getTrickyWordAccuracy()}%` },
                    ].map((s, i) => (
                        <View key={i} style={styles.statCard}>
                            <Text style={styles.statValue}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Word-by-word */}
                <Text style={styles.sectionHeader}>Word Analysis</Text>
                {completedWords.map((w, i) => {
                    const color = w.accuracy >= 80 ? '#16a34a' : w.accuracy >= 50 ? '#d97706' : '#dc2626';
                    const icon  = w.accuracy >= 80 ? '✅' : w.accuracy >= 50 ? '⚠️' : '🔴';
                    return (
                        <View key={i} style={styles.wordRow}>
                            <Text style={styles.wordRowIcon}>{icon}</Text>
                            <View style={styles.wordRowInfo}>
                                <Text style={styles.wordRowWord}>{w.word}</Text>
                                <Text style={styles.wordRowDetail}>DDS {w.dds.toFixed(1)} · {w.level}{w.isTricky ? ' · Tricky' : ''}</Text>
                            </View>
                            <Text style={[styles.wordRowAcc, { color }]}>{Math.round(w.accuracy)}%</Text>
                        </View>
                    );
                })}

                {/* Phoneme Errors */}
                <Text style={styles.sectionHeader}>Weakest Sounds</Text>
                {svc.getPhonemeErrorMap().map((p, i) => (
                    <View key={i} style={styles.phonemeErrorRow}>
                        <View style={styles.phonemeBadge}><Text style={styles.phonemeBadgeText}>/{p.phoneme}/</Text></View>
                        <View style={styles.phonemeBarBg}>
                            <View style={[styles.phonemeBarFill, { width: `${p.avgScore}%`, backgroundColor: p.avgScore >= 60 ? DT.accent.amber : DT.text.error }]} />
                        </View>
                        <Text style={styles.phonemeAvg}>{p.avgScore}%</Text>
                    </View>
                ))}

                {/* Export */}
                <TouchableOpacity style={styles.exportBtn} onPress={handleShareReport}>
                    <Text style={styles.exportBtnText}>📤  Export for Specialist</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, marginBottom: 40 }]} onPress={() => navigation.goBack()}>
                    <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    // ─── Root Render ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <EmotionTracker moduleName="Clinical Assessment" isActive={true} />
            <LinearGradient colors={[DT.bg.sage, DT.bg.cream]} style={StyleSheet.absoluteFillObject} />

            {phase !== 'report' && <BackButton color={DT.accent.navy} />}

            {phase === 'intro'   && renderIntro()}
            {phase === 'listen'  && renderListen()}
            {phase === 'speak'   && renderSpeak()}
            {phase === 'result'  && renderResult()}
            {phase === 'report'  && renderReport()}
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:      { flex: 1 },
    centeredContent:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: 60 },
    phaseEmoji:     { fontSize: 64, marginBottom: 12 },
    phaseTitle:     { fontSize: 30, fontWeight: '900', color: DT.text.primary, marginBottom: 8, textAlign: 'center' },
    phaseSubtitle:  { fontSize: 16, color: DT.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
    bigWord:        { fontSize: 52, fontWeight: '900', color: DT.accent.navy, letterSpacing: 3, marginBottom: 8, fontFamily: 'OpenDyslexic-Regular', textAlign: 'center' },
    progressRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
    progressLabel:  { fontSize: 14, color: DT.text.muted, fontWeight: '700' },
    levelPill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    levelPillText:  { fontSize: 12, fontWeight: '700', color: DT.text.secondary },
    wordPillRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 },
    wordPill:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    wordPillText:   { fontSize: 13, fontWeight: '800' },
    primaryBtn:     { backgroundColor: DT.accent.navy, borderRadius: DT.radius.pill, paddingVertical: 16, paddingHorizontal: 36, ...DT.shadow.medium },
    primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    speakAgainBtn:  { backgroundColor: DT.bg.skyBlue, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 28 },
    speakAgainText: { fontSize: 16, color: DT.accent.navy, fontWeight: '700' },
    micArea:        { justifyContent: 'center', alignItems: 'center', width: 140, height: 140, marginVertical: 24 },
    pulseRing:      { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(46,74,122,0.12)' },
    micBtn:         { width: 100, height: 100, borderRadius: 50, backgroundColor: DT.accent.navy, justifyContent: 'center', alignItems: 'center', ...DT.shadow.medium },
    micBtnActive:   { backgroundColor: DT.text.error },
    micBtnDisabled: { backgroundColor: DT.text.muted },
    micIcon:        { fontSize: 40 },
    statusText:     { fontSize: 15, color: DT.text.secondary, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    resultIcon:     { fontSize: 56, marginBottom: 12 },
    scoreCircle:    { width: 160, height: 160, borderRadius: 80, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: DT.surface.card },
    scoreValue:     { fontSize: 38, fontWeight: '900' },
    scoreLabel:     { fontSize: 13, color: DT.text.muted, fontWeight: '700', textTransform: 'uppercase' },
    phonemeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
    phonemeBox:     { minWidth: 56, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, borderWidth: 2, backgroundColor: DT.surface.card, alignItems: 'center' },
    phonemeLetter:  { fontSize: 22, fontWeight: '800' },
    phonemeScore:   { fontSize: 11, color: DT.text.muted, fontWeight: '700' },
    heardText:      { fontSize: 15, color: DT.text.secondary, fontStyle: 'italic', marginBottom: 20 },
    // Report
    reportScroll:   { padding: 24, paddingTop: 60, paddingBottom: 40 },
    reportTitle:    { fontSize: 28, fontWeight: '900', color: DT.text.primary, marginBottom: 4 },
    reportSubtitle: { fontSize: 13, color: DT.text.muted, marginBottom: 24 },
    flagBanner:     { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 2, backgroundColor: DT.surface.card, marginBottom: 20, ...DT.shadow.soft },
    flagIcon:       { fontSize: 36 },
    flagTitle:      { fontSize: 22, fontWeight: '900' },
    flagSub:        { fontSize: 12, color: DT.text.muted, marginTop: 2 },
    statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard:       { flex: 1, backgroundColor: DT.surface.card, borderRadius: 14, padding: 14, alignItems: 'center', ...DT.shadow.soft },
    statValue:      { fontSize: 24, fontWeight: '900', color: DT.accent.navy },
    statLabel:      { fontSize: 11, color: DT.text.muted, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
    sectionHeader:  { fontSize: 14, fontWeight: '800', color: DT.text.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 8 },
    wordRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: DT.surface.card, borderRadius: 12, padding: 12, marginBottom: 8, ...DT.shadow.soft },
    wordRowIcon:    { fontSize: 18, marginRight: 12 },
    wordRowInfo:    { flex: 1 },
    wordRowWord:    { fontSize: 17, fontWeight: '800', color: DT.text.primary },
    wordRowDetail:  { fontSize: 12, color: DT.text.muted, marginTop: 2 },
    wordRowAcc:     { fontSize: 20, fontWeight: '900' },
    phonemeErrorRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    phonemeBadge:   { backgroundColor: DT.bg.lavender, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 48, alignItems: 'center' },
    phonemeBadgeText:{ fontWeight: '800', color: DT.accent.indigo, fontSize: 14 },
    phonemeBarBg:   { flex: 1, height: 8, backgroundColor: DT.surface.divider, borderRadius: 4, overflow: 'hidden' },
    phonemeBarFill: { height: '100%', borderRadius: 4 },
    phonemeAvg:     { fontSize: 13, fontWeight: '700', color: DT.text.secondary, minWidth: 36, textAlign: 'right' },
    exportBtn:      { backgroundColor: '#1E3A5F', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, ...DT.shadow.medium },
    exportBtnText:  { color: '#FFF', fontSize: 17, fontWeight: '800' },
});

export default ClinicalAssessmentScreen;
