import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSettings } from '../../../context/SettingsContext';
import { DifficultyLevel } from '../../../data/sightWords';
import { generateRound, FlyingWord } from '../utils/WordGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { getTranslation } from '../../../utils/Translations';

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
    const [lives, setLives] = useState(MAX_LIVES);
    const [roundTarget, setRoundTarget] = useState<string>('');
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
    
    // Rendering State
    const [renderWords, setRenderWords] = useState<GameWord[]>([]);
    const [renderParticles, setRenderParticles] = useState<Particle[]>([]);
    const [slicePath, setSlicePath] = useState<string>('');

    const [tourVisible, setTourVisible] = useState(true);

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
    }>({ words: [], particles: [], isPlaying: !tourVisible, lastTime: 0 });

    const frameId = useRef<number>(0);
    const points = useRef<{x: number, y: number}[]>([]);
    const timerRef = useRef<any[]>([]);

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
        // In a real app, use expo-av for SFX. Using Speech for placeholders or just skip
        if (type === 'correct') Speech.speak('Nice!', { pitch: 1.5, rate: 1.5 });
        if (type === 'wrong') Speech.speak('Oops!', { pitch: 0.8, rate: 1.5 });
        if (type === 'win') Speech.speak('Level Complete!', { pitch: 1.2 });
    };

    const speakTarget = (word: string) => {
        if (settings.enableSound && word) {
            Speech.stop();
            Speech.speak(`Find... ${word}`, { language: 'en-US', rate: 0.9 });
        }
    };

    // --- Game Lifecycle ---

    useEffect(() => {
        startGame();
        return () => {
             cancelAnimationFrame(frameId.current);
             Speech.stop();
             timerRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

    const startGame = () => {
        setScore(0);
        setWordsFound(0);
        setLives(MAX_LIVES);
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
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = Math.random() * 5 + 2;
            loopRef.current.particles.push({
                id: Math.random().toString(),
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 10 + 5
            });
        }
    };

    const checkCollision = (x: number, y: number) => {
        const hitRadius = 50;
        const hitIndex = loopRef.current.words.findIndex(w => {
            const cx = w.x + 40; // Approx center
            const cy = w.y + 20; 
            return Math.hypot(x - cx, y - cy) < hitRadius;
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
                // Wrong
                setLives(l => {
                    const newLives = l - 1;
                    if (newLives <= 0) endGame('lost');
                    return newLives;
                });
                playSound('wrong');
                // Push word away hard
                hitWord.velocity.x = (hitWord.x - x) * 0.5;
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
            {/* Header / HUD */}
            <View style={styles.header}>
                <View style={styles.livesContainer}>
                    {Array.from({ length: MAX_LIVES }).map((_, i) => (
                        <Text key={i} style={[styles.heart, { opacity: i < lives ? 1 : 0.2 }]}>
                            ❤️
                        </Text>
                    ))}
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
                 {/* Particles */}
                 {renderParticles.map(p => (
                     <Circle key={p.id} cx={p.x} cy={p.y} r={p.size} fill={p.color} opacity={p.life} />
                 ))}
                 {/* Slice Trail */}
                 <Path d={slicePath} stroke="#00FFFF" strokeWidth="6" strokeLinecap="round" fill="none" />
            </Svg>

            {/* Modals */}
            <Modal visible={gameState !== 'playing'} transparent animationType="fade">
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
                    loopRef.current.isPlaying = true; // Start game loop after tour
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
        backgroundColor: '#0F172A', // Deep Dojo Blue
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
        fontSize: 32,
        color: '#FBBF24', // Gold
        fontWeight: 'bold',
        fontFamily: 'OpenDyslexic-Regular',
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
        fontFamily: 'OpenDyslexic-Regular',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '80%',
        backgroundColor: '#1E293B',
        padding: 30,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4ADE80',
        elevation: 20,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: 'OpenDyslexic-Regular',
    },
    modalSub: {
        fontSize: 18,
        color: '#94A3B8',
        marginBottom: 30,
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
        backgroundColor: '#4ADE80',
    },
    btnSec: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: '#94A3B8',
    },
    btnTextPri: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    btnTextSec: {
        color: '#FFF',
        fontSize: 16,
    }
});

export default WordNinjaGameScreen;
