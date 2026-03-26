import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAIRoadmap, OUTDOOR_ACTIVITIES, OutdoorActivity } from '../context/AIRoadmapContext';

const { width } = Dimensions.get('window');

/**
 * US-18: Wellness Advisor Modal
 * Appears at 45-min and 60-min screen-time marks.
 * Shows 7 outdoor activity suggestions and prompts a break.
 */
export default function WellnessAdvisorModal() {
  const { showWellnessModal, dismissWellnessModal, elapsedMinutes } = useAIRoadmap();

  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showWellnessModal) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Pulse the icon to draw attention
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      slideAnim.setValue(100);
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [showWellnessModal]);

  const elapsed = Math.round(elapsedMinutes());

  const renderActivity = ({ item }: { item: OutdoorActivity }) => (
    <View style={styles.activityRow}>
      <View style={styles.activityIconBox}>
        <Text style={styles.activityIcon}>{item.icon}</Text>
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityName}>{item.name}</Text>
        <Text style={styles.activityDesc}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={showWellnessModal}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissWellnessModal}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
            <Animated.View style={[styles.sunCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.sunIcon}>🌞</Text>
            </Animated.View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerLabel}>Wellness Advisor</Text>
              <Text style={styles.headerTitle}>Time for a Break!</Text>
            </View>
            <TouchableOpacity
              onPress={dismissWellnessModal}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Time badge */}
          <View style={styles.timeBadgeRow}>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeIcon}>⏱</Text>
              <Text style={styles.timeBadgeText}>
                You've been learning for <Text style={styles.timeBadgeBold}>{elapsed} minutes</Text> — amazing work!{'\n'}
                Your brain will thank you for a short break.
              </Text>
            </View>
          </View>

          {/* Activity list */}
          <View style={styles.body}>
            <Text style={styles.listHeader}>🌳 Pick an outdoor activity:</Text>
            <FlatList
              data={OUTDOOR_ACTIVITIES}
              keyExtractor={(item) => item.name}
              renderItem={renderActivity}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.breakBtn} onPress={dismissWellnessModal}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.breakBtnGrad}>
                <Text style={styles.breakBtnText}>✅  I'll take a break!</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissWellnessModal} style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue Learning</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(5,30,20,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', maxHeight: '90%',
    elevation: 24,
    shadowColor: '#059669', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2, shadowRadius: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18, gap: 14,
  },
  sunCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  sunIcon: { fontSize: 28 },
  headerTextContainer: { flex: 1 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '900', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeIcon: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  timeBadgeRow: { paddingHorizontal: 20, paddingTop: 16 },
  timeBadge: {
    flexDirection: 'row', backgroundColor: '#ECFDF5',
    borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'flex-start',
  },
  timeBadgeIcon: { fontSize: 20, marginTop: 2 },
  timeBadgeText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 20 },
  timeBadgeBold: { fontWeight: '800' },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  listHeader: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12 },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 8,
  },
  activityIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  activityIcon: { fontSize: 22 },
  activityText: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  activityDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 2 },

  footer: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12,
  },
  breakBtn: { borderRadius: 16, overflow: 'hidden' },
  breakBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  breakBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  continueBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  continueBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },
});
