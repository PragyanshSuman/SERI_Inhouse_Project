import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../features/dashboard/HomeScreen';

import LetterTracingDashboard from '../features/letter-tracing/screens/LetterTracingDashboard';
import TracingScreen from '../features/letter-tracing/screens/TracingScreen';

import LetterMenuScreen from '../features/letter-tracing/screens/LetterMenuScreen';
import GuidedTracingScreen from '../features/letter-tracing/screens/GuidedTracingScreen';
import ComingSoonScreen from '../features/letter-tracing/screens/ComingSoonScreen';
import PronunciationDemoScreen from '../features/phonics-phonemes/screens/PronunciationDemoScreen';
import PhonicCheckDashboard from '../features/phonic-check/screens/PhonicCheckDashboard';
import PhonicCheckStudioScreen from '../features/phonic-check/screens/PhonicCheckStudioScreen';
import PhonicCheckResultScreen from '../features/phonic-check/screens/PhonicCheckResultScreen';
import ProgressScreen from '../features/phonic-check/screens/ProgressScreen';
import SettingsScreen from '../features/phonic-check/screens/SettingsScreen';

import OriginalAppNavigator from '../features/original-app/navigation/OriginalAppNavigator';
import VisualDiscriminationDashboard from '../features/visual-discrimination/screens/VisualDiscriminationDashboard';
import OddOneOutGameScreen from '../features/visual-discrimination/screens/OddOneOutGameScreen';
import LetterSortingGameScreen from '../features/visual-discrimination/screens/LetterSortingGameScreen';
import SightWordsDashboard from '../features/sight-words/screens/SightWordsDashboard';
import WordNinjaGameScreen from '../features/sight-words/screens/WordNinjaGameScreen';
import RhymeDashboard from '../features/rhyme-time/screens/RhymeDashboard';
import RhymingMatchGameScreen from '../features/rhyme-time/screens/RhymingMatchGameScreen';
import { DifficultyLevel } from '../data/sightWords';

export type RootStackParamList = {
  Home: undefined;
  LetterTracing: undefined;
  Tracing: { letter: string };
  LetterMenu: undefined;
  GuidedTracing: { letter: string; letterCase: string };
  ComingSoon: { title: string };
  PhonicsPhonemes: undefined;
  
  // New Phonic Check Routes
  PhonicCheck: undefined; // Maps to Studio now for direct access or we keep Dashboard?
  // Let's keep PhonicCheck logic:
  // Option A: Home -> PhonicCheckDashboard -> Practice (Old)
  // Option B: Home -> PhonicCheckStudio (New)
  // User wanted "like phonics phonemes", which is a single screen usually.
  // I will map 'PhonicCheck' to 'PhonicCheckStudioScreen' to replace the old dashboard directly if that's the goal, 
  // OR keep specific names.
  // Let's add new names for clarity.
  PhonicCheckStudio: undefined;
  PhonicCheckResult: { result: any; word: string };
  
  Progress: undefined; // Keep for now
  Settings: undefined;
  OriginalApp: undefined;
  VisualDiscriminationDashboard: undefined;
  OddOneOutGame: { pairId: string };
  LetterSortingGame: { pairId: string };
  SightWordsDashboard: undefined;
  WordNinjaGame: { levelId: DifficultyLevel };
  RhymeDashboard: undefined;
  RhymingMatchGame: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LetterTracing" component={LetterTracingDashboard} />
      <Stack.Screen name="Tracing" component={TracingScreen} />
      <Stack.Screen name="LetterMenu" component={LetterMenuScreen} />
      <Stack.Screen name="GuidedTracing" component={GuidedTracingScreen} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <Stack.Screen name="PhonicsPhonemes" component={PronunciationDemoScreen} />
      
      {/* Updated Phonic Check Flow */}
      <Stack.Screen name="PhonicCheck" component={PhonicCheckDashboard} /> 
      <Stack.Screen name="PhonicCheckStudio" component={PhonicCheckStudioScreen} />
      <Stack.Screen name="PhonicCheckResult" component={PhonicCheckResultScreen} />
      
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OriginalApp" component={OriginalAppNavigator} />
      
      {/* Visual Discrimination Module */}
      <Stack.Screen name="VisualDiscriminationDashboard" component={VisualDiscriminationDashboard} />
      <Stack.Screen name="OddOneOutGame" component={OddOneOutGameScreen} />
      <Stack.Screen name="LetterSortingGame" component={LetterSortingGameScreen} />
      
      {/* Sight Words Module */}
      <Stack.Screen name="SightWordsDashboard" component={SightWordsDashboard} />
      <Stack.Screen name="WordNinjaGame" component={WordNinjaGameScreen} />

      {/* Rhyme Time Module */}
      <Stack.Screen name="RhymeDashboard" component={RhymeDashboard} />
      <Stack.Screen name="RhymingMatchGame" component={RhymingMatchGameScreen} />
    </Stack.Navigator>
  );
}
