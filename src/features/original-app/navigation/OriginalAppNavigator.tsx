import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import TracingScreen from '../screens/TracingScreen';
import { ALPHABET } from '../constants/LetterPaths';
import WritingAssessmentScreen from '../screens/WritingAssessmentScreen';
import FeatureTour, { TourStep } from '../../../components/FeatureTour'; // Dark-themed tour
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';

const Stack = createStackNavigator();
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const GRID_PADDING = 20;
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (width - (GRID_PADDING * 2)) / COLUMN_COUNT - (ITEM_MARGIN * 2);

const BG = require('../../../assets/images/letters/Tracing_Menu_Background_New.png');

// Letter Selection Screen
const LetterSelectionScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [tourVisible, setTourVisible] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    // Preload audio files
    const timer = setTimeout(() => {
      console.log('Audio files preloaded (simulated)');
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLetterPress = (letter: string) => {
    navigation.navigate('Tracing', { letter });
  };

  const renderLetterItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.letterButton}
      onPress={() => handleLetterPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.letterButtonText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={BG} style={styles.container} resizeMode="cover">
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{getTranslation(language, 'tour_letter_mastery_title')}</Text>
        <Text style={styles.subtitle}>{getTranslation(language, 'tour_letter_mastery_desc')}</Text>
        <TouchableOpacity 
            style={styles.assessmentButton}
            onPress={() => navigation.navigate('Assessment')}
        >
            <Text style={styles.assessmentButtonText}>{getTranslation(language, 'tour_take_assessment_title')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{getTranslation(language, 'loading_audio')}</Text>
        </View>
      ) : (
        <FlatList
          data={ALPHABET}
          renderItem={renderLetterItem}
          keyExtractor={item => item}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.letterGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
            {getTranslation(language, 'footer_dyslexia')}
        </Text>
      </View>
      
      <FeatureTour 
        visible={tourVisible}
        steps={[
            {
                title: getTranslation(language, 'tour_letter_mastery_title'),
                description: getTranslation(language, 'tour_letter_mastery_desc'),
                style: { top: 120, alignSelf: 'center' as const },
                arrowPosition: 'top' as const,
                arrowOffset: 110, // Center of 240px card
            },
            {
                title: getTranslation(language, 'tour_take_assessment_title'),
                description: getTranslation(language, 'tour_take_assessment_desc'),
                style: { top: 210, alignSelf: 'center' as const },
                arrowPosition: 'top' as const,
                arrowOffset: 110,
            },
            {
                title: getTranslation(language, 'tour_scroll_more_title'),
                description: getTranslation(language, 'tour_scroll_more_desc'),
                style: { bottom: 80, alignSelf: 'center' as const },
                arrowPosition: 'bottom' as const, 
                arrowOffset: 110,
            }
        ]}
        onComplete={() => setTourVisible(false)} 
        onSkip={() => setTourVisible(false)}
      />
    </SafeAreaView>
    </ImageBackground>
  );
};

// Tracing Screen Wrapper
const TracingScreenWrapper = ({ route, navigation }: any) => {
  const { letter } = route.params;

  const handleComplete = (analytics: any) => {
    console.log('Session completed:', analytics);
  };

  const handleExit = () => {
    navigation.goBack();
  };

  return (
    <TracingScreen
      letter={letter}
      userId="demo_user_001"
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};

// Main Navigator
const OriginalAppNavigator = () => {
  return (
      <Stack.Navigator
        initialRouteName="LetterSelection"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="LetterSelection"
          component={LetterSelectionScreen}
        />
        <Stack.Screen
          name="Tracing"
          component={TracingScreenWrapper}
        />
        <Stack.Screen
          name="Assessment"
          component={WritingAssessmentScreen}
        />
      </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    marginTop: 60, // Push down from status bar
    marginHorizontal: 20, // Create floating effect
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slightly more opaque for readability
    borderRadius: 24, // Softer corners
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    marginBottom: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#283593', // Deep, authoritative blue
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7986CB', // Soft indigo
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  assessmentButton: {
    marginTop: 15,
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
  },
  assessmentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9FA8DA',
    marginTop: 12,
  },
  letterGrid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  letterButton: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.1, // Fixed Aspect Ratio (vertical rectangle)
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    margin: ITEM_MARGIN,
    borderRadius: 24, // Very round, pebble-like
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#303F9F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Stronger pop
    shadowRadius: 6,
    borderWidth: 0, // Removed border for cleaner look
  },
  letterButtonText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#3949AB',
    fontFamily: 'sans-serif-medium', // Cleaner font on Android
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    display: 'none', // Hide footer to save space
  },
  footerText: {
    fontSize: 12,
    color: '#B0BEC5',
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default OriginalAppNavigator;
