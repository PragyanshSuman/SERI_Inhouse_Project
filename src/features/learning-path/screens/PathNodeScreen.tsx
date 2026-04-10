/**
 * PathNodeScreen.tsx
 *
 * Simple launcher: shows a briefing card describing the activity,
 * then opens the existing module screen as-is.
 * When the child navigates back from the module, the path context
 * refreshes progress automatically (via useFocusEffect).
 * 
 * No new features. No modified screens. Just a smart doorway.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NODE_MAP, UNIT_MAP } from '../data/pathCurriculum';
import { DT } from '../../../utils/DyslexiaTheme';
import BackButton from '../../../components/BackButton';

interface RouteParams {
  nodeId: string;
}

export default function PathNodeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { nodeId } = route.params as RouteParams;

  const node = NODE_MAP[nodeId];
  const unit = node ? UNIT_MAP[node.unitId] : null;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7 }),
    ]).start();
  }, []);

  if (!node || !unit) {
    return (
      <LinearGradient colors={['#1E1B4B', '#0F0E2B']} style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Activity not found.</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const handleStart = () => {
    // Navigate directly to the existing module screen with its original params.
    // The existing screen runs completely unchanged.
    const params: Record<string, any> = { ...(node.moduleParams ?? {}) };
    navigation.navigate(node.moduleKey, params);
  };

  return (
    <LinearGradient colors={['#1E1B4B', '#0F0E2B']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <BackButton color="#fff" />

        <View style={styles.centered}>
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          >
            {/* Unit badge */}
            <LinearGradient
              colors={[unit.themeColor, unit.themeColor + '99']}
              style={styles.cardHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.unitLabel}>{unit.icon}  {unit.title}</Text>
              <Text style={styles.nodeIcon}>{node.icon}</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Text style={styles.nodeTitle}>{node.title}</Text>
              <Text style={styles.nodeDesc}>{node.description}</Text>

              {/* Meta chips */}
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>⭐ {node.baseXP} XP</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>
                    {node.difficulty === 'beginner' ? '🌱 Easy'
                      : node.difficulty === 'intermediate' ? '🔥 Medium'
                      : '⚡ Hard'}
                  </Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>
                    ⏱ ~{Math.round(node.targetDurationSecs / 60)} min
                  </Text>
                </View>
              </View>

              {/* Skill tag */}
              <View style={[styles.skillBadge, { borderColor: unit.themeColor + '88' }]}>
                <Text style={[styles.skillText, { color: unit.themeColor }]}>
                  🎯 Skill: {node.skillTag.replace(/_/g, ' ')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: unit.themeColor }]}
                onPress={handleStart}
                activeOpacity={0.85}
              >
                <Text style={styles.startBtnText}>Open Activity 🚀</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                Use the back button when you're done to return to your path.
              </Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    ...DT.shadow.medium,
  },
  cardHeader: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
  },
  nodeIcon: { fontSize: 64, marginTop: 4 },

  cardBody: { padding: 24 },
  nodeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  nodeDesc: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaChip: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaText: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },

  skillBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'center',
    marginBottom: 24,
  },
  skillText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },

  startBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...DT.shadow.medium,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  hint: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
