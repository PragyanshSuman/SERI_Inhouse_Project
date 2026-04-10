import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AudioRecorder } from '../services/audioRecorder';
import { checkPronunciation } from '../services/apiService';
import { wordDatabase } from '../data/wordDatabase';
import { phonicsDatabase } from '../../../data/phonicsDatabase';
import EmotionTracker from '../../../components/EmotionTracker';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import { useSettings } from '../../../context/SettingsContext';
import { DT } from '../../../utils/DyslexiaTheme';

const PhonicCheckStudioScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Params from Dashboard (Optional)
  const categoryId = route.params?.categoryId;
  const difficulty = route.params?.difficulty;
  const mode = route.params?.mode || 'custom';

  // State
  const [word, setWord] = useState('');
  const [practiceWords, setPracticeWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  const [tourVisible, setTourVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { settings } = useSettings();
  const fontStyle = {
    fontFamily: settings.fontFamily === 'Lexend' ? 'Lexend-Regular' :
                settings.fontFamily === 'Roboto' ? 'Roboto-Regular' :
                settings.fontFamily === 'OpenSans' ? 'OpenSans-Regular' :
                settings.fontFamily === 'AtkinsonHyperlegible' ? 'AtkinsonHyperlegible-Regular' : undefined,
    letterSpacing: settings.dyslexiaFormattingEnabled ? 32 * 0.35 : undefined,
    color: settings.themeMode === 'dyslexicDark' ? '#D1D5DB' : '#0F172A',
  };

  useEffect(() => {
    if (mode === 'adaptive') {
       loadAdaptiveWords();
    } else if (categoryId && difficulty) {
        loadPracticeWords();
    }
    return () => {
      audioRecorder.cleanup();
    };
  }, [categoryId, difficulty, mode]);

  useEffect(() => {
    if (isRecording) {
      startPulse();
    } else {
      stopPulse();
    }
  }, [isRecording]);

  const loadAdaptiveWords = () => {
      // Pick Level 1 (CVC) by default for now
      const level = phonicsDatabase.find(l => l.id === 1);
      if (level) {
          const adaptiveArray = level.words.map(w => ({ text: w, difficulty: 'beginner' }));
          setPracticeWords(adaptiveArray.slice(0, 5)); // Take 5 words
          setWord(adaptiveArray[0].text);
          setIsPracticeMode(true);
          setCurrentIndex(0);
      }
  };

  const loadPracticeWords = () => {
      const category = wordDatabase.getCategory(categoryId);
      if (category) {
          // Filter words by difficulty
          const words = category.words.filter(w => w.difficulty === difficulty);
          if (words.length > 0) {
              setPracticeWords(words);
              setWord(words[0].text);
              setIsPracticeMode(true);
              setCurrentIndex(0);
          }
      }
  };

  const handleNextWord = () => {
      if (currentIndex < practiceWords.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          setWord(practiceWords[nextIndex].text);
      }
  };

  const handlePrevWord = () => {
      if (currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          setCurrentIndex(prevIndex);
          setWord(practiceWords[prevIndex].text);
      }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleToggleRecording = async () => {
    if (isProcessing) return;

    if (!word.trim()) {
      Alert.alert('Enter a Word', 'Please type a word to check first.');
      return;
    }

    try {
      if (isRecording) {
        // Stop Listing
        const uri = await audioRecorder.stopRecording();
        setIsRecording(false);
        handleAnalyze(uri);
      } else {
        // Start Listening
        await audioRecorder.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to toggle recording.');
      setIsRecording(false);
    }
  };

  const handleAnalyze = async (uri: string) => {
    if (!uri) return;

    setIsProcessing(true);
    try {
      const result = await checkPronunciation(word, uri);
      navigation.navigate('PhonicCheckResult', { result, word });
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not connect to the backend. Ensure the Python server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Phonic Check Studio" isActive={!isRecording && !tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.sage} />
      <BackButton 
        onPress={() => navigation.goBack()} 
        color={DT.accent.navy} 
      />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
      
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>
                {isPracticeMode ? `Practice: ${categoryId?.toUpperCase()}` : 'Magic Check ✨'}
            </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
            <View style={styles.wordCard}>
                {isPracticeMode ? (
                    <View style={styles.practiceContainer}>
                        <Text style={styles.progressText}>Word {currentIndex + 1} of {practiceWords.length}</Text>
                        <Text style={styles.wordText}>{word}</Text>
                        <View style={styles.navRow}>
                            <TouchableOpacity style={[styles.navButton, currentIndex === 0 && styles.navDisabled]} onPress={handlePrevWord} disabled={currentIndex === 0}>
                                <Text style={styles.navIcon}>◀</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.navButton, currentIndex === practiceWords.length - 1 && styles.navDisabled]} onPress={handleNextWord} disabled={currentIndex === practiceWords.length - 1}>
                                <Text style={styles.navIcon}>▶</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <Text style={styles.instruction}>Type a word you want to practice:</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, fontStyle as any]}
                                value={word}
                                onChangeText={setWord}
                                placeholder="e.g. Elephant"
                                placeholderTextColor="#94A3B8"
                                editable={!isRecording && !isProcessing}
                            />
                        </View>
                    </>
                )}
            </View>

            <View style={styles.micWrapper}>
                {isRecording && (
                    <Animated.View style={[
                        styles.pulseRing, 
                        { transform: [{ scale: pulseAnim }] }
                    ]} />
                )}
                
                <TouchableOpacity
                style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                ]}
                onPress={handleToggleRecording}
                disabled={isProcessing}
                >
                {isProcessing ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                    <Text style={styles.recordIcon}>{isRecording ? '⏹' : '🎤'}</Text>
                )}
                </TouchableOpacity>
            </View>
            
            <Text style={styles.statusText}>
              {isProcessing 
                ? 'Analyzing magic...' 
                : isRecording 
                  ? 'Listening... Tap to Stop' 
                  : 'Tap to Record'}
            </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.sage,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20, 
  },
  titleContainer: {
      backgroundColor: DT.surface.card,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: DT.radius.md,
      ...DT.shadow.soft,
      borderWidth: 1,
      borderColor: DT.surface.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    textTransform: 'capitalize',
    letterSpacing: DT.typography.letterSpacingUI,
  },
  wordCard: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    ...DT.shadow.medium,
    borderWidth: 2,
    borderColor: DT.surface.cardBorder,
  },
  wordText: {
    fontSize: 48,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  instruction: {
    fontSize: 18,
    color: DT.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: DT.typography.weightMedium,
  },
  practiceContainer: {
      width: '100%',
      alignItems: 'center',
  },
  progressText: {
      fontSize: 14,
      color: DT.text.muted,
      fontWeight: DT.typography.weightBold,
      textTransform: 'uppercase',
      letterSpacing: DT.typography.letterSpacingBody,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: DT.surface.input,
    borderRadius: DT.radius.md,
    padding: 8,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.inputBorder,
  },
  input: {
    fontSize: 32,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  micWrapper: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(46,74,122,0.1)',
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: DT.accent.navy,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  recordButtonActive: {
    backgroundColor: DT.text.error,
  },
  recordIcon: {
    fontSize: 36,
    color: DT.text.onDark,
  },
  statusText: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.secondary,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 32,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DT.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  navIcon: {
    fontSize: 24,
    color: DT.accent.navy,
  },
  navDisabled: {
    opacity: 0.3,
  },
});

export default PhonicCheckStudioScreen;
