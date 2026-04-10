import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Svg, Circle, Polygon, Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import * as Speech from 'expo-speech';

interface AudioButtonProps {
  letter: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  size?: number;
  color?: string;
  useLetterName?: boolean;
}

const AudioButton: React.FC<AudioButtonProps> = ({
  letter,
  onPlayStart,
  onPlayEnd,
  size = 80,
  color = '#2196F3',
  useLetterName = true, // Default to true for clearer letter pronunciation
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePress = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    onPlayStart?.();

    // Visual feedback
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    try {
      // Direct speech logic
      const textToSpeak = useLetterName ? `Letter ${letter}` : letter.toLowerCase();
      
      // Stop any current speech to avoid queuing issues
      await Speech.stop();
      
      Speech.speak(textToSpeak, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          setIsPlaying(false);
          onPlayEnd?.();
        },
        onError: (err) => {
          console.error('Speech error:', err);
          setIsPlaying(false);
          onPlayEnd?.();
        }
      });

      // Safety fallback to reset isPlaying after 3 seconds
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);

    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      onPlayEnd?.();
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      disabled={isPlaying} 
      activeOpacity={0.85} 
      style={styles.container}
    >
      <Animated.View style={[
        styles.glassOrb,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
            </LinearGradient>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {/* External Glow when playing */}
          {isPlaying && (
            <Circle cx="50" cy="50" r="48" fill="url(#glow)" />
          )}

          {/* Frosted Base */}
          <Circle cx="50" cy="50" r="42" fill="url(#orbGrad)" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          
          {/* Speaker Icon - Bigger and Bolder */}
          <Path
            d="M32 42h10l13-11v38l-13-11h-10v-16z"
            fill="white"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          
          {/* Sound Arcs */}
          <Path
            d="M65 40c3 3 3 17 0 20"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={isPlaying ? 1 : 0.8}
          />
          <Path
            d="M74 34c5 5.5 5 26.5 0 32"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={isPlaying ? 0.9 : 0.4}
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  glassOrb: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 100,
    padding: 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  }
});

export default AudioButton;
