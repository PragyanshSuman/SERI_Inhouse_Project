import {
  View,
  Text,
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
  ImageBackground
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AudioRecorder } from '../services/audioRecorder';
import { checkPronunciation } from '../services/apiService';
import { wordDatabase } from '../data/wordDatabase';
import EmotionTracker from '../../../components/EmotionTracker';

const PhonicCheckStudioScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Params from Dashboard (Optional)
  const categoryId = route.params?.categoryId;
  const difficulty = route.params?.difficulty;

  // State
  const [word, setWord] = useState('');
  const [practiceWords, setPracticeWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  const BACKGROUND_IMAGE = require('../../letter-tracing/assets/images/background_for_initial_home_screen.png');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // If category is passed, load words
    if (categoryId && difficulty) {
        loadPracticeWords();
    }
    return () => {
      audioRecorder.cleanup();
    };
  }, [categoryId, difficulty]);

  useEffect(() => {
    if (isRecording) {
      startPulse();
    } else {
      stopPulse();
    }
  }, [isRecording]);

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
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
    <EmotionTracker moduleName="Phonic Check" isActive={true} />
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>
                {isPracticeMode ? `Practice: ${categoryId?.toUpperCase()}` : 'Magic Check ✨'}
            </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
            {isPracticeMode ? (
                // PRACTICE MODE UI
                <View style={styles.practiceContainer}>
                    <Text style={styles.progressText}>Word {currentIndex + 1} of {practiceWords.length}</Text>
                    
                    <View style={styles.wordDisplay}>
                        <TouchableOpacity onPress={handlePrevWord} disabled={currentIndex === 0}>
                            <Text style={[styles.navArrow, currentIndex === 0 && styles.navDisabled]}>◀</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.targetWord}>{word}</Text>
                        
                        <TouchableOpacity onPress={handleNextWord} disabled={currentIndex === practiceWords.length - 1}>
                            <Text style={[styles.navArrow, currentIndex === practiceWords.length - 1 && styles.navDisabled]}>▶</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.instructionSmall}>Say this word!</Text>
                </View>
            ) : (
                // FREE MODE UI (Manual Input)
                <>
                    <Text style={styles.instruction}>Type a word you want to practice:</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
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

        <View style={styles.spacer} />

        <View style={styles.micContainer}>
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
                isProcessing && styles.recordButtonDisabled
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

      </KeyboardAvoidingView>
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
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20, 
  },
  backButton: {
    marginRight: 16,
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
  titleContainer: {
      backgroundColor: 'rgba(255,255,255,0.85)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'capitalize'
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: 24,
      borderRadius: 24,
      width: '100%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
  },
  instruction: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  instructionSmall: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  practiceContainer: {
      width: '100%',
      alignItems: 'center',
  },
  wordDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginVertical: 16,
  },
  targetWord: {
      fontSize: 40,
      fontWeight: '800',
      color: '#1E293B',
      textTransform: 'capitalize',
  },
  navArrow: {
      fontSize: 32,
      color: '#4F46E5',
      padding: 10,
  },
  navDisabled: {
      color: '#CBD5E1',
  },
  progressText: {
      fontSize: 14,
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    paddingVertical: 16,
  },
  spacer: {
    height: 60,
  },
  micContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 150,
      height: 150,
  },
  pulseRing: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(79, 70, 229, 0.2)', // Light primary color
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  recordIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  statusText: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default PhonicCheckStudioScreen;
