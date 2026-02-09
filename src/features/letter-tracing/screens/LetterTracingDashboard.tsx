// src/screens/HomeScreen.tsx - ADD NEW BUTTON

import React from 'react';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import {
  View,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';

const { width: SCREEN_W } = Dimensions.get('window');

const BG = require('../assets/images/background_for_initial_home_screen.png');
const BTN1 = require('../assets/images/button1.png');

export default function LetterTracingDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language } = useLanguage();

  // Tour State
  const [tourVisible, setTourVisible] = React.useState(true);

  const tourSteps: TourStep[] = [
      {
          title: getTranslation(language, 'tour_tracing_playground_title'),
          description: getTranslation(language, 'tour_tracing_playground_desc'),
          position: 'top' as const,
          style: { top: 100, alignSelf: 'center' as const },
          arrowPosition: 'bottom' as const,
          arrowOffset: 110,
      },
      {
          title: getTranslation(language, 'tour_tracing_practice_title'),
          description: getTranslation(language, 'tour_tracing_practice_desc'),
          position: 'center' as const,
          style: { top: '60%', alignSelf: 'center' as const },
          arrowPosition: 'top' as const,
          arrowOffset: 110,
      }
  ];

  const handleTourComplete = () => {
      setTourVisible(false);
  };

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.title}>{getTranslation(language, 'tour_tracing_playground_title')}</Text>

        <View style={styles.buttonsRow}>
          <HomeButton
            image={BTN1}
            label={getTranslation(language, 'tour_tracing_practice_title')}
            onPress={() => navigation.navigate('LetterMenu')}
          />
        </View>
      </View>
      <FeatureTour 
        visible={tourVisible}
        steps={tourSteps}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </ImageBackground>
  );
}

function HomeButton({
  image,
  label,
  onPress,
}: {
  image: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.btnWrap}>
      <Image source={image} style={styles.btnImage} resizeMode="cover" />
      <Text style={styles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const CARD_W = Math.min(180, SCREEN_W * 0.28);
const CARD_H = CARD_W;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  title: {
    color: '#1F2937',
    fontSize: 28,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  btnWrap: {
    width: CARD_W,
    height: CARD_H + 34,
    alignItems: 'center',
  },
  btnImage: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#0EA5E9',
  },
  btnLabel: {
    marginTop: 8,
    color: '#0F172A',
    fontWeight: '800',
  },
  // NEW: Guided Tracing Button
  guidedButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  guidedButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
