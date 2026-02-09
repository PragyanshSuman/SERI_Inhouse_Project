import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Animated, PanResponder, Easing } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { useLanguage } from '../../../context/SettingsContext'; // Backward compat
import { useSettings } from '../../../context/SettingsContext'; // New hook
import { getTranslation } from '../../../utils/Translations';
import { LinearGradient } from 'expo-linear-gradient';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

type GameScreenRouteProp = RouteProp<RootStackParamList, 'OddOneOutGame'>;

const Particle = ({ index, isActive }: { index: number, isActive: boolean }) => {
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (isActive) {
            anim.setValue(0);
            Animated.timing(anim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true
            }).start();
        }
    }, [isActive]);

    if (!isActive) return null;

    const angle = (index * 36) * (Math.PI / 180);
    const distance = 150; 
    
    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(angle) * distance]
    });
    
    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(angle) * distance]
    });
    
    const opacity = anim.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [1, 1, 0]
    });

    const scale = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1.2, 0]
    });

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${Math.random() * 360}deg`]
    });

    const color = ['#FCD34D', '#F472B6', '#60A5FA', '#34D399', '#A78BFA'][index % 5];

    return (
        <Animated.View style={[
            styles.particle,
            { backgroundColor: color },
            {
                opacity,
                transform: [
                    { translateX },
                    { translateY },
                    { scale },
                    { rotate }
                ]
            }
        ]} />
    );
};

// Enhanced Monster Component
const Monster = ({ 
    label, 
    color, 
    mouthState,
    dragX,
    dragY,
    isActive,
    variant, // 'horns' | 'ears'
    enableAnimations = true,
    enableSound = true
}: { 
    label: string, 
    color: string, 
    mouthState: 'idle' | 'open' | 'eating',
    dragX: Animated.Value,
    dragY: Animated.Value,
    isActive: boolean,
    variant: 'horns' | 'ears',
    enableAnimations: boolean,
    enableSound: boolean
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;
    
    // Breathing Animation
    useEffect(() => {
        if (!enableAnimations) return; // Skip if disabled

        const breathe = Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.03, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
            ])
        );
        breathe.start();
        return () => breathe.stop();
    }, [enableAnimations]);

    // Reaction Animation
    useEffect(() => {
        if (!enableAnimations) return;

        if (mouthState === 'open') {
            Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true }).start();
            playSound('hum'); // Anticipation sound
        } else if (mouthState === 'eating') {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
            playSound('munch'); // Eating sound
        } else {
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [mouthState, enableAnimations]);

    // Eye Tracking - Conditionally Apply
    const eyeX = enableAnimations ? dragX.interpolate({
        inputRange: [-width/2, width/2], 
        outputRange: [-10, 10], 
        extrapolate: 'clamp'
    }) : 0;

    const eyeY = enableAnimations ? dragY.interpolate({
        inputRange: [-height/2, height/2],
        outputRange: [-10, 10],
        extrapolate: 'clamp'
    }) : 0;
    
    // Play Sound Helper
    const playSound = async (type: 'hum' | 'munch') => {
        if (!enableSound) return;
        // Simple rate limiting or state check could be added here
        if (type === 'munch') Speech.speak("Yum!", { pitch: variant === 'horns' ? 0.8 : 1.2, rate: 1.2 });
        // Removed hum for now to reduce noise
    };

    return (
        <Animated.View style={[styles.monsterContainer, { transform: [{ scale: Animated.multiply(scaleAnim, breatheAnim) }] }]}>
            
            {/* Accessories */}
            {variant === 'horns' && (
                <>
                    <View style={[styles.horn, styles.hornLeft, { borderBottomColor: color }]} />
                    <View style={[styles.horn, styles.hornRight, { borderBottomColor: color }]} />
                </>
            )}
            {variant === 'ears' && (
                <>
                    <View style={[styles.ear, styles.earLeft, { backgroundColor: color }]} />
                    <View style={[styles.ear, styles.earRight, { backgroundColor: color }]} />
                </>
            )}

            <View style={[styles.monsterBody, { backgroundColor: color }]}>
                {/* Visual Label */}
                <View style={[styles.badge, { borderColor: color }]}>
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                </View>
                
                {/* Eyes */}
                <View style={styles.eyedContainer}>
                     <View style={styles.eye}>
                        <Animated.View style={[styles.pupil, { transform: [{ translateX: isActive ? eyeX : 0 }, { translateY: isActive ? eyeY : 0 }] }]}/>
                        <View style={styles.shine} />
                     </View>
                     <View style={styles.eye}>
                        <Animated.View style={[styles.pupil, { transform: [{ translateX: isActive ? eyeX : 0 }, { translateY: isActive ? eyeY : 0 }] }]}/>
                        <View style={styles.shine} />
                     </View>
                </View>

                {/* Custom Mouth */}
                <View style={[
                    styles.mouth, 
                    mouthState === 'open' && styles.mouthOpen,
                    mouthState === 'eating' && styles.mouthEating,
                    mouthState === 'idle' && styles.mouthIdle
                ]}>
                    {(mouthState === 'open' || mouthState === 'eating') && (
                        <View style={styles.tongue} />
                    )}
                     {mouthState === 'idle' && (
                        <View style={styles.tooth} />
                    )}
                </View>
            </View>
            <Text style={[styles.monsterLabel, { color: color }]}>Hungry for '{label}'</Text>
        </Animated.View>
    );
};

export default function LetterSortingGameScreen() {
    const navigation = useNavigation();
    const route = useRoute<GameScreenRouteProp>();
    const { pairId } = route.params;
    const { settings } = useSettings();
    const { language } = settings;
    
    const safePairId = pairId || 'b_d';
    const [l1, l2] = safePairId.split('_');

    const [score, setScore] = useState(0);
    const [currentLetter, setCurrentLetter] = useState('');
    const currentLetterRef = useRef('');

    const [tourVisible, setTourVisible] = useState(true);
    const [mouthStateL, setMouthStateL] = useState<'idle' | 'open' | 'eating'>('idle');
    const [mouthStateR, setMouthStateR] = useState<'idle' | 'open' | 'eating'>('idle');
    const [isDragging, setIsDragging] = useState(false);
    const [celebrate, setCelebrate] = useState(false);

    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(0)).current;

    const generateNextLetter = () => {
        const next = Math.random() > 0.5 ? l1 : l2;
        setCurrentLetter(next);
        currentLetterRef.current = next;
        
        pan.setValue({ x: 0, y: 0 });
        scale.setValue(0);
        
        Animated.spring(scale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true
        }).start(() => {
             if (settings.enableSound) {
                Speech.speak(next, { language: 'en' }); 
             }
        });

        setMouthStateL('idle');
        setMouthStateR('idle');
        setCelebrate(false);
    };

    useEffect(() => {
        generateNextLetter();
        return () => {
            Speech.stop();
        };
    }, []);

    const handleSort = (targetBucket: string) => {
        const isCorrect = currentLetterRef.current === targetBucket;
        
        if (isCorrect) {
            setScore(prev => prev + 10);
            if (targetBucket === l1) setMouthStateL('eating');
            else setMouthStateR('eating');
            setCelebrate(true);
            
            Animated.timing(scale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
                setTimeout(generateNextLetter, 500); 
            });
        } else {
            if (settings.enableSound) Speech.speak("Oops!", { pitch: 1.2 });
            Animated.sequence([
                Animated.timing(pan, { toValue: { x: 20, y: 0 }, duration: 50, useNativeDriver: true }),
                Animated.timing(pan, { toValue: { x: -20, y: 0 }, duration: 50, useNativeDriver: true }),
                Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true })
            ]).start();
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                Animated.spring(scale, { toValue: 1.2, friction: 3, useNativeDriver: true }).start();
            },
            onPanResponderMove: (e, gestureState) => {
                Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(e, gestureState);
                
                const dropYThreshold = height * 0.55; 
                if (gestureState.moveY > dropYThreshold) {
                    if (gestureState.moveX < width / 2) {
                        setMouthStateL('open');
                        setMouthStateR('idle');
                    } else {
                        setMouthStateL('idle');
                        setMouthStateR('open');
                    }
                } else {
                    setMouthStateL('idle');
                    setMouthStateR('idle');
                }
            },
            onPanResponderRelease: (e, gestureState) => {
                setIsDragging(false);
                const dropYThreshold = height * 0.55; 
                Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

                if (gestureState.moveY > dropYThreshold) {
                    if (gestureState.moveX < width / 2) {
                        handleSort(l1);
                    } else {
                        handleSort(l2);
                    }
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        friction: 6,
                        tension: 40,
                        useNativeDriver: true
                    }).start();
                    setMouthStateL('idle');
                    setMouthStateR('idle');
                }
            }
        })
    ).current;

    const tourSteps: TourStep[] = [
        {
            title: "Feed the Monsters! 😋", 
            description: "Drag the letter to the monster that matches!",
            position: 'center',
            arrowPosition: 'bottom',
            style: { top: height * 0.4 },
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.background} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
                <View style={[styles.scoreBadge, { backgroundColor: '#4338CA' }]}>
                     <Text style={styles.scoreText}>SCORE: {score}</Text>
                </View>
            </View>

            <View style={styles.dragZone}>
                <Text style={styles.instruction}>Feed the correct monster!</Text>
                <View style={styles.spawnPoint}>
                    {celebrate && settings.enableAnimations && Array.from({ length: 15 }).map((_, i) => (
                        <Particle key={i} index={i} isActive={celebrate} />
                    ))}

                    <Animated.View
                        style={[
                            styles.card,
                            {
                                transform: [
                                    { translateX: pan.x }, 
                                    { translateY: pan.y },
                                    { scale: scale },
                                    { rotate: pan.x.interpolate({ inputRange: [-200, 200], outputRange: ['-15deg', '15deg'] }) } 
                                ]
                            }
                        ]}
                        {...panResponder.panHandlers}
                    >
                        <LinearGradient
                            colors={['#FFFFFF', '#E0E7FF']}
                            style={styles.cardGradient}
                        >
                            <Text style={styles.cardText}>{currentLetter}</Text>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </View>

            {/* Monster Drop Zones */}
            <View style={styles.bucketContainer}>
                <View style={styles.bucketWrapper}>
                    <Monster
                        label={l1}
                        color="#EF4444"
                        mouthState={mouthStateL}
                        dragX={pan.x}
                        dragY={pan.y}
                        isActive={isDragging}
                        variant="horns"
                        enableAnimations={settings.enableAnimations}
                        enableSound={settings.enableSound}
                    />
                </View>
                <View style={styles.bucketWrapper}>
                    <Monster
                        label={l2}
                        color="#10B981"
                        mouthState={mouthStateR}
                        dragX={pan.x}
                        dragY={pan.y}
                        isActive={isDragging}
                        variant="ears"
                        enableAnimations={settings.enableAnimations}
                        enableSound={settings.enableSound}
                    />
                </View>
            </View>

            <FeatureTour
                visible={tourVisible}
                steps={tourSteps}
                onComplete={() => setTourVisible(false)}
                onSkip={() => setTourVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 40, zIndex: 10 },
    closeButton: { padding: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 24, color: '#FFF', fontWeight: 'bold', lineHeight: 26 },
    scoreBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    scoreText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    
    dragZone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    instruction: { color: '#A5B4FC', fontSize: 24, fontWeight: '800', marginBottom: 60, textTransform: 'uppercase', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    spawnPoint: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
    
    particle: {
        position: 'absolute',
        width: 12, height: 12, borderRadius: 6,
        zIndex: 5,
    },

    card: {
        width: 140, height: 140,
        borderRadius: 30,
        shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.4, shadowRadius: 25, elevation: 20,
    },
    cardGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 6, borderColor: '#FFF' },
    cardText: { fontSize: 80, fontWeight: '900', color: '#312E81' },

    bucketContainer: {
        flexDirection: 'row',
        height: height * 0.35, 
        backgroundColor: 'rgba(0,0,0,0.25)', 
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)'
    },
    bucketWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monsterContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 180, // Allow space for horns/ears
    },
    monsterBody: {
        width: 140, height: 140,
        borderRadius: 60, // Squircle
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 6, borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
        zIndex: 2,
    },
    eyedContainer: { flexDirection: 'row', gap: 14, marginBottom: 12, marginTop: 10 },
    eye: { width: 36, height: 36, backgroundColor: '#FFF', borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#00000020' },
    pupil: { width: 16, height: 16, backgroundColor: '#1E293B', borderRadius: 8 },
    shine: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4, opacity: 0.7 },
    
    badge: { 
        position: 'absolute', top: -15, right: -15, 
        backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, 
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, 
        transform: [{ rotate: '15deg' }],
        zIndex: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5
    },
    badgeText: { fontWeight: '900', fontSize: 22 },
    
    // Custom Mouth
    mouth: {
        width: 60, height: 20,
        borderRadius: 10,
        backgroundColor: '#333',
        marginTop: 5,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    mouthIdle: {
        height: 10, width: 40, marginTop: 15,
    },
    mouthOpen: {
        height: 50, width: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginTop: 5,
    },
    mouthEating: {
        height: 40, width: 70, borderRadius: 20, marginTop: 10,
    },
    tongue: {
        width: 40, height: 30, backgroundColor: '#F472B6', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginBottom: -10
    },
    tooth: {
      width: 10, height: 6, backgroundColor: '#FFF', alignSelf: 'flex-start', marginLeft: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3
    },

    // Accessories
    horn: {
        position: 'absolute', top: 20,
        width: 0, height: 0, 
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 40,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        zIndex: 1,
    },
    hornLeft: { left: 20, transform: [{ rotate: '-30deg' }] },
    hornRight: { right: 20, transform: [{ rotate: '30deg' }] },
    
    ear: {
        position: 'absolute', top: 25,
        width: 40, height: 40, borderRadius: 20,
        zIndex: 1,
        borderWidth: 4, borderColor: 'rgba(0,0,0,0.1)',
    },
    earLeft: { left: 5 },
    earRight: { right: 5 },
});
