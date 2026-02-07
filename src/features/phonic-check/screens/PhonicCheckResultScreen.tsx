import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  ImageBackground
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const PhonicCheckResultScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { result, word, source } = route.params;

  // Shared background
  const BACKGROUND_IMAGE = require('../../letter-tracing/assets/images/background_for_initial_home_screen.png');

  // Animation Refs
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const scale = scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                 <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Result for</Text>
        <Text style={styles.wordTitle}>{word}</Text>


        {/* Error State or Missing Data */}
        {!result.phonemes && (
            <View style={[styles.scoreCard, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.verdict, { color: '#DC2626' }]}>{result.error || "Analysis Error"}</Text>
                <Text style={styles.tips}>We couldn't process the audio properly.</Text>
            </View>
        )}

        {/* Score Card - Only show if valid data exists */}
        {result.phonemes && (
        <Animated.View style={[styles.scoreCard, { transform: [{ scale }] }]}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(result.word_accuracy) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(result.word_accuracy) }]}>
              {Math.round(result.word_accuracy)}%
            </Text>
            <Text style={styles.scoreLabel}>Accuracy</Text>
          </View>
          <Text style={styles.verdict}>{result.verdict}</Text>
          <Text style={styles.tips}>"{result.tips}"</Text>

          {/* Simple Confetti for High Score */}
          {result.word_accuracy >= 80 && (
             <View style={styles.confettiContainer}>
                {[...Array(5)].map((_, i) => (
                    <View key={i} style={[styles.confetti, { 
                        left: i * 50, 
                        top: -10,
                        backgroundColor: i % 2 === 0 ? '#10B981' : '#F59E0B' 
                    }]} />
                ))}
             </View>
          )}

        </Animated.View>
        )}

        {/* Phoneme Breakdown */}
        {result.phonemes && result.phonemes.length > 0 && (
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <Text style={styles.sectionTitle}>Sounds Breakdown</Text>
            <View style={styles.phonemeContainer}>
            {result.phonemes.map((p: any, index: number) => (
                <View key={index} style={[styles.phonemeBox, { borderColor: getScoreColor(p.score) }]}>
                <Text style={[styles.phonemeText, { color: getScoreColor(p.score) }]}>{p.p}</Text>
                <Text style={styles.phonemeScore}>{Math.round(p.score)}%</Text>
                </View>
            ))}
            </View>
        </Animated.View>
        )}
        
        {/* Transcription Debug Info */}
        {result.transcription_heard && (
            <View style={styles.debugBox}>
                <Text style={styles.debugLabel}>We heard:</Text>
                <Text style={styles.debugText}>"{result.transcription_heard}"</Text>
                {result.debug_ctc_loss !== undefined && (
                   <Text style={[styles.debugLabel, { marginTop: 4, fontSize: 10 }]}>Confidence (CTC): {result.debug_ctc_loss}</Text>
                )}
            </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={() => {
              if (source === 'Practice') {
                  // If coming from Practice, we want a new word (refresh)
                  // Use navigate to go back to existing screen with params
                  //@ts-ignore
                  navigation.navigate('Practice', { refresh: true });
              } else {
                  // If coming from Dashboard (or elsewhere), just go back to input
                  navigation.goBack();
              }
          }}
        >
          <Text style={styles.doneButtonText}>Try Another Word</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  header: {
      width: '100%',
      alignItems: 'flex-start',
      marginBottom: 10,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  wordTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 32,
    textTransform: 'capitalize',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
    overflow: 'hidden',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: 4,
  },
  verdict: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  tips: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  phonemeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  phonemeBox: {
    width: 60,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  phonemeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  phonemeScore: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  debugBox: {
      padding: 16,
      backgroundColor: '#E2E8F0',
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
  },
  debugLabel: {
      fontSize: 12,
      color: '#64748B',
      marginBottom: 4,
  },
  debugText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  doneButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  confettiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      opacity: 0.3
  },
  confetti: {
      width: 10,
      height: 10,
      borderRadius: 5,
  }
});

export default PhonicCheckResultScreen;
