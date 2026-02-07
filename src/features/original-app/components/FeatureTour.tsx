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

const { width, height } = Dimensions.get('window');

// Export TourStep for external use
export interface TourStep {
  title: string;
  description: string;
  style?: ViewStyle; // Absolute positioning
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  arrowOffset?: number; // Distance from the start of the side
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

  // Reset when visibility changes
  useEffect(() => {
    console.log('FeatureTour: visible changed to', visible);
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
        animateIn(); 
    }
  }, [currentStepIndex]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

  if (!visible) return null;

  const currentStep = steps[currentStepIndex];

  // Default center if no position given
  const defaultPosition = { top: height / 2 - 100 };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay} pointerEvents="box-none"> 
      {/* pointerEvents="box-none" allows clicks to pass through empty areas if needed, but here we cover screen */}
      
        <Animated.View
          style={[
            styles.card,
            currentStep.style || defaultPosition, // Use custom style OR default center
            { opacity: fadeAnim },
          ]}
        >
          {/* Arrow Indicator */}
          {currentStep.arrowPosition === 'top' && <View style={[styles.arrow, styles.arrowTop, { left: currentStep.arrowOffset ?? 20 }]} />}
          {currentStep.arrowPosition === 'bottom' && <View style={[styles.arrow, styles.arrowBottom, { left: currentStep.arrowOffset ?? 20 }]} />}
          {currentStep.arrowPosition === 'right' && <View style={[styles.arrow, styles.arrowRight, { top: currentStep.arrowOffset ?? 20 }]} />}
          {currentStep.arrowPosition === 'left' && <View style={[styles.arrow, styles.arrowLeft, { top: currentStep.arrowOffset ?? 20 }]} />}
          
          <TouchableOpacity onPress={onSkip} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          <View style={styles.footer}>
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
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Very dim background
  },
  card: {
    width: 200, // Very compact
    backgroundColor: '#1F2937', // Dark Slate - MUST BE DARK!
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    position: 'absolute',
    alignSelf: 'center', // Default center horizontally if no left/right
  },
  closeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 10,
      padding: 4,
  },
  closeText: {
      fontSize: 12,
      color: '#9CA3AF', // Gray-400
      fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F4F6', // Gray-100
    marginBottom: 4,
    paddingRight: 20, // Space for close button
  },
  description: {
    fontSize: 12,
    color: '#D1D5DB', // Gray-300
    lineHeight: 16,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  nextButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#4F46E5', // Indigo-600
    borderRadius: 6,
  },
  nextButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  dotsContainer: {
      flexDirection: 'row',
      gap: 4,
  },
  dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#4B5563', // Gray-600
  },
  activeDot: {
      backgroundColor: '#4F46E5', // Indigo-600
      width: 12,
  },
  // Arrows
  arrow: {
      position: 'absolute',
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
  },
  arrowTop: {
      top: -12, // More extrusion
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderBottomWidth: 12, // Longer point
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: '#1F2937', 
  },
  arrowBottom: {
      bottom: -12,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderTopWidth: 12,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#1F2937', 
  },
  arrowRight: {
      right: -12,
      borderTopWidth: 10,
      borderBottomWidth: 10,
      borderLeftWidth: 12,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: '#1F2937', 
  },
  arrowLeft: {
      left: -12,
      borderTopWidth: 10,
      borderBottomWidth: 10,
      borderRightWidth: 12,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: '#1F2937', 
  },
});

export default FeatureTour;
