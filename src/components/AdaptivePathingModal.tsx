import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAIRoadmap, MODULE_SUGGESTIONS, ModuleSuggestion } from '../context/AIRoadmapContext';
import { navigationRef } from '../navigation/navigationRef';

const { width } = Dimensions.get('window');

/**
 * US-17: Adaptive Pathing Modal
 * Appears when frustration rate exceeds 70%.
 * Suggests lower-stakes, "fun" alternative modules.
 */
export default function AdaptivePathingModal() {
  const { showAdaptiveModal, dismissAdaptiveModal } = useAIRoadmap();

  // Slide-up + fade animation
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showAdaptiveModal) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(80);
      fadeAnim.setValue(0);
    }
  }, [showAdaptiveModal]);

  const handleModulePress = (suggestion: ModuleSuggestion) => {
    dismissAdaptiveModal();
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate(suggestion.route as any);
      }
    }, 200);
  };

  return (
    <Modal
      visible={showAdaptiveModal}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissAdaptiveModal}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
            <View style={styles.headerIconCircle}>
              <Text style={styles.headerIcon}>🤖</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerLabel}>AI Roadmap</Text>
              <Text style={styles.headerTitle}>Let's try something different!</Text>
            </View>
            <TouchableOpacity onPress={dismissAdaptiveModal} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.bodyHint}>
              Looks like this is getting a bit tough 😊{'\n'}
              Here are some fun activities that might help!
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsScroll}
            >
              {MODULE_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s.route}
                  style={styles.moduleCard}
                  onPress={() => handleModulePress(s)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.moduleIconCircle, { backgroundColor: s.color + '22' }]}>
                    <Text style={styles.moduleIcon}>{s.icon}</Text>
                  </View>
                  <Text style={[styles.moduleName, { color: s.color }]}>{s.name}</Text>
                  <Text style={styles.moduleSubtitle}>{s.subtitle}</Text>
                  <View style={[styles.moduleGo, { backgroundColor: s.color }]}>
                    <Text style={styles.moduleGoText}>Go →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.continueBtn} onPress={dismissAdaptiveModal}>
              <Text style={styles.continueBtnText}>I'll keep going here</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,15,30,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  headerIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerIcon: { fontSize: 26 },
  headerTextContainer: { flex: 1 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 17, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeIcon: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  body: { padding: 20, paddingBottom: 36 },
  bodyHint: {
    fontSize: 15, color: '#475569', lineHeight: 22,
    textAlign: 'center', marginBottom: 20,
  },
  cardsScroll: { gap: 12, paddingBottom: 6, paddingHorizontal: 2 },
  moduleCard: {
    width: 130, borderRadius: 20,
    backgroundColor: '#F8FAFC',
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  moduleIconCircle: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  moduleIcon: { fontSize: 28 },
  moduleName: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  moduleSubtitle: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 12 },
  moduleGo: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 12,
  },
  moduleGoText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  continueBtn: {
    marginTop: 20, alignSelf: 'center',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 99, borderWidth: 1.5, borderColor: '#CBD5E1',
  },
  continueBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
});
