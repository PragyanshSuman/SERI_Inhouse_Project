import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Modal, Animated, Easing, Platform } from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { audioEngine } from '../../phonics-phonemes/services/audio/AudioEngine';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLanguage, useSettings } from '../../../context/SettingsContext';
import { DifficultyLevel } from '../../../data/sightWords';
import { generateRound, FlyingWord } from '../utils/WordGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { recordSightWords } from '../../learning-path/services/PathProgressBridge';
import { DT } from '../../../utils/DyslexiaTheme';

const { width, height } = Dimensions.get('window');

// Game Constants
const TARGET_WINS = 5;
const MAX_LIVES = 3;

interface GameWord extends FlyingWord {
    x: number;
    y: number;
    baseY: number; // For bobbing
    bobOffset: number; 
    rotation: number;
}

interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number; // 0 to 1
    color: string;
    size: number;
}

const WordNinjaGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { levelId } = route.params as { levelId: DifficultyLevel };
    const { settings } = useSettings();
    
    // Game State
    const [score, setScore] = useState(0);
    const [wordsFound, setWordsFound] = useState(0);
    const [roundTarget, setRoundTarget] = useState<string>('');
    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting');
    
    // Rendering State
    const [renderWords, setRenderWords] = useState<GameWord[]>([]);
    const [renderParticles, setRenderParticles] = useState<Particle[]>([]);
    const [slicePath, setSlicePath] = useState<string>('');

    const [tourVisible, setTourVisible] = useState(false);

    const tourSteps: TourStep[] = [
        {
            title: getTranslation(settings.language, 'tour_ninja_welcome_title'),
            description: getTranslation(settings.language, 'tour_ninja_welcome_desc'),
            position: 'center',
            arrowPosition: 'bottom',
        },
        {
            title: getTranslation(settings.language, 'tour_ninja_slice_title'),
            description: getTranslation(settings.language, 'tour_ninja_slice_desc'),
            position: 'center',
            arrowPosition: 'bottom',
        },
        {
            title: getTranslation(settings.language, 'tour_ninja_lives_title'),
            description: getTranslation(settings.language, 'tour_ninja_lives_desc'),
            position: 'top',
            arrowPosition: 'top',
            style: { top: 100, left: 20 },
        }
    ];

    // Refs for Loop
    const loopRef = useRef<{
        words: GameWord[];
        particles: Particle[];
        isPlaying: boolean;
        lastTime: number;
    }>({ words: [], particles: [], isPlaying: true, lastTime: 0 });

    const frameId = useRef<number>(0);
    const points = useRef<{x: number, y: number}[]>([]);
    const timerRef = useRef<any[]>([]);
    const lastHitTime = useRef<{[key: string]: number}>({});

    const startTimer = (callback: () => void, delay: number) => {
        const id = setTimeout(() => {
            callback();
            timerRef.current = timerRef.current.filter(t => t !== id);
        }, delay);
        timerRef.current.push(id);
    };

    // Audio Helper
    const playSound = (type: 'correct' | 'wrong' | 'win' | 'intro') => {
        if (!settings.enableSound) return;
        
        if (type === 'correct') audioEngine.speak('Nice!', { pitch: 1.5, rate: 1.5 });
        if (type === 'wrong') audioEngine.speak('Oops!', { pitch: 0.8, rate: 1.5 });
        if (type === 'win') audioEngine.speak('Level Complete!', { pitch: 1.2 });
    };

    const speakTarget = (word: string) => {
        if (settings.enableSound && word) {
            audioEngine.speak(`Find... ${word}`, { rate: 0.9 });
        }
    };

    useEffect(() => {
        // Do NOT auto-start. Let user press Start to prepare themselves.
        return () => {
             cancelAnimationFrame(frameId.current);
             audioEngine.stop();
             timerRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

    const startTime = useRef<number>(Date.now());

    const startGame = () => {
        startTime.current = Date.now();
        setScore(0);
        setWordsFound(0);
        setGameState('playing');
        loopRef.current.particles = [];
        loopRef.current.words = [];
        startRound();

        loopRef.current.isPlaying = true;
        loopRef.current.lastTime = Date.now();
        loop();
    };


    const startRound = () => {
        const newRound = generateRound(levelId, width, height);
        setRoundTarget(newRound.targetWord);
        speakTarget(newRound.targetWord);

        // Add new words to existing (or clear? Let's clear for cleaner rounds)
        // Actually, "Continuous" flow is better for Ninja. 
        // But we need to ensure the TARGET is on screen.
        
        const newGameWords: GameWord[] = newRound.flyingWords.map(w => ({
            ...w,
            x: w.startPos.x,
            y: w.startPos.y,
            baseY: w.startPos.y,
            bobOffset: Math.random() * Math.PI * 2,
            rotation: (Math.random() - 0.5) * 0.5 // Slight rotation speed
        }));

        loopRef.current.words = newGameWords;
    };

    const nextRound = () => {
        if (wordsFound >= TARGET_WINS) {
            endGame('won');
            return;
        }
        startRound();
    };

    const endGame = (result: 'won' | 'lost') => {
        loopRef.current.isPlaying = false;
        setGameState(result);
        playSound(result === 'won' ? 'win' : 'wrong');

        // ── PathProgressBridge: record this session ───────────────────────
        const durationSecs = Math.round((Date.now() - startTime.current) / 1000);
        recordSightWords(
          score,
          wordsFound,
          TARGET_WINS,
          levelId,
          durationSecs
        );
    };

    // --- Game Loop ---

    const loop = () => {
        if (!loopRef.current.isPlaying) return;

        const now = Date.now();
        const dt = (now - loopRef.current.lastTime) / 16;
        loopRef.current.lastTime = now;
        const timeSec = now / 1000;

        // 1. Update Words
        const activeWords = loopRef.current.words.map(w => {
            // Move
            w.x += w.velocity.x * dt;
            // Bobbing effect
            w.y = w.baseY + Math.sin(timeSec * 3 + w.bobOffset) * 30; // 30px bob
            w.baseY += w.velocity.y * dt;
            
            // Rotate
            // w.rotation += 0.01; // Can add rot if we render it

            return w;
        }).filter(w => 
            w.x > -200 && w.x < width + 200 && w.baseY > -200 && w.baseY < height + 200
        );

        // 2. Update Particles
        const activeParticles = loopRef.current.particles.map(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt + (0.2 * dt); // Gravity
            p.life -= 0.02 * dt; // Fade out
            return p;
        }).filter(p => p.life > 0);

        loopRef.current.words = activeWords;
        loopRef.current.particles = activeParticles;

        // Autosent next round if empty
        if (activeWords.length === 0 && loopRef.current.isPlaying) {
             // If target wasn't found, should we penalty? 
             // For k-2, maybe just respawn.
             startRound();
        }

        // Render
        setRenderWords([...activeWords]);
        setRenderParticles([...activeParticles]);

        frameId.current = requestAnimationFrame(loop);
    };

    // --- Logic ---

    const spawnExplosion = (x: number, y: number, color: string) => {
        // Particles removed for Zen reading mode (less visual clutter)
    };

    const checkCollision = (x: number, y: number) => {
        const now = Date.now();
        const hitIndex = loopRef.current.words.findIndex(w => {
            // Calculate accurate rectangular bounding box dynamically
            const approxWidth = w.text.length * 22 + 48; // 22px per char + 48px padding
            const approxHeight = 85; // 34px font + 24px padding + borders
            
            // Forgiveness padding for Dyslexic tracing (loose tracing)
            const padding = 30; 
            
            const isHit = x >= (w.x - padding) && 
                          x <= (w.x + approxWidth + padding) && 
                          y >= (w.y - padding) && 
                          y <= (w.y + approxHeight + padding);
            
            // Hit throttling: Don't hit the same word more than once every 500ms
            if (isHit) {
                const lastHit = lastHitTime.current[w.id] || 0;
                if (now - lastHit < 500) return false;
                lastHitTime.current[w.id] = now;
                return true;
            }
            return false;
        });

        if (hitIndex !== -1) {
            const hitWord = loopRef.current.words[hitIndex];
            
            // Spawn particles regardless
            spawnExplosion(x, y, hitWord.isCorrect ? '#4ADE80' : '#F87171');

            if (hitWord.isCorrect) {
                 // Correct
                 setScore(s => s + 100);
                 setWordsFound(prev => {
                     const newVal = prev + 1;
                     if (newVal >= TARGET_WINS) {
                         // Win triggered in next cycle or effectively here
                         startTimer(() => endGame('won'), 500); 
                         return newVal;
                     }
                     startTimer(nextRound, 800); // Delay for effect
                     return newVal;
                 });
                 playSound('correct');
                 loopRef.current.words.splice(hitIndex, 1); // Remove immediate

            } else {
                // Wrong: No penalty, just spoken correction
                if (settings.enableSound) {
                    audioEngine.speak(hitWord.text, { rate: 0.85 });
                }
                // Push word away hard
                hitWord.velocity.x = (hitWord.x - x) * 0.8;
                hitWord.velocity.y = (hitWord.y - y) * 0.5;
            }
        }
    };

    // --- Input ---

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                points.current = [{ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY }];
            },
            onPanResponderMove: (evt) => {
                const { pageX, pageY } = evt.nativeEvent;
                points.current.push({ x: pageX, y: pageY });
                if (points.current.length > 8) points.current.shift();
                
                const path = points.current.reduce((acc, p, i) => 
                    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
                setSlicePath(path);

                checkCollision(pageX, pageY);
            },
            onPanResponderRelease: () => {
                setSlicePath('');
                points.current = [];
            }
        })
    ).current;

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <EmotionTracker moduleName="Word Ninja" isActive={!tourVisible} />
            <BackButton color="#4ADE80" />
            <InfoButton onPress={() => {
                loopRef.current.isPlaying = false;
                setTourVisible(true);
            }} color="#4ADE80" />
            {/* Header / HUD */}
            <View style={styles.header}>
                <View style={styles.livesContainer}>
                    {/* Lives removed for Stress-Free Mode */}
                </View>
                <Text style={styles.score}>{score}</Text>
                
                <TouchableOpacity onPress={() => speakTarget(roundTarget)} style={styles.speakerBtn}>
                    <Text style={styles.speakerIcon}>🔊</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{getTranslation(settings.language, 'game_ninja_progress').replace('{current}', wordsFound.toString()).replace('{total}', TARGET_WINS.toString())}</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(wordsFound / TARGET_WINS) * 100}%` }]} />
                </View>
            </View>

            {/* Target Display */}
            <Text style={styles.targetText}>{getTranslation(settings.language, 'game_ninja_find_target').replace('{word}', roundTarget)}</Text>

            {/* Game Layer */}
            {renderWords.map(w => (
                <View key={w.id} style={[styles.wordBubble, { left: w.x, top: w.y }]}>
                    <Text style={styles.wordText}>{w.text}</Text>
                </View>
            ))}

            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                 {/* Slice Trail */}
                 <Path d={slicePath} stroke={DT.accent.navy} strokeWidth="6" strokeLinecap="round" fill="none" />
            </Svg>

            {gameState === 'waiting' && (
                <View style={styles.startOverlay}>
                    <Text style={styles.startTitle}>Zen Words</Text>
                    <Text style={styles.startSub}>Pop the correct balloons gently!</Text>
                    <TouchableOpacity style={styles.startHeroBtn} onPress={startGame}>
                        <Text style={styles.startHeroText}>START 🚀</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals */}
            <Modal visible={gameState === 'won' || gameState === 'lost'} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {gameState === 'won' ? getTranslation(settings.language, 'game_ninja_won_title') : getTranslation(settings.language, 'game_ninja_lost_title')}
                        </Text>
                        <Text style={styles.modalSub}>
                            {gameState === 'won' ? getTranslation(settings.language, 'game_ninja_won_desc').replace('{score}', score.toString()) : getTranslation(settings.language, 'game_ninja_lost_desc')}
                        </Text>
                        
                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btn, styles.btnSec]}>
                                <Text style={styles.btnTextSec}>{getTranslation(settings.language, 'game_ninja_btn_levels')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={startGame} style={[styles.btn, styles.btnPri]}>
                                <Text style={styles.btnTextPri}>
                                    {gameState === 'won' ? getTranslation(settings.language, 'game_ninja_btn_play_again') : getTranslation(settings.language, 'game_ninja_btn_retry')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <FeatureTour
                visible={tourVisible}
                steps={tourSteps}
                onComplete={() => {
                    setTourVisible(false);
                    loopRef.current.isPlaying = true; // Resume game loop
                    loop();
                }}
                onSkip={() => {
                    setTourVisible(false);
                    loopRef.current.isPlaying = true;
                    loop();
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DT.bg.cream, 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
    },
    livesContainer: {
        flexDirection: 'row',
        gap: 5,
    },
    heart: {
        fontSize: 24,
    },
    score: {
        fontSize: 36,
        color: DT.accent.navy,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Regular',
    },
    speakerBtn: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 50,
    },
    speakerIcon: {
        fontSize: 24,
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: -10,
        marginBottom: 10,
    },
    progressText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    progressBar: {
        width: 200,
        height: 6,
        backgroundColor: '#334155',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4ADE80',
    },
    targetText: {
        fontSize: 36,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'OpenDyslexic-Regular',
        textTransform: 'uppercase',
        letterSpacing: 3,
        textShadowColor: 'cyan',
        textShadowRadius: 10,
    },
    wordBubble: {
        position: 'absolute',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#F8FAFC',
        borderRadius: 50,
        elevation: 8,
        shadowColor: 'cyan',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    wordText: {
        fontSize: 34,
        fontWeight: 'bold',
        color: DT.text.primary,
        fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Regular',
        letterSpacing: 2,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '80%',
        backgroundColor: DT.surface.card,
        padding: 40,
        borderRadius: DT.radius.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: DT.accent.navy,
        ...DT.shadow.medium,
    },
    modalTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: DT.accent.navy,
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Regular',
    },
    modalSub: {
        fontSize: 20,
        color: DT.text.secondary,
        marginBottom: 40,
        textAlign: 'center',
    },
    modalBtns: {
        flexDirection: 'row',
        gap: 20,
    },
    btn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 15,
        minWidth: 100,
        alignItems: 'center',
    },
    btnPri: {
        backgroundColor: DT.accent.navy,
        ...DT.shadow.soft
    },
    btnSec: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: DT.accent.navy,
    },
    btnTextPri: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    btnTextSec: {
        color: DT.accent.navy,
        fontWeight: 'bold',
        fontSize: 18,
    },
    startOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    startTitle: {
        fontSize: 48,
        fontWeight: '900',
        color: DT.accent.navy,
        fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Regular',
        marginBottom: 8,
    },
    startSub: {
        fontSize: 20,
        color: DT.text.secondary,
        marginBottom: 40,
    },
    startHeroBtn: {
        backgroundColor: DT.accent.indigo,
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: DT.radius.pill,
        ...DT.shadow.medium,
    },
    startHeroText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
    }
});

export default WordNinjaGameScreen;
