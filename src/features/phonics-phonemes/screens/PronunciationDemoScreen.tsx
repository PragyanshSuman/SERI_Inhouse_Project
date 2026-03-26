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
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  LayoutAnimation,
  UIManager,
  PermissionsAndroid,
  Dimensions, // Add Dimensions
} from 'react-native';
import { PronunciationCard } from '../components/pronunciation/PronunciationCard';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import EmotionTracker from '../../../components/EmotionTracker';
// ... (Voice mock) ...
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

// ... (LayoutAnimation setup) ...
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Magic Background Component
 */
const MagicBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {/* Floating elements for atmosphere */}
    <Text style={[styles.bgEmoji, { top: '10%', left: '5%', transform: [{ rotate: '-10deg' }] }]}>✨</Text>
    <Text style={[styles.bgEmoji, { top: '25%', right: '10%', transform: [{ rotate: '15deg' }] }]}>🌟</Text>
    <Text style={[styles.bgEmoji, { top: '50%', left: '15%', transform: [{ rotate: '5deg' }] }]}>📚</Text>
    <Text style={[styles.bgEmoji, { bottom: '20%', right: '5%', transform: [{ rotate: '-20deg' }] }]}>🎨</Text>
    <Text style={[styles.bgEmoji, { top: '5%', right: '30%', opacity: 0.1 }]}>🅰️</Text>
    <Text style={[styles.bgEmoji, { bottom: '10%', left: '40%', opacity: 0.1 }]}>🅱️</Text>
  </View>
);

/**
 * Main demo screen component
 */
const PronunciationDemoScreen: React.FC = () => {
  const [customWord, setCustomWord] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [useDyslexicFont, setUseDyslexicFont] = useState(false);
  const [isListening, setIsListening] = useState(false); // Magic Dictation state
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Feature Tour State
  const [tourVisible, setTourVisible] = useState(true); // Start visible for demo
  const { language } = useLanguage();
  
  const tourSteps: TourStep[] = [
      {
          title: getTranslation(language, 'tour_magic_words_title'),
          description: getTranslation(language, 'tour_magic_words_desc'),
          position: 'top' as const, 
          arrowPosition: 'top' as const, 
          style: { top: 160, alignSelf: 'center' as const },
          arrowOffset: 110 // Center
      },
      {
          title: getTranslation(language, 'tour_magic_mic_title'),
          description: getTranslation(language, 'tour_magic_mic_desc'),
          position: 'top' as const,
          arrowPosition: 'top' as const,
          style: { top: 240, alignSelf: 'center' as const },
          arrowOffset: 110 // Center
      },
      {
          title: getTranslation(language, 'tour_dyslexic_font_title'),
          description: getTranslation(language, 'tour_dyslexic_font_desc'),
          position: 'top' as const,
          arrowPosition: 'top' as const,
          style: { top: 100, right: 20 },
          arrowOffset: 200 // Right side of card
      }
  ];

  const handleTourComplete = () => {
      setTourVisible(false);
  };

  /**
   * Effect: Setup Voice listeners
   */
  React.useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e: any) => {
      if (e.value && e.value[0]) {
        // Take the first result
        const spokenWord = e.value[0];
        setCustomWord(spokenWord);
        // Optional: Auto-submit if confident? Keeping manual for now.
      }
    };
    Voice.onSpeechError = (e: any) => {
      console.log('Voice Error:', e);
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  /**
   * Handles Microphone Toggle
   */
  const handleMicPress = async () => {
    try {
      /*
      if (isListening) {
        await Voice.stop();
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Magic Words needs access to your microphone to hear you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Mic permission denied');
          return;
        }
      }

      setCustomWord(''); // Clear old word
      await Voice.start('en-US');
      */
      alert("Voice recognition is currently disabled due to build compatibility issues.");
    } catch (e) {
      console.error('Mic Error:', e);
    }
  };

  /**
   * Handles adding a new magic word
   */
  const handleAddWord = () => {
    // ... same ...
    const trimmed = customWord.trim();
    if (trimmed) {
      // Animate the list update
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      
      // Add to start of list (newest first)
      const newWord = trimmed.toLowerCase();
      
      // Remove if already exists to move to top
      const filtered = words.filter(w => w !== newWord);
      
      setWords([newWord, ...filtered]);
      setCustomWord('');
      
      // Scroll to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  /**
   * Clears the playground
   */
  const handleClearAll = () => {
    setWords([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Magic Words" isActive={!tourVisible} />
      <MagicBackground />
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />
      
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
          accessibilityLabel="Toggle dyslexic friendly font"
        >
          <Text style={styles.fontToggleText}>🅰️</Text>
        </TouchableOpacity>
      </View>

      {/* Input Area (The "Magic Wand") */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputSection}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, useDyslexicFont && { fontFamily: 'OpenDyslexic-Regular' }]}
            placeholder={isListening ? getTranslation(language, 'magic_listening') : getTranslation(language, 'magic_type_here')}
            placeholderTextColor={isListening ? "#FF6B6B" : "#AAB0B6"}
            value={customWord}
            onChangeText={setCustomWord}
            onSubmitEditing={handleAddWord}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isListening} // Disable typing while listening
          />
          
          {/* Magic Mic Button */}
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive
            ]}
            onPress={handleMicPress}
            accessibilityLabel="Dictate word"
          >
           <Text style={styles.micButtonText}>{isListening ? '🛑' : '🎤'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.goButton,
              !customWord.trim() && styles.goButtonDisabled,
            ]}
            onPress={handleAddWord}
            disabled={!customWord.trim()}
          >
            <Text style={styles.goButtonText}>{getTranslation(language, 'magic_go')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Content Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {words.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyTitle, useDyslexicFont && { fontFamily: 'OpenDyslexic-Regular' }]}>
              {getTranslation(language, 'magic_welcome')}
            </Text>
            <Text style={[styles.emptyText, useDyslexicFont && { fontFamily: 'OpenDyslexic-Regular' }]}>
              {getTranslation(language, 'magic_ready')}{"\n"}
              {getTranslation(language, 'magic_try_typing')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{getTranslation(language, 'magic_your_spells')} ({words.length})</Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearText}>{getTranslation(language, 'magic_clear_all')}</Text>
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
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </SafeAreaView>
  );
};


/**
 * Screen styles - Child Friendly Theme
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8', // Soft Cloud
  },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#F0F4F8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  headerEmoji: {
    fontSize: 40,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '900', // Black weight
    color: '#2B3A55',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'sans-serif-rounded' }),
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#5F6368',
    fontWeight: '500',
  },

  fontToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2E3FC',
    marginLeft: 10,
  },

  fontToggleActive: {
    backgroundColor: '#C2E7FF',
    borderColor: '#7FCFFF',
  },

  fontToggleText: {
    fontSize: 22,
    color: '#1A73E8',
  },

  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
    zIndex: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 8,
    // Playful shadow
    shadowColor: '#4D96FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#4D96FF',
  },

  input: {
    flex: 1,
    height: 60,
    fontSize: 24,
    fontWeight: '600',
    color: '#2B3A55',
    paddingHorizontal: 20,
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'sans-serif-rounded' }),
  },

  goButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 24,
    height: 60,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  goButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },

  goButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#D2E3FC',
  },

  micButtonActive: {
    backgroundColor: '#FFEBEE', // Pulse Red
    borderColor: '#FF6B6B',
  },

  micButtonText: {
    fontSize: 28,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 4, // Slight padding for card shadows
    paddingTop: 10,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
    marginTop: 10,
  },

  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#AAB0B6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  clearText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },

  emptyState: {
    marginTop: 60,
    padding: 40,
    alignItems: 'center',
    opacity: 0.8,
  },

  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4D96FF',
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 18,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 28,
  },

  footerSpacing: {
    height: 100, // Space at bottom
  },

  bgEmoji: {
    position: 'absolute',
    fontSize: 60,
    opacity: 0.15,
    zIndex: -1,
  },
});

export default PronunciationDemoScreen;
