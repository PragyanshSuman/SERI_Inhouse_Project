import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Alert, 
    Dimensions, 
    TouchableOpacity, 
    StatusBar, 
    Platform,
    ActivityIndicator
} from 'react-native';
import { audioEngine } from '../../phonics-phonemes/services/audio/AudioEngine';
import { WritingCanvas, Stroke } from '../components/WritingCanvas';
import { modelService } from '../services/ModelService';
import { 
    ALPHABET_INDICES, 
    getCharFromIndex, 
    rasterizeStrokes,
    flipHorizontal,
    flipVertical,
    rotate180 
} from '../utils/WritingUtils';
import EmotionTracker from '../../../components/EmotionTracker';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import { DT } from '../../../utils/DyslexiaTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_SIZE = SCREEN_WIDTH - 40;

const WritingAssessmentScreen = () => {
    const [targetChar, setTargetChar] = useState<string | null>(null);
    const [targetClassId, setTargetClassId] = useState<number | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [canvasKey, setCanvasKey] = useState(0); 
    const [result, setResult] = useState<string>('');
    const [confidence, setConfidence] = useState<number>(0);
    const [timing, setTiming] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [tourVisible, setTourVisible] = useState(false);
    
    // Stats
    const [stats, setStats] = useState({ total: 0, correct: 0 });

    useEffect(() => {
        modelService.loadModel();
        
        let interval: ReturnType<typeof setInterval>;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTiming(t => t + 0.1);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const startNewTest = () => {
        const randomIndex = Math.floor(Math.random() * ALPHABET_INDICES.length);
        const classId = ALPHABET_INDICES[randomIndex];
        const char = getCharFromIndex(classId);
        
        setTargetChar(char);
        setTargetClassId(classId);
        setStrokes([]);
        setCanvasKey(k => k + 1);
        setResult('');
        setConfidence(0);
        setTiming(0);
        setIsTimerRunning(true);
        
        speakPrompt(char);
    };

    const speakPrompt = (char: string) => {
        let text = `Write ${char}`;
        if (char.match(/[A-Z]/)) {
            text = `Write capital ${char}`;
        } else if (char.match(/[a-z]/)) {
            text = `Write small ${char}`;
        }
        audioEngine.speak(text, { language: 'en-GB', rate: 0.8 });
    };

    const checkAnswer = async () => {
        if (!strokes.length || targetClassId === null) return;
        
        setIsTimerRunning(false);
        const inputTensor = rasterizeStrokes(strokes, CANVAS_SIZE, CANVAS_SIZE);
        const predictions = await modelService.predict(inputTensor);
        
        if (!predictions) {
            Alert.alert("Error", "Model inference failed");
            return;
        }

        const maxProbIndex = predictions.indexOf(Math.max(...predictions));
        const conf = predictions[maxProbIndex];
        const predictedChar = getCharFromIndex(maxProbIndex);
        
        let isCorrect = (maxProbIndex === targetClassId);
        let feedbackDetails = "";
        
        if (!isCorrect) {
            const checkReversal = async (transform: (t: Float32Array) => Float32Array, name: string) => {
                const transformed = transform(inputTensor);
                const predT = await modelService.predict(transformed);
                if (predT) {
                    const maxT = predT.indexOf(Math.max(...predT));
                    if (maxT === targetClassId) return name;
                }
                return null;
            };
            
            const isMirror = await checkReversal(flipHorizontal, "Mirrored (Horizontal Flip)");
            if (isMirror) feedbackDetails = isMirror;
            else {
                const isUpsideDown = await checkReversal(flipVertical, "Upside Down (Vertical Flip)");
                if (isUpsideDown) feedbackDetails = isUpsideDown;
                else {
                    const isRotated = await checkReversal(rotate180, "Rotated 180°");
                    if (isRotated) feedbackDetails = isRotated;
                }
            }
        }
        
        setStats(prev => ({
            total: prev.total + 1,
            correct: prev.correct + (isCorrect ? 1 : 0)
        }));
        
        setResult(isCorrect ? "CORRECT!" : "INCORRECT");
        setConfidence(conf);
        
        let msg = isCorrect 
            ? `Good job! Time: ${timing.toFixed(1)}s` 
            : `Expected: ${targetChar}, Got: ${predictedChar}`;
            
        if (feedbackDetails) {
            msg += `\nWarning: ${feedbackDetails}`;
        }
        
        Alert.alert(isCorrect ? "Correct!" : "Try Again", msg);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <EmotionTracker moduleName="Writing Assessment" isActive={!tourVisible} />
            <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />
            <View style={styles.topNav}>
              <BackButton color={DT.accent.navy} />
              <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
            </View>

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Writing Challenge ✍️</Text>
                
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Tests</Text>
                        <Text style={styles.statValue}>{stats.total}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Correct</Text>
                        <Text style={[styles.statValue, { color: DT.text.success }]}>{stats.correct}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Accuracy</Text>
                        <Text style={styles.statValue}>{stats.total ? ((stats.correct/stats.total)*100).toFixed(0) : 0}%</Text>
                    </View>
                </View>

                <View style={styles.promptCard}>
                    <Text style={styles.promptSubtext}>Write the letter:</Text>
                    <Text style={styles.targetChar}>{targetChar || "?"}</Text>
                    <Text style={styles.timerText}>{timing.toFixed(1)}s</Text>
                </View>

                <View style={styles.canvasWrapper}>
                    <WritingCanvas 
                        key={canvasKey}
                        width={CANVAS_SIZE} 
                        height={CANVAS_SIZE} 
                        onStrokesChanged={setStrokes} 
                    />
                </View>
                
                <View style={styles.controlsGrid}>
                    <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={startNewTest}>
                        <Text style={styles.btnText}>New Test</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.btn, styles.btnBlue, (!targetChar || strokes.length === 0) && styles.btnDisabled]} 
                        onPress={checkAnswer}
                        disabled={!targetChar || strokes.length === 0}
                    >
                        <Text style={styles.btnText}>Check Answer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btn, styles.btnOrange]} onPress={() => setCanvasKey(k => k + 1)}>
                        <Text style={styles.btnText}>Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btn, styles.btnPurple]} onPress={() => targetChar && speakPrompt(targetChar)}>
                        <Text style={styles.btnText}>Replay Audio</Text>
                    </TouchableOpacity>
                </View>

                {result ? (
                    <View style={styles.resultCard}>
                        <Text style={[styles.resultTitle, result === "CORRECT!" ? { color: DT.text.success } : { color: DT.text.error }]}>
                            {result}
                        </Text>
                        <Text style={styles.confidenceText}>Model Confidence: {(confidence * 100).toFixed(1)}%</Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: DT.bg.cream,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    container: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: DT.typography.weightHeavy,
        color: DT.text.primary,
        fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
        marginBottom: 24,
        textAlign: 'center',
    },
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: DT.surface.card,
        borderRadius: DT.radius.lg,
        padding: 16,
        marginBottom: 20,
        ...DT.shadow.soft,
        borderWidth: 1,
        borderColor: DT.surface.cardBorder,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: DT.text.muted,
        fontWeight: DT.typography.weightBold,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 20,
        fontWeight: DT.typography.weightHeavy,
        color: DT.text.primary,
    },
    promptCard: {
        backgroundColor: DT.bg.sage,
        width: '100%',
        borderRadius: DT.radius.xl,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        ...DT.shadow.soft,
    },
    promptSubtext: {
        fontSize: 16,
        color: DT.text.secondary,
        fontWeight: DT.typography.weightMedium,
    },
    targetChar: {
        fontSize: 72,
        fontWeight: DT.typography.weightHeavy,
        color: DT.accent.navy,
        marginVertical: 4,
    },
    timerText: {
        fontSize: 14,
        color: DT.text.muted,
        fontWeight: DT.typography.weightBold,
    },
    canvasWrapper: {
        borderRadius: DT.radius.lg,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: DT.surface.cardBorder,
        backgroundColor: DT.surface.card,
        ...DT.shadow.medium,
    },
    controlsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
        marginTop: 24,
    },
    btn: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 16,
        borderRadius: DT.radius.md,
        alignItems: 'center',
        ...DT.shadow.soft,
    },
    btnText: {
        color: DT.text.onDark,
        fontWeight: DT.typography.weightBold,
        fontSize: 15,
    },
    btnGreen: { backgroundColor: DT.text.success },
    btnBlue: { backgroundColor: DT.accent.sky },
    btnOrange: { backgroundColor: DT.accent.amber },
    btnPurple: { backgroundColor: DT.accent.indigo },
    btnDisabled: { backgroundColor: DT.bg.stone, opacity: 0.5 },
    resultCard: {
        marginTop: 32,
        width: '100%',
        backgroundColor: DT.surface.card,
        borderRadius: DT.radius.lg,
        padding: 20,
        alignItems: 'center',
        ...DT.shadow.soft,
        borderWidth: 1,
        borderColor: DT.surface.cardBorder,
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: DT.typography.weightHeavy,
        marginBottom: 4,
    },
    confidenceText: {
        fontSize: 14,
        color: DT.text.muted,
        fontWeight: DT.typography.weightMedium,
    },
});

export default WritingAssessmentScreen;
