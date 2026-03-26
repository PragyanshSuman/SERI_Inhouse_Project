import 'react-native-gesture-handler';
import React from 'react';
import { SettingsProvider } from './src/context/SettingsContext';
import { EmotionProvider } from './src/context/EmotionContext';
import { AuthProvider } from './src/context/AuthContext';
import { AIRoadmapProvider } from './src/context/AIRoadmapContext';
import AssistiveOverlay from './src/components/AssistiveOverlay';
import AIRoadmapController from './src/components/AIRoadmapController';
import AdaptivePathingModal from './src/components/AdaptivePathingModal';
import WellnessAdvisorModal from './src/components/WellnessAdvisorModal';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenDyslexic-Regular': require('./src/assets/fonts/OpenDyslexic-Regular.otf'),
  });

  if (!fontsLoaded) {
    return null; // Or a splash screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <EmotionProvider>
              <AIRoadmapProvider>
                <StatusBar style="auto" />

                <NavigationContainer ref={navigationRef}>
                  <RootNavigator />
                </NavigationContainer>

                {/* Dyslexia assistive tools overlay */}
                <AssistiveOverlay />
                
                {/* Global AI Roadmap components now outside NavigationContainer 
                    but using navigationRef for deep linking */}
                <AIRoadmapController />
                <AdaptivePathingModal />
                <WellnessAdvisorModal />
              </AIRoadmapProvider>
            </EmotionProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
