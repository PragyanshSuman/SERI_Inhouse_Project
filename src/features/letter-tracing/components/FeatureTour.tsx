import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface TourStep {
  title: string;
  description: string;
  target?: any; // Could be layout info if we want to position relative to elements
  position?: 'top' | 'center' | 'bottom';
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
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Reset when visibility changes
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  // Animate when step changes
  useEffect(() => {
    if (visible) {
        // Pulse effect or slide transition between steps could go here
        animateIn(); 
    }
  }, [currentStepIndex]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const animateOut = () => {
      Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
      }).start();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!visible) return null;

  const currentStep = steps[currentStepIndex];

  // Calculate position style
  let positionStyle = styles.cardCenter;
  if (currentStep.position === 'top') positionStyle = styles.cardTop;
  if (currentStep.position === 'bottom') positionStyle = styles.cardBottom;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            positionStyle,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
              <Text style={styles.stepIndicator}>
                  Step {currentStepIndex + 1} of {steps.length}
              </Text>
              <TouchableOpacity onPress={onSkip}>
                  <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
          </View>
          
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          <View style={styles.footer}>
            {currentStepIndex > 0 ? (
                <TouchableOpacity onPress={handleBack} style={styles.navButton}>
                    <Text style={styles.navButtonText}>Back</Text>
                </TouchableOpacity>
            ) : <View style={{width: 60}} />} 
            
            {/* Spacer if no back button to keep layout balanced? Or just flex-end */}

            <View style={styles.dotsContainer}>
                {steps.map((_, idx) => (
                    <View 
                        key={idx} 
                        style={[
                            styles.dot, 
                            idx === currentStepIndex && styles.activeDot
                        ]} 
                    />
                ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, styles.primaryButton]}
            >
              <Text style={[styles.navButtonText, styles.primaryButtonText]}>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'absolute',
  },
  cardCenter: {
    // Default center is handled by overlay justifyContent
  },
  cardTop: {
      top: height * 0.15,
  },
  cardBottom: {
      bottom: height * 0.15,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  stepIndicator: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#94A3B8',
      textTransform: 'uppercase',
  },
  skipText: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  primaryButton: {
    backgroundColor: '#4F46E5', // Indigo 600
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
  },
  dotsContainer: {
      flexDirection: 'row',
      gap: 8,
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E2E8F0',
  },
  activeDot: {
      backgroundColor: '#4F46E5',
      width: 20, // Stretch effect
  }
});

export default FeatureTour;
