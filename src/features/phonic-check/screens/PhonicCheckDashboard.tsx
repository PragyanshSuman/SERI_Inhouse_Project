// src/screens/HomeScreen.tsx - Category selection screen

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AudioRecorder } from '../services/audioRecorder';
import { checkPronunciation } from '../services/apiService';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import EmotionTracker from '../../../components/EmotionTracker';

const { width } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhonicCheckDashboard'>;
};

const PhonicCheckDashboard: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { language } = useLanguage();
  // Logic from Studio
  const [word, setWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  // Animation Values
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Tour State
  const [tourVisible, setTourVisible] = useState(true); // Show by default for now
  
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
      // TODO: Save to AsyncStorage so it doesn't show again
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
      <EmotionTracker moduleName="Magic Check Dashboard" isActive={!tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
                      style={styles.input}
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
    backgroundColor: '#F0F2F5',
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    marginBottom: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#283593',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7986CB',
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
      paddingBottom: 40,
      alignItems: 'center',
  },
  card: {
      backgroundColor: '#FFFFFF',
      padding: 24,
      borderRadius: 24,
      width: '90%',
      alignItems: 'center',
      shadowColor: '#303F9F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      marginTop: 20,
  },
  instruction: {
    fontSize: 18,
    color: '#5C6BC0', 
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#E8EAF6',
  },
  input: {
    fontSize: 32,
    fontWeight: '700',
    color: '#283593',
    textAlign: 'center',
    paddingVertical: 12,
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
      backgroundColor: 'rgba(63, 81, 181, 0.2)', // Indigo 500 equivalent
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#3F51B5', // Indigo 500
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#303F9F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#F44336', // Red
  },
  recordButtonDisabled: {
    backgroundColor: '#9FA8DA',
  },
  recordIcon: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6BC0', 
  },
});

export default PhonicCheckDashboard;
