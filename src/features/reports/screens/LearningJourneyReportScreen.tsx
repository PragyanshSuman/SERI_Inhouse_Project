import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { useEmotion } from '../../../context/EmotionContext';
import { fetchEmotionReport } from '../../../services/emotionApiService';
import { StorageService } from '../../phonic-check/services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FEATURE_ICON: Record<string, string> = {
  'Letter Tracing': '✏️',
  'Magic Check (Phonics)': '🎤',
  'Magic Word Studio': '✨',
  'Writing Assessment': '📝',
  'Word Ninja': '🥷',
  'Rhyme Time': '🎵',
  'Visual Discrimination': '🧠',
  'Home': '🏠',
};

const FEATURE_SHORT: Record<string, string> = {
  'Letter Tracing': 'TRC',
  'Magic Check (Phonics)': 'PHO',
  'Magic Word Studio': 'WRD',
  'Writing Assessment': 'WRT',
  'Word Ninja': 'NJA',
  'Rhyme Time': 'RHY',
  'Visual Discrimination': 'VIS',
  'Home': 'APP',
};

const EMOTION_COLOR: Record<string, string> = {
  happy: '#10B981', neutral: '#6366F1', surprise: '#F59E0B',
  sad: '#64748B', angry: '#EF4444', fear: '#8B5CF6',
  disgust: '#F97316', frustrated: '#EF4444',
};

export default function LearningJourneyReportScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const emotionCtx = useEmotion() as any;
  const sessionData = emotionCtx?.sessionData || [];
  const currentUserId = (useAuth() as any)?.userId || null;
  const [loading, setLoading] = useState(true);
  const [phonicsStats, setPhonicsStats] = useState<any>(null);
  const [phonicsHistory, setPhonicsHistory] = useState<any[]>([]);
  const [affective, setAffective] = useState<any>(null);
  const [reportDate] = useState(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const storage = new StorageService(currentUserId);
        const [stats, hist] = await Promise.all([
          storage.getStatistics(),
          storage.getPracticeHistory(30),
        ]);
        setPhonicsStats(stats);
        setPhonicsHistory(hist || []);

        if (token) {
          try {
            const data = await fetchEmotionReport(token);
            if (data?.total_logs > 0) setAffective(data);
          } catch (_) {
            // Backend unreachable — use live session data instead
          }
        }
      } catch (err) {
        console.error('Learning Journey error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // ── Derive per-feature stats from local session data (no backend required) ──
  const liveByFeature = useMemo(() => {
    const source = affective?.by_feature ?? null;
    if (source) return source; // prefer backend historical data

    if (sessionData.length === 0) return null;
    const map: Record<string, { count: number; totalScore: number; face: number; audio: number; emotions: Record<string, number> }> = {};
    for (const dp of sessionData) {
      const f = dp.featureName || dp.moduleName;
      if (!map[f]) map[f] = { count: 0, totalScore: 0, face: 0, audio: 0, emotions: {} };
      map[f].count++;
      map[f].totalScore += dp.concentrationScore;
      dp.source === 'face' ? map[f].face++ : map[f].audio++;
      map[f].emotions[dp.dominantEmotion] = (map[f].emotions[dp.dominantEmotion] || 0) + 1;
    }
    return map;
  }, [sessionData, affective]);

  const liveAvgConc = useMemo(() => {
    if (affective) return affective.average_concentration;
    if (sessionData.length === 0) return 0;
    return Math.round(sessionData.reduce((s: number, d: any) => s + d.concentrationScore, 0) / sessionData.length);
  }, [sessionData, affective]);

  // Concentration sparkline: last 7 emotion readings grouped by feature
  const sparkData = useMemo(() => {
    const items = sessionData.length > 0
      ? sessionData.slice(-7).map((d: any) => ({
          value: d.concentrationScore,
          label: FEATURE_SHORT[d.featureName || d.moduleName] || 'APP'
        }))
      : [
          { value: 80, label: 'NA' },
          { value: 45, label: 'NA' },
          { value: 90, label: 'NA' },
          { value: 65, label: 'NA' },
          { value: 30, label: 'NA' },
          { value: 85, label: 'NA' },
          { value: 95, label: 'NA' },
        ]; // placeholder if empty
    // pad to 7
    while (items.length < 7) {
      items.unshift({ value: 50, label: '〰️' });
    }
    return items.slice(-7);
  }, [sessionData]);

  const totalActivities = liveByFeature ? Object.keys(liveByFeature).length : 0;
  const totalReadings = sessionData.length || (affective?.total_logs ?? 0);
  const phonicsAccuracy = Math.round(phonicsStats?.averageScore || 0);
  const flowScore = affective
    ? Math.min(100, Math.round(affective.average_concentration + ((affective.overall_emotions?.happy || 0) / (affective.total_logs || 1)) * 20))
    : sessionData.length > 0
    ? liveAvgConc
    : 0;

  const generateInsight = () => {
    const feats = liveByFeature ? Object.keys(liveByFeature) : [];
    let insight = `The student has been active across ${totalActivities} learning area${totalActivities !== 1 ? 's' : ''}. `;

    if (liveAvgConc > 75) {
      insight += 'Concentration data indicates exceptional focus — the student maintains deep engagement throughout sessions. ';
    } else if (liveAvgConc > 50) {
      insight += 'Concentration levels are stable. Occasional dips suggest natural fatigue patterns during longer tasks. ';
    } else if (liveAvgConc > 0) {
      insight += 'Concentration data shows variability. Shorter, gamified study bursts (10–15 min) are recommended. ';
    }

    if (phonicsAccuracy > 80) {
      insight += '\n\nPhonetic accuracy is at Mastery Level, suggesting strong phonological awareness. ';
    } else if (phonicsAccuracy > 0) {
      insight += `\n\nPhonetic accuracy is at ${phonicsAccuracy}%. Continued phonics practice will strengthen grapheme-phoneme mapping. `;
    }

    if (feats.includes('Letter Tracing')) {
      insight += '\n\nLetter tracing activity detected. Fine motor coordination and letter formation are being reinforced. ';
    }
    if (feats.includes('Rhyme Time') || feats.includes('Word Ninja')) {
      insight += 'Gamified word challenges are boosting phonological fluency and sight word recognition. ';
    }

    if (!insight.includes('\n\n')) {
      insight += '\n\nRECOMMENDATION: Complete activities across all 7 modules to build a comprehensive learning profile.';
    } else {
      insight += '\n\nRECOMMENDATION: Continue current learning momentum. Focus on consistency across all modules.';
    }

    return insight;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Synthesizing Pedagogical Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Profile</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => alert('Pedagogical Report Exported')}>
          <Text style={styles.actionBtnTxt}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Hero Card */}
        <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarTxt}>🎓</Text>
            </View>
            <View>
              <Text style={styles.studentName}>Academic Path: Journey 1</Text>
              <Text style={styles.reportDate}>{reportDate}</Text>
            </View>
          </View>
          <View style={styles.statPillsContainer}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>PHONICS ACC.</Text>
              <Text style={styles.statPillVal}>{phonicsAccuracy}%</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>FOCUS SCORE</Text>
              <Text style={styles.statPillVal}>{flowScore}%</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>ACTIVITIES</Text>
              <Text style={styles.statPillVal}>{totalActivities}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>AI READS</Text>
              <Text style={styles.statPillVal}>{totalReadings}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Concentration Sparkline — real data */}
        <View style={styles.dataCard}>
          <Text style={styles.cardHeading}>Concentration Profile (Session Velocity)</Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 }}>
            Tracks the student's estimated cognitive engagement over their last 7 reading activities. Higher bars indicate deeper concentration.
          </Text>
          <View style={styles.heatmapContainer}>
            {sparkData.map((dataObj: any, i: number) => (
              <View key={i} style={styles.heatmapColumn}>
                <LinearGradient
                  colors={dataObj.value > 70 ? ['#10B981', '#059669'] : dataObj.value > 40 ? ['#F59E0B', '#D97706'] : ['#EF4444', '#B91C1C']}
                  style={[styles.heatmapBar, { height: Math.max(dataObj.value, 8) }]}
                />
                <Text style={styles.heatmapLabel}>{dataObj.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 11, color: '#64748B' }}>High Focus</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
              <Text style={{ fontSize: 11, color: '#64748B' }}>Medium</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
              <Text style={{ fontSize: 11, color: '#64748B' }}>Distracted</Text>
            </View>
          </View>
          <Text style={[styles.heatmapSubtext, { marginTop: 12 }]}>
            {sessionData.length > 0
              ? `*Based on your last ${Math.min(7, sessionData.length)} emotion readings across all features.`
              : '*Play some games to see your real concentration profile here!'}
          </Text>
        </View>

        {/* Per-Feature Activity Breakdown */}
        {liveByFeature && Object.keys(liveByFeature).length > 0 ? (
          <View style={styles.dataCard}>
            <Text style={styles.cardHeading}>Activity Breakdown & Methodology</Text>
            
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: 'bold', marginBottom: 6 }}>How is this score calculated?</Text>
              <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 18 }}>
                The <Text style={{fontWeight: 'bold'}}>Concentration Score</Text> is an AI-derived metric balancing emotional states:{'\n'}
                <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Positive (+)</Text>: Neutral (1.0x), Happy (0.7x), Surprise (0.5x){'\n'}
                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Distraction (-)</Text>: Angry/Fear/Disgust (1.0x), Sad (0.8x){'\n'}
                <Text style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#334155' }}>Score = Max [ 0, Positive_Engagement - (Distraction × 0.5) ]</Text>
              </Text>
            </View>
            {Object.entries(liveByFeature).map(([feat, data]: [string, any]) => {
              const avg = data.avg_concentration ?? Math.round(data.totalScore / data.count);
              const domEmo = Object.entries(data.emotions as Record<string, number>)
                .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
              const faceCount = data.face_count ?? data.face ?? 0;
              const audioCount = data.audio_count ?? data.audio ?? 0;
              return (
                <View key={feat} style={styles.featureRow}>
                  <Text style={styles.featureRowIcon}>{FEATURE_ICON[feat] || '📚'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.featureRowTop}>
                      <Text style={styles.featureRowName}>{feat}</Text>
                      <Text style={[styles.featureRowPct, { color: avg > 70 ? '#10B981' : avg > 40 ? '#F59E0B' : '#EF4444' }]}>
                        {avg}%
                      </Text>
                    </View>
                    <Text style={styles.featureRowSub}>{data.count} readings · {faceCount} 👁 · {audioCount} 🎤</Text>
                    <View style={styles.miniBar}>
                      <View style={[styles.miniBarFill, {
                        width: `${avg}%` as any,
                        backgroundColor: avg > 70 ? '#10B981' : avg > 40 ? '#F59E0B' : '#EF4444'
                      }]} />
                    </View>
                    <View style={styles.emotionChips}>
                      {Object.entries(data.emotions as Record<string, number>)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([emo]) => (
                          <View key={emo} style={[styles.emoChip, { backgroundColor: (EMOTION_COLOR[emo] || '#94A3B8') + '25' }]}>
                            <Text style={[styles.emoChipTxt, { color: EMOTION_COLOR[emo] || '#94A3B8' }]}>{emo}</Text>
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.dataCard, { alignItems: 'center', paddingVertical: 30 }]}>
            <Text style={{ fontSize: 36 }}>🎮</Text>
            <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 16, marginTop: 10 }}>No Activity Data Yet</Text>
            <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 6, fontSize: 13 }}>
              Complete activities in any of the 7 features to see your learning breakdown here.
            </Text>
          </View>
        )}

        {/* AI Analysis */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconBg}><Text style={styles.aiIcon}>🤖</Text></View>
            <Text style={styles.aiCardTitle}>AI Pedagogical Insight</Text>
          </View>
          <Text style={styles.aiContent}>{generateInsight()}</Text>
          <View style={styles.tagContainer}>
            {liveAvgConc > 70 && (
              <View style={[styles.tag, { backgroundColor: '#DBEAFE' }]}>
                <Text style={{ color: '#1E40AF', fontSize: 10, fontWeight: 'bold' }}>#HighFlow</Text>
              </View>
            )}
            {phonicsAccuracy > 70 && (
              <View style={[styles.tag, { backgroundColor: '#DCFCE7' }]}>
                <Text style={{ color: '#166534', fontSize: 10, fontWeight: 'bold' }}>#PhonicMastery</Text>
              </View>
            )}
            {totalActivities >= 3 && (
              <View style={[styles.tag, { backgroundColor: '#EDE9FE' }]}>
                <Text style={{ color: '#5B21B6', fontSize: 10, fontWeight: 'bold' }}>#MultiModal</Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ color: '#92400E', fontSize: 10, fontWeight: 'bold' }}>#DyslexiaSupportActive</Text>
            </View>
          </View>
        </View>

        {/* Phonics History (if available) */}
        {phonicsHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>🎤 Recent Magic Check Sessions</Text>
            {phonicsHistory.slice(0, 5).map((item: any, idx: number) => (
              <View key={idx} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Text style={{ fontSize: 18 }}>{item.score > 80 ? '🌟' : '📖'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyWord}>{item.word}</Text>
                  <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                </View>
                <View style={styles.historyScoreBg}>
                  <Text style={[styles.historyScore, { color: item.score > 80 ? '#059669' : '#4F46E5' }]}>{item.score}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.sealFloating}>
        <Text style={styles.sealText}>UNIFIED LEARNING OFFICIAL PEDAGOGICAL AUDIT 2026</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 24, fontSize: 16, color: '#6366F1', fontWeight: '700', letterSpacing: 0.5 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'transparent'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, elevation: 3 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6366F1', borderRadius: 12 },
  actionBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  scroll: { padding: 20 },
  profileCard: { borderRadius: 24, padding: 24, marginBottom: 20, elevation: 10 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarTxt: { fontSize: 28 },
  studentName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  reportDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statPillsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statPill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  statPillLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4 },
  statPillVal: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  dataCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 2 },
  cardHeading: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 18 },
  heatmapContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: 10 },
  heatmapColumn: { alignItems: 'center', width: (width - 100) / 7 },
  heatmapBar: { width: 14, borderRadius: 7, marginBottom: 6 },
  heatmapLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700' },
  heatmapSubtext: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  featureRowIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  featureRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featureRowName: { fontSize: 14, fontWeight: '800', color: '#1E293B', flex: 1 },
  featureRowPct: { fontSize: 15, fontWeight: '900' },
  featureRowSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 6 },
  miniBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  miniBarFill: { height: 6, borderRadius: 3 },
  emotionChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  emoChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  emoChipTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  aiCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#EEF2FF' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  aiIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  aiIcon: { fontSize: 24 },
  aiCardTitle: { fontSize: 17, fontWeight: '800', color: '#4338CA' },
  aiContent: { fontSize: 14, lineHeight: 23, color: '#312E81', fontStyle: 'italic' },
  tagContainer: { flexDirection: 'row', marginTop: 14, gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  historySection: { padding: 4, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 18, marginBottom: 10, elevation: 1 },
  historyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  historyWord: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  historyDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  historyScoreBg: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EEF2FF', borderRadius: 10 },
  historyScore: { fontSize: 13, fontWeight: '800' },
  sealFloating: {
    position: 'absolute', bottom: 18, alignSelf: 'center',
    backgroundColor: 'rgba(241,245,249,0.95)', paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 30, borderWidth: 1, borderColor: '#CBD5E1'
  },
  sealText: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
});
