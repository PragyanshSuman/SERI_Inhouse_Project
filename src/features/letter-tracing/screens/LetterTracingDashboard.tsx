// src/screens/LetterTracingDashboard.tsx

import React from 'react';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage, useSettings } from '../../../context/SettingsContext';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import { getTranslation } from '../../../utils/Translations';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';

const { width: SCREEN_W } = Dimensions.get('window');

// Using the Letter Practice image (button1.png) as the icon for Scalable Alphabet Mode
const BTN1 = require('../assets/images/button1.png');

export default function LetterTracingDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language } = useLanguage();
  const { settings } = useSettings();

  const [tourVisible, setTourVisible] = React.useState(false);

  const tourSteps: TourStep[] = [
    {
      title: getTranslation(language, 'tour_tracing_playground_title'),
      description: getTranslation(language, 'tour_tracing_playground_desc'),
      position: 'top' as const,
      style: { top: 100, alignSelf: 'center' as const },
      arrowPosition: 'bottom' as const,
      arrowOffset: 110,
    },
  ];

  const handleTourComplete = () => {
    setTourVisible(false);
  };

  return (
    <View style={styles.bg}>
      <EmotionTracker moduleName="Tracing Dashboard" isActive={!tourVisible} />
      <View style={styles.overlay} />
      <BackButton color={DT.accent.indigo} />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.indigo} />

      <View style={styles.content}>
        <Text style={styles.title}>{getTranslation(language, 'tour_tracing_playground_title')}</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ScalableLetterMenu')}
          style={styles.singleCard}
        >
          <Image source={BTN1} style={styles.cardImage} resizeMode="cover" />
          <Text style={styles.cardLabel}>Scalable Alphabet Mode</Text>
        </TouchableOpacity>
      </View>

      <FeatureTour
        visible={tourVisible}
        steps={tourSteps}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </View>
  );
}

const CARD_SIZE = Math.min(240, SCREEN_W * 0.55);

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: DT.bg.skyBlue,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Bold',
    letterSpacing: DT.typography.letterSpacingUI,
  },
  singleCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cardImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#0EA5E9',
  },
  cardLabel: {
    marginTop: 14,
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 18,
  },
});
