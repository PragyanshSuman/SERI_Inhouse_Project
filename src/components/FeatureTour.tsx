import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ViewStyle,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/SettingsContext';
import { TRANSLATIONS, getTranslation } from '../utils/Translations';

const { width, height } = Dimensions.get('window');

// Export TourStep for external use
export interface TourStep {
  title: string;
  description: string;
  style?: ViewStyle; // Absolute positioning
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  arrowOffset?: number; // Offset for the arrow
  position?: 'top' | 'center' | 'bottom'; // Fallback for simple positioning
}

interface FeatureTourProps {
  visible: boolean;
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const FeatureTour: React.FC<FeatureTourProps> = ({
  visible,
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { language } = useLanguage();

  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      animateIn();
      
      // Auto-speak the first step after a short delay
      setTimeout(() => speakCurrentStep(0), 500);
    } else {
      Speech.stop();
    }
  }, [visible]);

  // Animate when step changes
  useEffect(() => {
    if (visible) {
        animateIn(); 
    }
  }, [currentStepIndex]);

  const speakCurrentStep = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return;

    // Combine title and description
    let textToSpeak = `${step.title}. ${step.description}`;

    // Remove emojis and symbols using Regex
    // This matches most common emoji ranges and symbols
    textToSpeak = textToSpeak.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B00}-\u{2BFF}\u{1F400}-\u{1F8FF}]/gu, '');
    
    // Map language codes for TTS
    let languageCode = 'en-US';
    if (language === 'ta') languageCode = 'ta-IN';
    if (language === 'hi') languageCode = 'hi-IN';

    Speech.stop();
    Speech.speak(textToSpeak, {
      language: languageCode,
      rate: 0.9,
      pitch: 1.0, 
    });
  };

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = currentStepIndex + 1;
      setCurrentStepIndex(nextStep);
      speakCurrentStep(nextStep);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
      Speech.stop();
    });
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onSkip();
      Speech.stop();
    });
  };

  if (!visible) return null;

  const step = steps[currentStepIndex];

  // Calculate generic positions if 'style' is not provided but 'position' is
  let computedStyle: ViewStyle = {};
  
  // Default fallback
  computedStyle = { alignSelf: 'center', top: height / 2 - 100 };

  if (!step.style && step.position) {
      switch (step.position) {
          case 'top':
              computedStyle = { top: height * 0.15, alignSelf: 'center' };
              break;
          case 'bottom':
              computedStyle = { bottom: height * 0.15, alignSelf: 'center' };
              break;
          case 'center':
              computedStyle = { alignSelf: 'center', top: height / 2 - 100 };
              break;
      }
  }

  // If style is provided, it overrides computedStyle
  const finalStyle = step.style || computedStyle;
  const finalArrowPosition = step.arrowPosition;

  // Calculate arrow style based on position
  const getArrowStyle = () => {
    const baseStyle: any = {};
    const arrowSize = 12;
    const offset = step.arrowOffset || 20;

    switch (step.arrowPosition) {
      case 'top':
        baseStyle.top = -arrowSize;
        baseStyle.left = offset;
        baseStyle.borderBottomColor = '#1F2937'; // Match bg color
        baseStyle.borderBottomWidth = arrowSize;
        baseStyle.borderLeftWidth = arrowSize;
        baseStyle.borderRightWidth = arrowSize;
        baseStyle.borderLeftColor = 'transparent';
        baseStyle.borderRightColor = 'transparent';
        break;
      case 'bottom':
        baseStyle.bottom = -arrowSize;
        baseStyle.left = offset;
        baseStyle.borderTopColor = '#1F2937';
        baseStyle.borderTopWidth = arrowSize;
        baseStyle.borderLeftWidth = arrowSize;
        baseStyle.borderRightWidth = arrowSize;
        baseStyle.borderLeftColor = 'transparent';
        baseStyle.borderRightColor = 'transparent';
        break;
       default:
        return { display: 'none' };
    }
    return baseStyle;
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        {/* Backdrop */}
        <View style={styles.backdrop} />

        {/* Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltip,
            finalStyle,
            { opacity: fadeAnim },
          ]}
        >
          {/* Arrow */}
          {step.arrowPosition && <View style={[styles.arrow, getArrowStyle()]} />}

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => speakCurrentStep(currentStepIndex)}
          >
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.stepCounter}>
                        {currentStepIndex + 1}/{steps.length}
                    </Text>
                </View>
                <Text style={styles.description}>{step.description}</Text>
                
                <View style={styles.hintContainer}>
                   <Text style={styles.audioHint}>
                     🔊 {getTranslation(language, 'tour_tap_to_hear')}
                   </Text>
                </View>
            </View>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>{getTranslation(language, 'close')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    backgroundColor: '#1F2937', 
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  content: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB', 
    flex: 1,
    marginRight: 8,
  },
  stepCounter: {
    fontSize: 12,
    color: '#9CA3AF', 
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#D1D5DB', 
    lineHeight: 22,
  },
  hintContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  audioHint: {
    fontSize: 11,
    color: '#60A5FA', 
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: '#9CA3AF', 
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4F46E5', 
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default FeatureTour;
