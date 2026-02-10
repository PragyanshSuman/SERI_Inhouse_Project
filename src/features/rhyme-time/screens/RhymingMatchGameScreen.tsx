import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../context/SettingsContext';
import { RhymeWord } from '../data/rhymeData';
import { generateMatchRound, MatchRound } from '../utils/RhymeGenerator';
import Svg, { Circle } from 'react-native-svg';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { getTranslation } from '../../../utils/Translations';

const { width, height } = Dimensions.get('window');

// --- Types ---
interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

const RhymingMatchGameScreen = () => {
    const navigation = useNavigation<any>();
    const { settings } = useSettings();
    
    // Game State
    const [round, setRound] = useState<MatchRound | null>(null);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
    
    // Animations
    const mascotScale = useRef(new Animated.Value(1)).current;
    const mascotRotate = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
    const bgPulse = useRef(new Animated.Value(0)).current;

    // Particles
    const [particles, setParticles] = useState<Particle[]>([]);
    const frameId = useRef<number>(0);

    const [tourVisible, setTourVisible] = useState(true);

    const tourSteps: TourStep[] = [
        {
            title: getTranslation(settings.language, 'tour_rhyme_welcome_title'),
            description: getTranslation(settings.language, 'tour_rhyme_welcome_desc'),
            position: 'center',
            arrowPosition: 'bottom',
        },
        {
            title: getTranslation(settings.language, 'tour_rhyme_listen_title'),
            description: getTranslation(settings.language, 'tour_rhyme_listen_desc'),
            position: 'center',
            arrowPosition: 'bottom', // Pointing generally at cards
            style: { top: height * 0.6 }
        },
        {
            title: getTranslation(settings.language, 'tour_rhyme_match_title'),
            description: getTranslation(settings.language, 'tour_rhyme_match_desc'),
            position: 'top',
            arrowPosition: 'top',
            style: { top: height * 0.25, alignSelf: 'center' } // Pointing to prompt
        }
    ];

    // --- Lifecycle ---

    useEffect(() => {
        startNewRound(true);
        startBeat();
        loop();
        return () => {
            cancelAnimationFrame(frameId.current);
            Speech.stop();
        };
    }, []);

    // --- Game Logic ---

    const startBeat = () => {
        // Idle Animation Loop (Heartbeat / DJ Bob)
        Animated.loop(
            Animated.sequence([
                Animated.timing(mascotScale, { toValue: 1.1, duration: 400, useNativeDriver: true, easing: Easing.bounce }),
                Animated.timing(mascotScale, { toValue: 1.0, duration: 400, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(bgPulse, { toValue: 1, duration: 2000, useNativeDriver: false }), // Color interpolator needs no native driver? Layout/Color usually fine
                Animated.timing(bgPulse, { toValue: 0, duration: 2000, useNativeDriver: false }),
            ])
        ).start();
    };

    const startNewRound = (first = false) => {
        const newRound = generateMatchRound();
        setRound(newRound);
        setFeedback('none');
        
        // Reset Card Animations
        cardAnims.forEach(a => a.setValue(0));
        
        // Intro Animation
        Animated.stagger(200, cardAnims.map(anim => 
            Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 })
        )).start();
        
        // Removed auto-speech to prevent "voices out of nowhere"
    };

    const handleOptionPress = (option: RhymeWord, index: number, px: number, py: number) => {
        if (feedback !== 'none') return;

        speak(option.word);

        if (option.id === round?.correctOptionId) {
            // Correct
            setFeedback('correct');
            const newCombo = combo + 1;
            setCombo(newCombo);
            setScore(s => s + (10 * newCombo));
            
            spawnConfetti(px, py);
            
            // Mascot Reaction
            Animated.sequence([
                Animated.timing(mascotRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(mascotRotate, { toValue: 0, useNativeDriver: true })
            ]).start();

            // Sfx only (no speech) or minimal pleasant ping? 
            // For now, silence the "You're on fire" speech.
            
            setTimeout(() => startNewRound(), 1500);
        } else {
            // Wrong
            setFeedback('wrong');
            setCombo(0);
            // Silence the "Scratch that" speech.
            
            // Shake Card
            Animated.sequence([
                Animated.timing(cardAnims[index], { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(cardAnims[index], { toValue: 0.9, duration: 100, useNativeDriver: true }),
                Animated.timing(cardAnims[index], { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
            
            setTimeout(() => setFeedback('none'), 1000);
        }
    };

    const speak = (text: string) => {
        if (settings.enableSound) {
            Speech.stop();
            Speech.speak(text, { language: 'en-US', rate: 1.0 });
        }
    };

    // --- Particles ---
    const spawnConfetti = (x: number, y: number) => {
        const count = 20;
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 5;
            newParticles.push({
                id: Math.random().toString(),
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: ['#F472B6', '#4ADE80', '#FCD34D', '#60A5FA'][Math.floor(Math.random()*4)],
                size: Math.random() * 8 + 4
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    };

    const loop = () => {
        setParticles(prev => {
            return prev.map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy + 0.5, // Gravity
                life: p.life - 0.02
            })).filter(p => p.life > 0);
        });
        frameId.current = requestAnimationFrame(loop);
    };

    const spin = mascotRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const bgInterp = bgPulse.interpolate({
        inputRange: [0, 1],
        outputRange: ['#4F46E5', '#4338CA'] // Pulse between blues
    });
    
    // Since LinearGradient doesn't support Animated.View correctly for colors prop easily without wrapper
    // We'll just animate opacity of a second layer or use simple view for pulsing
    
    if (!round) return <View style={styles.container} />;

    return (
        <View style={styles.container}>
            {/* Dynamic Background */}
            <LinearGradient colors={['#312E81', '#1E1B4B']} style={StyleSheet.absoluteFill} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreTitle}>{getTranslation(settings.language, 'game_score_hype')}</Text>
                    <Text style={styles.score}>{score}</Text>
                </View>
                {combo > 1 && (
                    <View style={styles.comboBadge}>
                        <Text style={styles.comboText}>{combo}x {getTranslation(settings.language, 'game_combo_text')}</Text>
                    </View>
                )}
            </View>

            {/* Stage */}
            <View style={styles.stage}>
                {/* Spotlight */}
                <View style={styles.spotlight} />
                
                {/* MC Frog */}
                <Animated.View style={[styles.mascotContainer, { transform: [{ scale: mascotScale }, { rotate: spin }] }]}>
                    <Text style={styles.mascot}>🐸</Text>
                    <Text style={styles.mascotLabel}>{getTranslation(settings.language, 'game_mascot_frog')}</Text>
                </Animated.View>

                {/* Target Word */}
                <TouchableOpacity 
                    style={styles.promptBubble} 
                    onPress={() => speak(round.target.word)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.promptText}>{getTranslation(settings.language, 'game_rhyme_prompt').replace('{word}', round.target.word)}</Text>
                    <Text style={styles.targetEmoji}>{round.target.image}</Text>
                    <Text style={styles.tapHint}>{getTranslation(settings.language, 'game_tap_hint')}</Text>
                </TouchableOpacity>
            </View>

            {/* Deck / Options */}
            <View style={styles.deck}>
                {round.options.map((option, index) => {
                    const isCorrect = option.id === round.correctOptionId;
                    const anim = cardAnims[index];
                    
                    return (
                        <Animated.View 
                            key={index}
                            style={[
                                styles.cardWrapper,
                                { 
                                    transform: [
                                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) },
                                        { scale: anim }
                                    ]
                                } 
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.card,
                                    feedback === 'correct' && isCorrect && styles.cardCorrect,
                                    feedback === 'wrong' && !isCorrect && isCorrect && styles.cardHint, // Hint correct one on wrong
                                ]}
                                onPress={(e) => handleOptionPress(option, index, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.cardEmoji}>{option.image}</Text>
                                <Text style={styles.cardLabel}>{option.word}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Particles Layer */}
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                 {particles.map(p => (
                     <Circle key={p.id} cx={p.x} cy={p.y} r={p.size} fill={p.color} opacity={p.life} />
                 ))}
            </Svg>

            <FeatureTour
                visible={tourVisible}
                steps={tourSteps}
                onComplete={() => setTourVisible(false)}
                onSkip={() => setTourVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
        zIndex: 10,
    },
    backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    backText: { color: '#FFF', fontSize: 24 },
    scoreContainer: { alignItems: 'center' },
    scoreTitle: { color: '#818CF8', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
    score: { color: '#FFF', fontSize: 24, fontWeight: 'bold', fontFamily: 'OpenDyslexic-Regular' },
    comboBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, transform: [{rotate: '-5deg'}] },
    comboText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

    stage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    spotlight: {
        position: 'absolute',
        width: 300,
        height: 300,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 150,
        top: -50,
    },
    mascotContainer: { alignItems: 'center', marginBottom: 20 },
    mascot: { fontSize: 80 },
    mascotLabel: { color: '#818CF8', fontWeight: 'bold', marginTop: 5, backgroundColor: '#1E1B4B', paddingHorizontal: 8, borderRadius: 4 },
    
    promptBubble: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        minWidth: 200,
    },
    promptText: { fontSize: 18, color: '#333', marginBottom: 5, fontFamily: 'OpenDyslexic-Regular' },
    targetEmoji: { fontSize: 50 },
    tapHint: { fontSize: 10, color: '#666', marginTop: 5 },

    deck: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        paddingBottom: 50,
        paddingHorizontal: 10,
    },
    cardWrapper: { flex: 1, maxWidth: 110, aspectRatio: 0.8 },
    card: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardCorrect: {
        backgroundColor: '#4ADE80',
        borderColor: '#FFF',
    },
    cardHint: {
         borderColor: '#FCD34D',
         borderWidth: 2,
         borderStyle: 'dashed',
    },
    cardEmoji: { fontSize: 40 },
    cardLabel: { fontSize: 18, color: '#FFF', marginTop: 10, fontWeight: 'bold', fontFamily: 'OpenDyslexic-Regular' },
});

export default RhymingMatchGameScreen;


