import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Svg, Circle, Polygon } from 'react-native-svg';
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
  useLetterName = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePress = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    onPlayStart?.();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      const textToSpeak = useLetterName ? letter : letter.toLowerCase();
      Speech.speak(textToSpeak, {
        onDone: () => {
          setIsPlaying(false);
          onPlayEnd?.();
        },
        onError: () => {
          setIsPlaying(false);
          onPlayEnd?.();
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      onPlayEnd?.();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={isPlaying} activeOpacity={0.7} style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="45" fill={color} opacity={isPlaying ? 0.7 : 1} />
          <Polygon points="35,40 35,60 45,60 60,70 60,30 45,40" fill="white" />
          {isPlaying && (
            <>
              <Circle cx="50" cy="50" r="35" stroke="white" strokeWidth="2" fill="none" opacity={0.5} />
              <Circle cx="50" cy="50" r="40" stroke="white" strokeWidth="2" fill="none" opacity={0.3} />
            </>
          )}
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

export default AudioButton;
