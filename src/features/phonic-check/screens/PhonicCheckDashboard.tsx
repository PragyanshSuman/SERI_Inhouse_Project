// src/screens/HomeScreen.tsx - Category selection screen

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Dimensions
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AudioRecorder } from '../services/audioRecorder';
import { checkPronunciation } from '../services/apiService';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useLanguage, useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';

const { width } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhonicCheckDashboard'>;
};

const PhonicCheckDashboard: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { settings } = useSettings();
  const { language } = settings;
  // Logic from Studio
  const [word, setWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  // Animation Values
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Font Map Override for TextInput Context isolation
  const fontStyle = {
    fontFamily: settings.fontFamily === 'Lexend' ? 'Lexend-Regular' :
                settings.fontFamily === 'Roboto' ? 'Roboto-Regular' :
                settings.fontFamily === 'OpenSans' ? 'OpenSans-Regular' :
                settings.fontFamily === 'AtkinsonHyperlegible' ? 'AtkinsonHyperlegible-Regular' : undefined,
    letterSpacing: settings.dyslexiaFormattingEnabled ? 32 * 0.35 : undefined,
    color: settings.themeMode === 'dyslexicDark' ? '#D1D5DB' : '#0F172A',
  };

  // Feature Tour State
  const [tourVisible, setTourVisible] = useState(false);
  
  const tourSteps = [
      {
          title: getTranslation(language, 'magic_tour_welcome_title'),
          description: getTranslation(language, 'magic_tour_welcome_desc'),
          position: 'center' as const,
      },
      {
          title: getTranslation(language, 'magic_tour_step1_title'),
          description: getTranslation(language, 'magic_tour_step1_desc'),
          position: 'top' as const,
      },
      {
          title: getTranslation(language, 'magic_tour_step2_title'),
          description: getTranslation(language, 'magic_tour_step2_desc'),
          position: 'bottom' as const,
      },
      {
          title: getTranslation(language, 'magic_tour_feedback_title'),
          description: getTranslation(language, 'magic_tour_feedback_desc'),
          position: 'center' as const,
      }
  ];

  const handleTourComplete = () => {
      setTourVisible(false);
  };

  useEffect(() => {
    return () => {
      audioRecorder.cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startPulse();
    } else {
      stopPulse();
    }
  }, [isRecording]);

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
      navigation.navigate('PhonicCheckResult', { result, word, source: 'Dashboard' });
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not connect to the backend. Ensure the Python server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Phonic Check" isActive={!tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.sage} />
      <BackButton 
        onPress={() => navigation.goBack()} 
        color={DT.accent.navy} 
      />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
      
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{getTranslation(language, 'magic_check_title')}</Text>
        <Text style={styles.subtitle}>{getTranslation(language, 'magic_check_subtitle')}</Text>
      </View>

      <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
      >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Magic Check Section */}
              <View style={styles.card}>
                  <Text style={styles.instruction}>
                    {word ? getTranslation(language, 'magic_instruction_tap') : getTranslation(language, 'magic_instruction_type')}
                  </Text>
                  
                  <View style={styles.inputContainer}>
                  <TextInput
                      style={[styles.input, fontStyle as any]}
                      value={word}
                      onChangeText={setWord}
                      placeholder={getTranslation(language, 'magic_input_placeholder')}
                      placeholderTextColor="#94A3B8"
                      editable={!isRecording && !isProcessing}
                  />
                  </View>
              </View>

              {/* Recording Controls */}
              <View style={styles.micWrapper}>
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
                          ? getTranslation(language, 'magic_analyzing') 
                          : isRecording 
                          ? getTranslation(language, 'magic_mic_listening')
                          : getTranslation(language, 'magic_mic_tap')}
                  </Text>
              </View>

          </ScrollView>
      </KeyboardAvoidingView>
      <FeatureTour 
        visible={tourVisible}
        steps={tourSteps}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.sage,
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: DT.surface.card,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    ...DT.shadow.medium,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.cardBorder,
    marginBottom: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.navy,
    marginBottom: 4,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  subtitle: {
    fontSize: 15,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    letterSpacing: DT.typography.letterSpacingBody,
    textAlign: 'center',
    lineHeight: DT.typography.lineHeightBody,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
      paddingBottom: 40,
      alignItems: 'center',
  },
  card: {
      backgroundColor: DT.surface.card,
      padding: 24,
      borderRadius: DT.radius.xl,
      width: '90%',
      alignItems: 'center',
      ...DT.shadow.soft,
      borderWidth: 1,
      borderColor: DT.surface.cardBorder,
      marginTop: 20,
  },
  instruction: {
    fontSize: 17,
    color: DT.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: DT.typography.weightMedium,
    lineHeight: DT.typography.lineHeightBody,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: DT.surface.input,
    borderRadius: DT.radius.md,
    padding: 4,
    borderWidth: 2,
    borderColor: DT.surface.inputBorder,
  },
  input: {
    fontSize: 32,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
    textAlign: 'center',
    paddingVertical: 12,
    letterSpacing: 1.5,
  },
  micWrapper: {
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 30,
  },
  micContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 120,
      height: 120,
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
  recordButtonDisabled: {
    backgroundColor: DT.text.muted,
  },
  recordIcon: {
    fontSize: 36,
    color: DT.text.onDark,
  },
  statusText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.secondary,
    letterSpacing: DT.typography.letterSpacingBody,
  },
});

export default PhonicCheckDashboard;
