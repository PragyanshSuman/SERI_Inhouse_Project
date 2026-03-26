import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { LinearGradient } from 'expo-linear-gradient';
import EmotionTracker from '../../../components/EmotionTracker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VisualDiscriminationDashboard'>;

const { width } = Dimensions.get('window');

const CONFUSION_PAIRS = [
  { id: 'b_d', label: 'b vs d', icon: 'bd' },
  { id: 'p_q', label: 'p vs q', icon: 'pq' },
  { id: 'm_w', label: 'm vs w', icon: 'mw' },
  { id: 'n_u', label: 'n vs u', icon: 'nu' },
];

export default function VisualDiscriminationDashboard() {
  const navigation = useNavigation<NavigationProp>();
  const { language } = useLanguage();
  const [tourVisible, setTourVisible] = useState(true);

  const tourSteps: TourStep[] = [
    {
      title: getTranslation(language, 'tour_vd_welcome_title'),
      description: getTranslation(language, 'tour_vd_welcome_desc'),
      position: 'center',
      arrowPosition: 'top',
      style: { top: 150, alignSelf: 'center' },
    },
    {
      title: getTranslation(language, 'tour_vd_pairs_title'),
      description: getTranslation(language, 'tour_vd_pairs_desc'),
      position: 'bottom',
      arrowPosition: 'top',
      style: { top: 250, alignSelf: 'center' },
    },
  ];

  const handlePairSelect = (pairId: string) => {
    navigation.navigate('LetterSortingGame', { pairId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Visual Discrimination Dashboard" isActive={!tourVisible} />
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View>
             <Text style={styles.title}>{getTranslation(language, 'module_visual_discrimination')}</Text>
             <Text style={styles.subtitle}>{getTranslation(language, 'module_visual_discrimination_desc')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {CONFUSION_PAIRS.map((pair) => (
          <TouchableOpacity
            key={pair.id}
            style={styles.card}
            onPress={() => handlePairSelect(pair.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.cardGradient}
            >
                <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={styles.iconText}>{pair.label}</Text>
                </View>
                <Text style={styles.cardLabel}>{pair.label}</Text>
                <Text style={styles.playText}>▶ {getTranslation(language, 'play')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FeatureTour
        visible={tourVisible}
        steps={tourSteps}
        onComplete={() => setTourVisible(false)}
        onSkip={() => setTourVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  backButtonText: {
    fontSize: 24,
    color: '#0F172A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 48) / 2,
    aspectRatio: 1, // Square cards
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});
