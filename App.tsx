import 'react-native-gesture-handler';
import React from 'react';
import { SettingsProvider } from './src/context/SettingsContext';
import { EmotionProvider } from './src/context/EmotionContext';
import { AuthProvider } from './src/context/AuthContext';
import { AIRoadmapProvider } from './src/context/AIRoadmapContext';
import { LearningPathProvider } from './src/features/learning-path/context/LearningPathContext';
import AssistiveOverlay from './src/components/AssistiveOverlay';
import AIRoadmapController from './src/components/AIRoadmapController';
import AdaptivePathingModal from './src/components/AdaptivePathingModal';
import WellnessAdvisorModal from './src/components/WellnessAdvisorModal';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useExpoFonts } from 'expo-font';
import { useFonts as useLexendFonts, Lexend_400Regular } from '@expo-google-fonts/lexend';
import { useFonts as useRobotoFonts, Roboto_400Regular } from '@expo-google-fonts/roboto';
import { useFonts as useOpenSansFonts, OpenSans_400Regular } from '@expo-google-fonts/open-sans';
import { useFonts as useAtkinsonFonts, AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [expoFontsLoaded] = useExpoFonts({
    'OpenDyslexic-Regular': require('./src/assets/fonts/OpenDyslexic-Regular.otf'),
  });
  
  const [lexendLoaded] = useLexendFonts({ 'Lexend-Regular': Lexend_400Regular });
  const [robotoLoaded] = useRobotoFonts({ 'Roboto-Regular': Roboto_400Regular });
  const [openSansLoaded] = useOpenSansFonts({ 'OpenSans-Regular': OpenSans_400Regular });
  const [atkinsonLoaded] = useAtkinsonFonts({ 'AtkinsonHyperlegible-Regular': AtkinsonHyperlegible_400Regular });

  if (!expoFontsLoaded || !lexendLoaded || !robotoLoaded || !openSansLoaded || !atkinsonLoaded) {
    return null; // Await secure typography cache
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <EmotionProvider>
              <AIRoadmapProvider>
                <LearningPathProvider>
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
                </LearningPathProvider>
              </AIRoadmapProvider>
            </EmotionProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
