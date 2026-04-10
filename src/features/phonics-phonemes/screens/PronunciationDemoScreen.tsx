/**
 * PronunciationDemoScreen: Magic Word Studio
 * 
 * DESIGN:
 * - Playful "Magic Studio" theme
 * - Simplistic interface for children
 * - No complex categories, just pure exploration
 */

import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '../../../components/AppText';
import { PronunciationCard } from '../components/pronunciation/PronunciationCard';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { getRandomPhonicsWords } from '../../../data/phonicsDatabase';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';
import { recordMagicWords } from '../../learning-path/services/PathProgressBridge';

// ... (Voice setup remains same) ...
const Voice = {
  destroy: async () => {},
  removeAllListeners: () => {},
  stop: async () => {},
  start: async (locale: string) => {},
  onSpeechStart: () => {},
  onSpeechEnd: () => {},
  onSpeechResults: (e: any) => {},
  onSpeechError: (e: any) => {},
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Magic Background Component
 * Non-flashy, dyslexia-friendly floating elements
 */
const MagicBackground = () => {
    const { width, height } = Dimensions.get('window');
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Text style={[styles.bgEmoji, { top: height * 0.1, left: width * 0.05, transform: [{ rotate: '-10deg' }] }]}>✨</Text>
            <Text style={[styles.bgEmoji, { top: height * 0.25, right: width * 0.1, transform: [{ rotate: '15deg' }] }]}>🌟</Text>
            <Text style={[styles.bgEmoji, { top: height * 0.5, left: width * 0.15, transform: [{ rotate: '5deg' }] }]}>📚</Text>
            <Text style={[styles.bgEmoji, { bottom: height * 0.2, right: width * 0.05, transform: [{ rotate: '-20deg' }] }]}>🎨</Text>
        </View>
    );
};

const PronunciationDemoScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'PhonicsPhonemes'>>();
  const mode = route.params?.mode || 'custom';
  
  const [customWord, setCustomWord] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [useDyslexicFont, setUseDyslexicFont] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Adaptive State
  const [adaptiveLevel, setAdaptiveLevel] = useState(1);
  const [feedQueue, setFeedQueue] = useState<string[]>([]);
  
  const { settings } = useSettings();
  const [tourVisible, setTourVisible] = useState(false);
  const { language } = settings;
  const sessionStart = useRef(Date.now());
  const interactionCount = useRef(0);
  
  const tourSteps: TourStep[] = [
      {
          title: getTranslation(language, 'tour_magic_words_title'),
          description: getTranslation(language, 'tour_magic_words_desc'),
          position: 'center',
      },
      {
          title: getTranslation(language, 'tour_magic_mic_title'),
          description: getTranslation(language, 'tour_magic_mic_desc'),
          position: 'center',
      }
  ];

  React.useEffect(() => {
    sessionStart.current = Date.now();
    interactionCount.current = 0;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      // Flush progress when user leaves the screen
      if (interactionCount.current > 0) {
        const secs = Math.round((Date.now() - sessionStart.current) / 1000);
        recordMagicWords(interactionCount.current, secs);
      }
    };
  }, []);

  const handleFeedAdaptiveWord = () => {
      let queue = [...feedQueue];
      if (queue.length === 0) {
          queue = getRandomPhonicsWords(adaptiveLevel, 3);
          if (queue.length === 0) return; // DB empty
      }
      
      const newWord = queue.shift();
      if (newWord) {
          setFeedQueue(queue);
          setWords(prev => [newWord, ...prev.slice(0, 4)]);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
  };

  const handleMicPress = () => {
      alert("Voice recognition features are being updated for better accessibility.");
  };

  const handleAddWord = () => {
    const trimmed = customWord.trim();
    if (trimmed) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      const newWord = trimmed.toLowerCase();
      const filtered = words.filter(w => w !== newWord);
      setWords([newWord, ...filtered]);
      setCustomWord('');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      interactionCount.current += 1; // Count each word added as an interaction
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Magic Words" isActive={!tourVisible} />
      <MagicBackground />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.lemon} />
      
      <View style={styles.topNav}>
        <BackButton color={DT.accent.navy} />
        <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
      </View>
      
      {/* Magic Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={styles.headerEmoji}>🔮</Text>
          <View>
            <Text style={styles.headerTitle}>{getTranslation(language, 'magic_words_title')}</Text>
            <Text style={styles.headerSubtitle}>{getTranslation(language, 'magic_words_subtitle')}</Text>
          </View>
        </View>
        
        {/* Font Toggle */}
        <TouchableOpacity
          style={[styles.fontToggle, useDyslexicFont && styles.fontToggleActive]}
          onPress={() => setUseDyslexicFont(!useDyslexicFont)}
        >
          <Text style={styles.fontToggleText}>🅰️</Text>
        </TouchableOpacity>
      </View>

      {/* Input Area */}
      {mode === 'custom' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputSection}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, useDyslexicFont && { fontFamily: 'OpenDyslexic-Regular' }]}
              placeholder={isListening ? "Listening..." : "Type a word..."}
              placeholderTextColor={DT.text.muted}
              value={customWord}
              onChangeText={setCustomWord}
              onSubmitEditing={handleAddWord}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TouchableOpacity
              style={[styles.micButton, isListening && styles.micButtonActive]}
              onPress={handleMicPress}
            >
             <Text style={styles.micButtonText}>{isListening ? '🛑' : '🎤'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.goButton, !customWord.trim() && styles.goButtonDisabled]}
              onPress={handleAddWord}
              disabled={!customWord.trim()}
            >
              <Text style={styles.goButtonText}>GO</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.inputSection}>
          <View style={[styles.inputWrapper, { backgroundColor: 'transparent', borderWidth: 0, padding: 0 }]}>
             <TouchableOpacity style={styles.adaptiveFeedButton} onPress={handleFeedAdaptiveWord}>
                 <LinearGradient 
                    colors={[DT.accent.navy, '#1E1B4B']} 
                    style={styles.adaptiveFeedGradient}
                 >
                     <Text style={styles.goButtonText}>Feed Me a Word! ✨</Text>
                 </LinearGradient>
             </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {words.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyTitle}>Welcome!</Text>
            <Text style={styles.emptyText}>
                {mode === 'adaptive' 
                    ? "Click 'Feed Me a Word!' to receive words matching your specific learning level."
                    : "Type any word above to see its magic phoneme breakdown!"}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Spells Active ({words.length})</Text>
              <TouchableOpacity onPress={() => setWords([])}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            
            {words.map((word, index) => (
              <PronunciationCard
                key={`${word}-${index}`}
                word={word}
                autoPlay={index === 0}
                dyslexicMode={useDyslexicFont}
              />
            ))}
          </>
        )}
      </ScrollView>
      <FeatureTour 
        visible={tourVisible}
        steps={tourSteps}
        onComplete={() => setTourVisible(false)}
        onSkip={() => setTourVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.lemon,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerEmoji: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  headerSubtitle: {
    fontSize: 15,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
  },
  fontToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DT.bg.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.soft,
  },
  fontToggleActive: {
    backgroundColor: DT.bg.lavender,
    borderColor: DT.accent.indigo,
    borderWidth: 1,
  },
  fontToggleText: {
    fontSize: 22,
  },
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    padding: 8,
    borderWidth: 1.5,
    borderColor: DT.surface.cardBorder,
    ...DT.shadow.soft,
  },
  input: {
    flex: 1,
    height: 60,
    fontSize: 20,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.primary,
    paddingHorizontal: 16,
  },
  goButton: {
    backgroundColor: DT.accent.navy,
    borderRadius: DT.radius.md,
    height: 60,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonDisabled: {
    backgroundColor: DT.bg.stone,
  },
  goButtonText: {
    color: DT.text.onDark,
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: DT.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: DT.bg.stone,
  },
  micButtonActive: {
    backgroundColor: DT.bg.blush,
  },
  micButtonText: {
    fontSize: 28,
    color: 'black',
  },
  adaptiveFeedButton: {
    flex: 1,
    height: 60,
    borderRadius: DT.radius.xl,
    overflow: 'hidden',
    ...DT.shadow.medium,
  },
  adaptiveFeedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.muted,
    textTransform: 'uppercase',
  },
  clearText: {
    fontSize: 14,
    color: DT.text.error,
    fontWeight: DT.typography.weightBold,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.navy,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: DT.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bgEmoji: {
    position: 'absolute',
    fontSize: 48,
    opacity: 0.1,
    zIndex: -1,
  },
});

export default PronunciationDemoScreen;
