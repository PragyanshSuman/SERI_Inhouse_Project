import React, { useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LetterSelectionScreen from '../screens/LetterSelectionScreen';
import TracingScreen from '../screens/TracingScreen';
import WritingAssessmentScreen from '../screens/WritingAssessmentScreen';
import ProgressDashboard from '../screens/ProgressDashboard';
import SessionSummary from '../screens/SessionSummary';
import { DT } from '../../../utils/DyslexiaTheme';

const Stack = createStackNavigator();

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─────────────────────────────────────────────────────────────────────────────
// Letter Picker Strip Component
// Floats at the bottom of the TracingScreen so the child can switch letters
// without going back to the menu.
// ─────────────────────────────────────────────────────────────────────────────
function LetterPickerStrip({
  activeLetter,
  onSelect,
}: {
  activeLetter: string;
  onSelect: (letter: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndex = ALPHABET.indexOf(activeLetter.toUpperCase());

  // Scroll to active letter on mount / change
  React.useEffect(() => {
    if (scrollRef.current && activeIndex >= 0) {
      // Each pill is 38 + 8 gap = 46px, center it
      scrollRef.current.scrollTo({
        x: Math.max(0, activeIndex * 46 - 120),
        animated: true,
      });
    }
  }, [activeIndex]);

  return (
    <View style={pickerStyles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pickerStyles.scroll}
      >
        {ALPHABET.map((l) => {
          const isActive = l === activeLetter.toUpperCase();
          return (
            <TouchableOpacity
              key={l}
              onPress={() => onSelect(l)}
              style={[pickerStyles.pill, isActive && pickerStyles.pillActive]}
              activeOpacity={0.75}
            >
              <Text style={[pickerStyles.pillText, isActive && pickerStyles.pillTextActive]}>
                {l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TracingScreenWrapper
// Wraps TracingScreen and adds the letter picker strip so the child can switch
// letters without navigating back to LetterSelectionScreen.
// ─────────────────────────────────────────────────────────────────────────────
const TracingScreenWrapper = ({ route, navigation }: any) => {
  const { letter: initialLetter, userId = 'demo_user_001' } = route.params;
  const [activeLetter, setActiveLetter] = useState<string>(
    (initialLetter ?? 'A').toUpperCase()
  );

  const handleExit = () => {
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Key forces a full remount of TracingScreen when letter changes,
          so all canvas state, session hooks, and path data reset cleanly */}
      <TracingScreen
        key={activeLetter}
        letter={activeLetter}
        userId={userId}
        onExit={handleExit}
      />

      <LetterPickerStrip
        activeLetter={activeLetter}
        onSelect={(l) => setActiveLetter(l)}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigator
// ─────────────────────────────────────────────────────────────────────────────
const OriginalAppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="LetterSelection"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen name="LetterSelection" component={LetterSelectionScreen} />
      <Stack.Screen name="Tracing" component={TracingScreenWrapper} />
      <Stack.Screen name="Assessment" component={WritingAssessmentScreen} />
      <Stack.Screen name="ProgressDashboard" component={ProgressDashboard} />
      <Stack.Screen name="SessionSummary" component={SessionSummary} />
    </Stack.Navigator>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderTopColor: `rgba(30,64,175,0.15)`,
    shadowColor: DT.accent.navy,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  scroll: {
    paddingHorizontal: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DT.surface.card,
    borderWidth: 1.5,
    borderColor: DT.surface.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: DT.accent.navy,
    borderColor: DT.accent.indigo,
    shadowColor: DT.accent.navy,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    transform: [{ scale: 1.15 }],
  },
  pillText: {
    fontSize: 15,
    fontWeight: '800',
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'OpenDyslexic-Bold',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});

export default OriginalAppNavigator;
