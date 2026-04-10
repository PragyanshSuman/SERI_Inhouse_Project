import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSettings } from '../context/SettingsContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { StorageService } from '../features/phonic-check/services/storageService';
import { useAuth } from '../context/AuthContext';
import BackButton from './BackButton';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');

/**
 * Custom Progress Slider
 * Bypasses native gesture handler conflicts by using a tappable progress bar.
 */
interface ProgressSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  color: string;
}

function ProgressSlider({ value, min, max, step, onChange, color }: ProgressSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  
  const handlePress = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    const barWidth = width - 40 - 20 - 70 - 32; // Rough layout calc
    // Actual implementation will use onLayout for precision
    const clickPercent = Math.max(0, Math.min(1, locationX / 200)); // Defaulting to 200 width for safety
    let newVal = min + (clickPercent * (max - min));
    newVal = Math.round(newVal / step) * step;
    onChange(Math.min(max, Math.max(min, newVal)));
  };

  const numSteps = Math.floor((max - min) / step);

  return (
    <View style={styles.customSliderContainer}>
      <View style={styles.customSliderTrack}>
        <View style={styles.customSliderRail} />
        <View style={[styles.customSliderFill, { width: `${percent}%`, backgroundColor: color }]} />
        <View style={[styles.customSliderThumb, { left: `${percent}%`, backgroundColor: color }]} />
        
        {/* Transparent tap zones dynamically generated based on steps */}
        <View style={styles.tapOverlay}>
          {[...Array(numSteps + 1)].map((_, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.tapZone} 
              onPress={() => {
                const stepVal = min + (i * step);
                onChange(stepVal);
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ParentalDashboard() {
  const { settings, updateSettings } = useSettings();
  const navigation = useNavigation<NavProp>();
  const { userId } = useAuth();
  const storageService = new StorageService(userId as any);

  // Local state for sliders so they don't stutter while dragging
  const [screenTime, setScreenTime] = useState(settings.maxScreenTimeMins);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Helper to map frustration to a 0-2 index for a slider
  const sensitivityMap = ['low', 'medium', 'high'] as const;
  const initialSensIdx = sensitivityMap.indexOf(settings.frustrationSensitivity);
  const [sensIndex, setSensIndex] = useState(initialSensIdx === -1 ? 1 : initialSensIdx);

  const onSlidingStart = () => {
    setScrollEnabled(false);
  };

  // Save on release
  const handleScreenTimeSlidingComplete = (val: number) => {
    setScrollEnabled(true);
    // Healthy Limit Enforcement: 15 to 120 mins
    const clamped = Math.min(120, Math.max(15, Math.round(val)));
    setScreenTime(clamped);
    updateSettings({ maxScreenTimeMins: clamped });
    if (val < 15 || val > 120) {
      Alert.alert(
        "Clinical Limit Reached",
        "Pediatric guidelines recommend screen time be between 15 and 120 minutes."
      );
    }
  };

  const handleSensitivitySlidingComplete = (val: number) => {
    setScrollEnabled(true);
    const idx = Math.round(val);
    setSensIndex(idx);
    updateSettings({ frustrationSensitivity: sensitivityMap[idx] });
  };

  const handleDifficultyChange = (level: 'beginner' | 'intermediate' | 'advanced') => {
    updateSettings({ maxDifficulty: level });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure? This will delete all learning progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAllData();
            Alert.alert('Success', 'All learning data has been cleared.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <BackButton color="#FFF" />
        <Text style={styles.headerTitle}>Parental Controls</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        scrollEnabled={scrollEnabled}
      >
        <Text style={styles.sectionHeader}>WELLNESS ADVISOR</Text>
        <View style={styles.card}>
           <View style={styles.cardHeader}>
             <Text style={styles.cardIcon}>⏱</Text>
             <Text style={styles.cardTitle}>Daily Screen Time Limit</Text>
           </View>
           <Text style={styles.cardDesc}>
             The app will prompt your child to take outdoor breaks around this threshold.
           </Text>
           
           <View style={styles.sliderRow}>
             <Text style={styles.sliderValText}>{screenTime} mins</Text>
             <ProgressSlider
               min={0}
               max={150}
               step={5}
               value={screenTime}
               onChange={handleScreenTimeSlidingComplete}
               color="#3B82F6"
             />
           </View>
           {screenTime === 120 && (
             <Text style={styles.limitWarning}>Clinical MAX reached (120m)</Text>
           )}
           {screenTime === 15 && (
             <Text style={styles.limitWarning}>Clinical MIN reached (15m)</Text>
           )}
        </View>

        <Text style={styles.sectionHeader}>ADAPTIVE PATHING</Text>
        <View style={styles.card}>
           <View style={styles.cardHeader}>
             <Text style={styles.cardIcon}>🤖</Text>
             <Text style={styles.cardTitle}>AI Frustration Sensitivity</Text>
           </View>
           <Text style={styles.cardDesc}>
             How quickly should the AI intervene and suggest a fun alternative when your child struggles?
           </Text>
           
           <View style={styles.sliderRow}>
             <Text style={styles.sliderValText}>{sensitivityMap[sensIndex].toUpperCase()}</Text>
             <ProgressSlider
               min={0}
               max={2}
               step={1}
               value={sensIndex}
               onChange={handleSensitivitySlidingComplete}
               color="#8B5CF6"
             />
           </View>
        </View>

        <Text style={styles.sectionHeader}>LEARNING SAFEGUARDS</Text>
        <View style={styles.card}>
           <View style={styles.cardHeader}>
             <Text style={styles.cardIcon}>🎓</Text>
             <Text style={styles.cardTitle}>Max Difficulty Ceiling</Text>
           </View>
           <Text style={styles.cardDesc}>
             Prevent your child from accidentally jumping to a difficulty level they aren't ready for.
           </Text>
           
           <View style={styles.segmentedControl}>
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.segmentBtn,
                    settings.maxDifficulty === level && styles.segmentBtnActive
                  ]}
                  onPress={() => handleDifficultyChange(level)}
                >
                  <Text style={[
                      styles.segmentText,
                      settings.maxDifficulty === level && styles.segmentTextActive
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>

        <Text style={styles.sectionHeader}>CLINICAL & DATA</Text>
        <View style={styles.card}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('EmotionReport')}
            >
               <View style={styles.actionBtnIconBox}><Text style={{fontSize: 20}}>🩺</Text></View>
               <View style={styles.actionBtnTextBox}>
                 <Text style={styles.actionBtnTitle}>Generate Clinical Report</Text>
                 <Text style={styles.actionBtnDesc}>View deep diagnostic metrics</Text>
               </View>
               <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />


            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={handleClearData}
            >
               <View style={[styles.actionBtnIconBox, { backgroundColor: '#FEE2E2' }]}><Text style={{fontSize: 20}}>🗑️</Text></View>
               <View style={styles.actionBtnTextBox}>
                 <Text style={[styles.actionBtnTitle, { color: '#EF4444' }]}>Clear Learning Data</Text>
                 <Text style={styles.actionBtnDesc}>Permanently delete progress</Text>
               </View>
            </TouchableOpacity>
        </View>

        <View style={{height: 40}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  scroll: { padding: 16 },
  sectionHeader: { 
    fontSize: 12, fontWeight: '800', color: '#94A3B8', 
    marginTop: 24, marginBottom: 8, marginLeft: 4, letterSpacing: 1 
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderValText: { width: 75, fontSize: 16, fontWeight: '800', color: '#3B82F6', marginRight: 16 },
  limitWarning: { color: '#F59E0B', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 91 },

  // Custom Slider Styles
  customSliderContainer: { flex: 1, height: 44, justifyContent: 'center' },
  customSliderTrack: { height: 32, justifyContent: 'center', position: 'relative' },
  customSliderRail: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, width: '100%' },
  customSliderFill: { height: 6, borderRadius: 3, position: 'absolute', left: 0 },
  customSliderThumb: { width: 20, height: 20, borderRadius: 10, position: 'absolute', top: 6, marginLeft: -10, borderWidth: 3, borderColor: '#FFF', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  tapOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapZone: { flex: 1 },

  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#1E293B', fontWeight: '800' },

  diagnosticBtn: { backgroundColor: '#F59E0B', padding: 12, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  diagnosticText: { color: '#FFF', fontWeight: '800' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionBtnIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  actionBtnTextBox: { flex: 1, marginLeft: 14 },
  actionBtnTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  actionBtnDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  arrowIcon: { fontSize: 20, color: '#CBD5E1' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }
});
