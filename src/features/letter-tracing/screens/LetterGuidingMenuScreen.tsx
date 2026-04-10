// src/features/letter-tracing/screens/LetterGuidingMenuScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Image,
  Text,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { getAvailableLetters, isLetterAvailable } from '../letters';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useSettings } from '../../../context/SettingsContext';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';

const { width: SCREEN_W } = Dimensions.get('window');

// Tweak for tablets vs phones
const isTablet = SCREEN_W > 700;
const COLS = isTablet ? 6 : 4;
const GAP = isTablet ? 16 : 12;

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function letterAsset(letter: string) {
  const map: Record<string, any> = {
    A: require('../assets/images/letters/A.png'),
    B: require('../assets/images/letters/B.png'),
    C: require('../assets/images/letters/C.png'),
    D: require('../assets/images/letters/D.png'),
    E: require('../assets/images/letters/E.png'),
    F: require('../assets/images/letters/F.png'),
    G: require('../assets/images/letters/G.png'),
    H: require('../assets/images/letters/H.png'),
    I: require('../assets/images/letters/I.png'),
    J: require('../assets/images/letters/J.png'),
    K: require('../assets/images/letters/K.png'),
    L: require('../assets/images/letters/L.png'),
    M: require('../assets/images/letters/M.png'),
    N: require('../assets/images/letters/N.png'),
    O: require('../assets/images/letters/O.png'),
    P: require('../assets/images/letters/P.png'),
    Q: require('../assets/images/letters/Q.png'),
    R: require('../assets/images/letters/R.png'),
    S: require('../assets/images/letters/S.png'),
    T: require('../assets/images/letters/T.png'),
    U: require('../assets/images/letters/U.png'),
    V: require('../assets/images/letters/V.png'),
    W: require('../assets/images/letters/W.png'),
    X: require('../assets/images/letters/X.png'),
    Y: require('../assets/images/letters/Y.png'),
    Z: require('../assets/images/letters/Z.png'),
  };
  return map[letter];
}

export default function LetterGuidingMenuScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { settings } = useSettings();
  const [tourVisible, setTourVisible] = useState(false);

  // Get available letters from the letter registry
  const availableLetters = useMemo(() => getAvailableLetters(), []);

  // Card width derived from screen, columns and gaps
  const CARD_W = useMemo(
    () => Math.floor((SCREEN_W - GAP * (COLS + 1)) / COLS),
    []
  );
  const CARD_H = CARD_W; // square

  // Handle letter press
  const handleLetterPress = (letter: string) => {
    navigation.navigate('GuidedTracing', { 
      letter, 
      letterCase: 'upper' 
    });
  };

  return (
    <View style={styles.bg}>
      <EmotionTracker moduleName="Guided Tracing Menu" isActive={!tourVisible} />
      <BackButton color={DT.accent.indigo} />
      <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.indigo} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Guided Tracing</Text>
        <Text style={styles.subtitle}>
          {availableLetters.length} of {ALL_LETTERS.length} letters available
        </Text>
      </View>

      <FlatList
        contentContainerStyle={[
          styles.grid,
          { paddingHorizontal: GAP, gap: GAP, paddingBottom: 28 },
        ]}
        data={ALL_LETTERS}
        keyExtractor={(item) => item}
        numColumns={COLS}
        renderItem={({ item }) => {
          const isAvailable = isLetterAvailable(item);
          
          return (
            <LiftedCard
              width={CARD_W}
              height={CARD_H}
              onPress={() => handleLetterPress(item)}
              source={letterAsset(item)}
              disabled={!isAvailable}
              isAvailable={isAvailable}
              letter={item}
            />
          );
        }}
      />
      
      <FeatureTour
        visible={tourVisible}
        steps={[
          {
            title: "Guided Tracing ✍️",
            description: "Pick a letter to practice your tracing skills with step-by-step guidance.",
            style: { top: 100, alignSelf: 'center' },
            arrowPosition: 'top',
          },
        ]}
        onComplete={() => setTourVisible(false)}
        onSkip={() => setTourVisible(false)}
      />
    </View>
  );
}

// A reusable lifted card with transparent background, dual shadows and press scale
function LiftedCard({
  width,
  height,
  source,
  onPress,
  disabled = false,
  isAvailable = true,
  letter,
}: {
  width: number;
  height: number;
  source: any;
  onPress: () => void;
  disabled?: boolean;
  isAvailable?: boolean;
  letter: string;
}) {
  const [scale] = useState(new Animated.Value(1));

  const pressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 6 }).start();
  };
  
  const pressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableWithoutFeedback 
      onPressIn={pressIn} 
      onPressOut={pressOut} 
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.cardWrap,
          {
            width,
            height,
            transform: [{ scale }],
            opacity: isAvailable ? 1 : 0.4,
          },
        ]}
      >
        {/* Outer soft shadow */}
        <View style={[styles.shadowA, !isAvailable && styles.shadowDisabled]} />
        {/* Inner tighter shadow + content */}
        <View style={[styles.cardInner, !isAvailable && styles.cardDisabled]}>
          <Image source={source} style={styles.image} resizeMode="contain" />
          {/* Top subtle gloss for depth */}
          <View pointerEvents="none" style={styles.gloss} />
          {/* Coming Soon badge for unavailable letters */}
          {!isAvailable && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: DT.bg.skyBlue,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  title: {
    fontSize: 28,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Bold',
    letterSpacing: DT.typography.letterSpacingUI,
  },
  subtitle: {
    fontSize: 16,
    color: DT.text.secondary,
    marginTop: 4,
    fontWeight: DT.typography.weightMedium,
  },
  grid: {
    justifyContent: 'center',
    paddingTop: 10,
  },
  cardWrap: {
    borderRadius: 22,
    marginVertical: GAP / 2,
  },
  shadowA: {
    ...Platform.select({
      ios: {
        shadowColor: DT.shadow.soft.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
      },
      android: { elevation: 6 },
    }),
    borderRadius: 22,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    bottom: 0,
  },
  shadowDisabled: {
    ...Platform.select({
      ios: { shadowOpacity: 0.05 },
      android: { elevation: 1 },
    }),
  },
  cardInner: {
    borderRadius: 22,
    backgroundColor: DT.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: DT.shadow.soft.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
    flex: 1,
  },
  cardDisabled: {
    ...Platform.select({
      ios: { shadowOpacity: 0.04 },
      android: { elevation: 1 },
    }),
  },
  image: {
    width: '94%',
    height: '94%',
    borderRadius: 20,
  },
  gloss: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    height: '40%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: DT.surface.softOverlay,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: DT.accent.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 8,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.onDark,
    textTransform: 'uppercase',
  },
});
