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
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import TracingScreen from '../screens/TracingScreen';
import { ALPHABET } from '../constants/LetterPaths';
import WritingAssessmentScreen from '../screens/WritingAssessmentScreen';
import FeatureTour, { TourStep } from '../components/FeatureTour'; // Dark-themed tour

const Stack = createStackNavigator();
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const GRID_PADDING = 20;
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (width - (GRID_PADDING * 2)) / COLUMN_COUNT - (ITEM_MARGIN * 2);

// Letter Selection Screen
const LetterSelectionScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [tourVisible, setTourVisible] = useState(false); // No tour on this page

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Letter Mastery</Text>
        <Text style={styles.subtitle}>Select a letter to begin practice</Text>
        <TouchableOpacity 
            style={styles.assessmentButton}
            onPress={() => navigation.navigate('Assessment')}
        >
            <Text style={styles.assessmentButtonText}>Take Assessment</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading audio files...</Text>
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
          Designed for children with dyslexia
        </Text>
      </View>
      
      <FeatureTour 
        visible={tourVisible}
        steps={[
            {
                title: "Letter Mastery 🏆",
                description: "Select a letter to begin practicing.",
                style: { top: 60, alignSelf: 'center' as const },
                arrowPosition: 'bottom' as const,
                arrowOffset: 92,
            },
            {
                title: "Take Assessment 📝",
                description: "Tap here to take a writing assessment.",
                style: { top: 160, alignSelf: 'center' as const },
                arrowPosition: 'bottom' as const,
                arrowOffset: 92,
            },
            {
                title: "Select a Letter 🅰️",
                description: "Tap any letter to start tracing.",
                style: { top: '40%' as any, alignSelf: 'center' as const },
                arrowPosition: 'bottom' as const,
                arrowOffset: 92,
            },
            {
                title: "Scroll for More 📜",
                description: "Scroll down to see more letters.",
                style: { bottom: 100, alignSelf: 'center' as const },
                arrowPosition: 'bottom' as const,
            }
        ]}
        onComplete={() => setTourVisible(false)} 
        onSkip={() => setTourVisible(false)}
      />
    </SafeAreaView>
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
    backgroundColor: '#F0F2F5', // Slightly cooler grey for better contrast
  },
  headerContainer: {
    paddingTop: 60, // More top space for status bar
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
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
    backgroundColor: '#FFFFFF',
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
