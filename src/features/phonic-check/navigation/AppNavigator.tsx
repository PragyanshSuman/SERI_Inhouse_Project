// src/navigation/AppNavigator.tsx - Stack navigation

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhonicCheckDashboard from '../screens/PhonicCheckDashboard';
import PracticeScreen from '../screens/PracticeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MedicalReportScreen from '../screens/MedicalReportScreen';
import PhonicCheckResultScreen from '../screens/PhonicCheckResultScreen';

export type RootStackParamList = {
  PhonicCheckDashboard: undefined;
  Practice: { categoryId: string; difficulty: string };
  Progress: undefined;
  Settings: undefined;
  MedicalReport: undefined;
  PhonicCheckResult: { result: any, word: string, source?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="PhonicCheckDashboard" component={PhonicCheckDashboard} />
        <Stack.Screen name="Practice" component={PracticeScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="MedicalReport" component={MedicalReportScreen} />
        <Stack.Screen name="PhonicCheckResult" component={PhonicCheckResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
