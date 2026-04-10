import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';

const PhonicCheckResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { result, word, source } = route.params;

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
    if (score >= 80) return DT.text.success; 
    if (score >= 50) return DT.accent.amber;
    return DT.text.error;
  };

  const scale = scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Phonic Check Result" isActive={true} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.sage} />
      <BackButton 
        onPress={() => navigation.goBack()}
        color={DT.accent.navy} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerText}>
          <Text style={styles.subtitle}>Result for</Text>
          <Text style={styles.wordTitle}>{word}</Text>
        </View>

        {/* Error State or Missing Data */}
        {!result.phonemes && (
            <View style={[styles.scoreCard, { backgroundColor: DT.bg.blush, borderColor: DT.text.error }]}>
                <Text style={[styles.verdict, { color: DT.text.error }]}>{result.error || "Analysis Error"}</Text>
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

          {/* Simple Confetti for High Score (Visual Polish) */}
          {result.word_accuracy >= 80 && (
             <View style={styles.confettiContainer}>
                {[...Array(5)].map((_, i) => (
                    <View key={i} style={[styles.confetti, { 
                        backgroundColor: i % 2 === 0 ? DT.text.success : DT.accent.amber 
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
        
        {/* Transcription Info */}
        {result.transcription_heard && (
            <View style={styles.debugBox}>
                <Text style={styles.debugLabel}>We heard:</Text>
                <Text style={styles.debugText}>"{result.transcription_heard}"</Text>
            </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={() => {
              if (source === 'Practice') {
                  //@ts-ignore
                  navigation.navigate('Practice', { refresh: true });
              } else {
                  navigation.goBack();
              }
          }}
        >
          <Text style={styles.doneButtonText}>Try Another Word</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.sage,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerText: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    marginBottom: 4,
    textAlign: 'center',
  },
  wordTitle: {
    fontSize: 34,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    textTransform: 'capitalize',
    letterSpacing: DT.typography.letterSpacingUI,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    ...DT.shadow.medium,
    borderWidth: 2,
    borderColor: DT.surface.cardBorder,
    marginBottom: 32,
    overflow: 'hidden',
  },
  scoreCircle: {
    minWidth: 160,
    minHeight: 160,
    borderRadius: 80,
    paddingHorizontal: 20,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: DT.bg.cream,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: DT.typography.weightHeavy,
  },
  scoreLabel: {
    fontSize: 14,
    color: DT.text.muted,
    textTransform: 'uppercase',
    fontWeight: DT.typography.weightBold,
    marginTop: 4,
    textAlign: 'center',
  },
  verdict: {
    fontSize: 24,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  tips: {
    fontSize: 16,
    color: DT.text.secondary,
    textAlign: 'center',
    lineHeight: DT.typography.lineHeightBody,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 16,
    alignSelf: 'flex-start',
    letterSpacing: DT.typography.letterSpacingUI,
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
    minWidth: 65,
    minHeight: 75,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: DT.radius.md,
    backgroundColor: DT.surface.card,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.soft,
  },
  phonemeText: {
    fontSize: 26,
    fontWeight: DT.typography.weightHeavy,
    marginBottom: 2,
    textAlign: 'center',
  },
  phonemeScore: {
    fontSize: 12,
    color: DT.text.muted,
    fontWeight: DT.typography.weightBold,
    textAlign: 'center',
  },
  debugBox: {
      padding: 16,
      backgroundColor: DT.bg.stone,
      borderRadius: DT.radius.md,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: DT.surface.cardBorder,
  },
  debugLabel: {
      fontSize: 12,
      color: DT.text.muted,
      marginBottom: 4,
      textTransform: 'uppercase',
      fontWeight: DT.typography.weightBold,
  },
  debugText: {
    fontSize: 18,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.secondary,
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    backgroundColor: DT.bg.sage,
    borderTopWidth: 1,
    borderTopColor: DT.surface.divider,
  },
  doneButton: {
    backgroundColor: DT.accent.navy,
    borderRadius: DT.radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  doneButtonText: {
    color: DT.text.onDark,
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  confettiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      opacity: 0.2
  },
  confetti: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 10,
  }
});

export default PhonicCheckResultScreen;
