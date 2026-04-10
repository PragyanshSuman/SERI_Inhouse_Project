// src/features/letter-tracing/screens/GuidedTracingScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import FeatureTour from '../../../components/FeatureTour';
import EmotionTracker from '../../../components/EmotionTracker';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import { useSettings } from '../../../context/SettingsContext';
import { DT } from '../../../utils/DyslexiaTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GuidedTracingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GuidedTracing'
>;

export default function GuidedTracingScreen() {
  const navigation = useNavigation<GuidedTracingScreenNavigationProp>();

  const handleGuidedPractice = () => {
    // Navigate to LetterMenuScreen for guided practice
    navigation.navigate('LetterMenu');
  };

  const handleUnguidedPractice = () => {
    // Navigate to unguided practice if available
    console.log('Unguided Alphabet Practice clicked');
  };

  // Tour State
  const { settings } = useSettings();
  const [tourVisible, setTourVisible] = React.useState(false);

  const tourSteps = [
    {
      title: "Guided Practice 🎯",
      description: "This mode helps you learn letter formation step-by-step.",
      position: 'top' as const,
    },
    {
      title: "Visual Guides 👁️",
      description: "Follow the on-screen indicators and ghost hand.",
      position: 'bottom' as const,
    },
    {
      title: "Challenge Mode 💪",
      description: "Try Unguided Practice later to test your memory!",
      position: 'bottom' as const,
    }
  ];

  const handleTourComplete = () => {
    setTourVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Alphabet Playground" isActive={!tourVisible} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />
      <BackButton color={DT.accent.indigo} />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.indigo} />
      
      <View style={styles.content}>
        
        {/* Guided Alphabet Practice Button */}
        <TouchableOpacity
          style={[styles.button, styles.guidedButton]}
          onPress={handleGuidedPractice}
          activeOpacity={0.85}
        >
          <View style={styles.buttonContent}>
            <View style={[styles.iconCircle, styles.guidedIconBg]}>
              <Text style={styles.icon}>👁️</Text>
            </View>
            
            <Text style={styles.buttonTitle}>Guided Alphabet Practice</Text>
            
            <Text style={styles.buttonDescription}>
              Follow visual guides to learn proper letter formation
            </Text>
            
            <View style={[styles.badge, styles.guidedBadge]}>
              <Text style={styles.badgeText}>🌟 Recommended</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Unguided Alphabet Practice Button */}
        <TouchableOpacity
          style={[styles.button, styles.unguidedButton]}
          onPress={handleUnguidedPractice}
          activeOpacity={0.85}
        >
          <View style={styles.buttonContent}>
            <View style={[styles.iconCircle, styles.unguidedIconBg]}>
              <Text style={styles.icon}>🎯</Text>
            </View>
            
            <Text style={styles.buttonTitle}>Unguided Alphabet Practice</Text>
            
            <Text style={styles.buttonDescription}>
              Practice writing letters independently from memory
            </Text>
            
            <View style={[styles.badge, styles.unguidedBadge]}>
              <Text style={styles.badgeText}>💪 Challenge Mode</Text>
            </View>
          </View>
        </TouchableOpacity>

      </View>
      <FeatureTour 
        visible={tourVisible}
        steps={tourSteps}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.cream,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  button: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 24,
    ...DT.shadow.soft,
    borderWidth: 2,
    borderColor: DT.surface.cardBorder,
  },
  guidedButton: {
    borderColor: DT.accent.indigo,
  },
  unguidedButton: {
    borderColor: DT.accent.teal,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidedIconBg: {
    backgroundColor: DT.bg.lavender,
  },
  unguidedIconBg: {
    backgroundColor: DT.bg.sage,
  },
  icon: {
    fontSize: 42,
  },
  buttonTitle: {
    fontSize: 24,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    textAlign: 'center',
    letterSpacing: DT.typography.letterSpacingUI,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  buttonDescription: {
    fontSize: 16,
    fontWeight: DT.typography.weightMedium,
    color: DT.text.secondary,
    textAlign: 'center',
    lineHeight: DT.typography.lineHeightBody,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: DT.radius.pill,
    marginTop: 4,
  },
  guidedBadge: {
    backgroundColor: DT.bg.lavender,
  },
  unguidedBadge: {
    backgroundColor: DT.bg.sage,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
  },
});
