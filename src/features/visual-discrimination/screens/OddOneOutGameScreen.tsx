import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Animated, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import { LinearGradient } from 'expo-linear-gradient';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { generateGrid } from '../utils/gameLogic';
import EmotionTracker from '../../../components/EmotionTracker';
import { audioEngine } from '../../phonics-phonemes/services/audio/AudioEngine';
import { useSettings } from '../../../context/SettingsContext';

const { width } = Dimensions.get('window');

type GameScreenRouteProp = RouteProp<RootStackParamList, 'OddOneOutGame'>;

// Animated Tile Component
const GameTile = ({ 
    letter, 
    onPress, 
    index, 
    disabled,
    size
}: { 
    letter: string, 
    onPress: () => void, 
    index: number,
    disabled: boolean,
    size: number
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
        onPress();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.tile, { width: size, height: size }]}
                onPress={handlePress}
                activeOpacity={0.9}
                disabled={disabled}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F1F5F9']}
                    style={styles.tileGradient}
                >
                    <Text style={[styles.tileText, { fontSize: size * 0.5 }]}>{letter}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function OddOneOutGameScreen() {
  const navigation = useNavigation();
  const route = useRoute<GameScreenRouteProp>();
  const { pairId } = route.params; 
  const { settings } = useSettings();
  const { language } = settings;

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gridData, setGridData] = useState<string[]>([]);
  const [targetLetter, setTargetLetter] = useState('');
  const [tourVisible, setTourVisible] = useState(true);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failure'>('playing');
  const [key, setKey] = useState(0); 

  // Dynamic Grid Size based on Level
  // Level 1-2: 2x2
  // Level 3-5: 3x3
  // Level 6+: 4x4
  const getGridSize = (lvl: number) => {
      if (lvl <= 2) return 2;
      if (lvl <= 5) return 3;
      return 4;
  };

  const gridSize = getGridSize(level);

  const [l1, l2] = pairId.split('_');

  // Timer Ref
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startLevel();
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level]);

  const startLevel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Reset Timer 
    setTimeLeft(30 - Math.min(level, 15)); // Decrease time as level goes up

    // Start Timer
    timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                setGameState('failure');
                // Auto restart level after delay
                setTimeout(() => {
                    startLevel(); // Retry same level
                }, 2000);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    const isTargetFirst = Math.random() > 0.5;
    const target = isTargetFirst ? l1 : l2;
    const distractor = isTargetFirst ? l2 : l1;
    
    setTargetLetter(target);
    const newGrid = generateGrid(gridSize * gridSize, target, distractor);
    setGridData(newGrid);
    setKey(prev => prev + 1); 
    setGameState('playing');

    if (settings.enableSound) {
        audioEngine.speak(`Find the ${target}`, { language: 'en' });
    }
  };

  const handleTilePress = (letter: string) => {
    if (gameState !== 'playing') return;

    if (letter === targetLetter) {
        if (timerRef.current) clearInterval(timerRef.current);
        setScore(score + 10 + timeLeft); // Bonus for speed
        setGameState('success');
        if (settings.enableSound) audioEngine.speak("Great job!", { pitch: 1.2 });
        setTimeout(() => {
            setLevel(level + 1);
        }, 1200); 
    } else {
        setGameState('failure');
        if (settings.enableSound) audioEngine.speak("Oops!", { pitch: 0.8 });
        setScore(Math.max(0, score - 5)); // Penalty
        setTimeout(() => {
            setGameState('playing');
        }, 800);
    }
  };

  const tourSteps: TourStep[] = [
    {
      title: getTranslation(language, 'tour_odd_one_title'),
      description: getTranslation(language, 'tour_odd_one_desc'),
      position: 'top',
      arrowPosition: 'bottom',
      style: { top: 100, alignSelf: 'center' },
    }
  ];

  // Calculate Tile Size dynamically
  // Screen Width - Padding (32) - Gaps ((gridSize-1) * 16) / gridSize
  const tileWidth = (width - 32 - ((gridSize - 1) * 16)) / gridSize;

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Odd One Out" isActive={true} />
      <LinearGradient colors={['#4F46E5', '#818CF8']} style={styles.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        
        {/* Timer Bar */}
        <View style={styles.timerContainer}>
            <View style={[styles.timerBar, { width: `${(timeLeft / 30) * 100}%` }]} />
        </View>

        <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>{getTranslation(language, 'game_score')}</Text>
            <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Instruction */}
        <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>{getTranslation(language, 'game_find_the')}</Text>
            <View style={styles.targetLetterContainer}>
                <Text style={styles.targetLetter}>{targetLetter}</Text>
            </View>
            <Text style={styles.levelText}>{getTranslation(language, 'game_level_up')} {level}</Text>
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
            {gridData.map((letter, index) => (
                <GameTile 
                    key={`${key}-${index}`} 
                    index={index}
                    letter={letter} 
                    onPress={() => handleTilePress(letter)}
                    disabled={gameState !== 'playing'}
                    size={tileWidth}
                />
            ))}
        </View>
      </ScrollView>

      {/* Success Overlay */}
      {gameState === 'success' && (
          <View style={styles.overlay}>
              <Text style={styles.overlayEmoji}>🎉</Text>
              <Text style={styles.overlayText}>{getTranslation(language, 'game_great_job')}</Text>
          </View>
      )}

      {/* Failure Overlay */}
      {gameState === 'failure' && (
          <View style={[styles.overlay, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
              <Text style={styles.overlayEmoji}>😞</Text>
              <Text style={styles.overlayText}>{getTranslation(language, 'game_try_again')}</Text>
          </View>
      )}

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
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  closeButton: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    zIndex: 10,
  },
  closeText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  timerContainer: {
      flex: 1,
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 4,
      marginHorizontal: 16,
      overflow: 'hidden',
  },
  timerBar: {
      height: '100%',
      backgroundColor: '#34D399', // Green
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollContent: {
      paddingBottom: 40,
  },
  instructionContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  instructionText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  levelText: {
      marginTop: 8,
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
  },
  targetLetterContainer: {
      backgroundColor: '#FFF',
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
  },
  targetLetter: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'center',
    gap: 16,
  },
  tile: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  tileGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  tileText: {
    fontWeight: 'bold',
    color: '#334155',
  },
  overlay: {
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(16, 185, 129, 0.9)', // Green by default
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
  },
  overlayEmoji: {
      fontSize: 80,
      marginBottom: 20,
  },
  overlayText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFF',
      textAlign: 'center',
  },
});
