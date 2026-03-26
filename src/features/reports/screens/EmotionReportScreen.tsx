import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEmotion } from '../../../context/EmotionContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchEmotionReport } from '../../../services/emotionApiService';
import { LinearGradient } from 'expo-linear-gradient';

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', angry: '😠',
  neutral: '😐', fear: '😨', disgust: '🤢',
  surprise: '😲', frustrated: '😤',
};

const EMOTION_COLOR: Record<string, string> = {
  happy: '#10B981', neutral: '#6366F1', surprise: '#F59E0B',
  sad: '#64748B', angry: '#EF4444', fear: '#8B5CF6',
  disgust: '#F97316', frustrated: '#EF4444',
};

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

function ConcentrationBar({ value }: { value: number }) {
  const color = value > 70 ? '#10B981' : value > 45 ? '#F59E0B' : '#EF4444';
  return (
    <View style={styles.barContainer}>
      <View style={[styles.barFill, { width: `${value}%` as any, backgroundColor: color }]} />
      <Text style={[styles.barLabel, { color }]}>{value}%</Text>
    </View>
  );
}

function EmotionPips({ emotions }: { emotions: Record<string, number> }) {
  const total = Object.values(emotions).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <View style={styles.pipsRow}>
      {Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([emo, count]) => (
          <View key={emo} style={[styles.pip, { backgroundColor: EMOTION_COLOR[emo] || '#94A3B8' }]}>
            <Text style={styles.pipEmoji}>{EMOTION_EMOJI[emo] || '❓'}</Text>
            <Text style={styles.pipLabel}>{emo}</Text>
            <Text style={styles.pipPct}>{Math.round((count / total) * 100)}%</Text>
          </View>
        ))}
    </View>
  );
}

function SourceBar({ faceCount, audioCount }: { faceCount: number; audioCount: number }) {
  const total = faceCount + audioCount;
  if (total === 0) return null;
  const facePct = Math.round((faceCount / total) * 100);
  const audioPct = 100 - facePct;
  return (
    <View>
      <Text style={styles.sourceTitle}>Detection Source</Text>
      <View style={styles.sourceBarRow}>
        <View style={[styles.sourceSegment, { flex: facePct, backgroundColor: '#6366F1' }]} />
        <View style={[styles.sourceSegment, { flex: audioPct, backgroundColor: '#10B981' }]} />
      </View>
      <View style={styles.sourceLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <Text style={styles.legendText}>👁 Face ({facePct}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>🎤 Voice ({audioPct}%)</Text>
        </View>
      </View>
    </View>
  );
}

function FeatureCard({ featureName, data }: { featureName: string; data: any }) {
  const [expanded, setExpanded] = useState(false);
  const avg = data.avg_concentration ?? Math.round(data.totalScore / data.count);
  const dominantEmo = Object.entries(data.emotions as Record<string, number>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.9}>
      <View style={styles.featureCard}>
        <View style={styles.featureHeader}>
          <Text style={styles.featureIcon}>{FEATURE_ICON[featureName] || '📚'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureName}>{featureName}</Text>
            <Text style={styles.featureSub}>{data.count} readings</Text>
          </View>
          <View style={styles.featureEmo}>
            <Text style={styles.featureEmoEmoji}>{EMOTION_EMOJI[dominantEmo] || '😐'}</Text>
            <Text style={styles.featureEmoPct}>{avg}%</Text>
          </View>
        </View>

        <ConcentrationBar value={avg} />

        {expanded && (
          <View style={styles.expandedSection}>
            <SourceBar faceCount={data.face_count ?? 0} audioCount={data.audio_count ?? 0} />

            {data.face_count > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subSectionTitle}>👁 Face — Emotion Breakdown</Text>
                <EmotionPips emotions={data.face_emotions ?? {}} />
              </View>
            )}

            {data.audio_count > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subSectionTitle}>🎤 Voice — Emotion Breakdown</Text>
                <EmotionPips emotions={data.audio_emotions ?? {}} />
              </View>
            )}
          </View>
        )}

        <Text style={styles.expandHint}>{expanded ? '▲ Collapse' : '▼ Tap for details'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EmotionReportScreen() {
  const navigation = useNavigation<any>();
  const { sessionData, clearSession } = useEmotion();
  const { token, logout } = useAuth();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!token) return;
        const data = await fetchEmotionReport(token);
        setReport(data?.total_logs > 0 ? data : null);
      } catch (err) {
        console.warn('Could not load historical report:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // --- Derive live analytics from local session data (no sync needed) ---
  const liveByFeature = React.useMemo(() => {
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
  }, [sessionData]);

  const liveAvgConc = React.useMemo(() => {
    if (sessionData.length === 0) return 0;
    return Math.round(sessionData.reduce((s, d) => s + d.concentrationScore, 0) / sessionData.length);
  }, [sessionData]);

  const liveFaceCount = sessionData.filter(d => d.source === 'face').length;
  const liveAudioCount = sessionData.filter(d => d.source === 'audio').length;

  const hasAnyData = sessionData.length > 0 || !!report;
  const totalFace = report?.source_breakdown?.face ?? 0;
  const totalAudio = report?.source_breakdown?.audio ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBtnTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Affective Analytics 🧠</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutTxt}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#818CF8" style={{ marginTop: 60 }} />
        ) : !hasAnyData ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No data yet</Text>
            <Text style={styles.emptySub}>
              Complete some activities! The AI monitors your emotional state every 5 seconds using both face detection and voice analysis.
            </Text>
          </View>
        ) : (
          <>
            {/* === LIVE SESSION SECTION (from local data) === */}
            {sessionData.length > 0 && (
              <>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeTxt}>LIVE SESSION — {sessionData.length} readings</Text>
                </View>

                <LinearGradient colors={['#065F46', '#047857']} style={styles.heroCard}>
                  <Text style={styles.heroLabel}>SESSION CONCENTRATION</Text>
                  <Text style={styles.heroScore}>{liveAvgConc}%</Text>
                  <Text style={styles.heroSub}>{sessionData.length} readings · not yet synced to cloud</Text>
                  <View style={styles.heroSourceRow}>
                    <View style={styles.heroSourceItem}>
                      <Text style={styles.heroSourceCount}>{liveFaceCount}</Text>
                      <Text style={styles.heroSourceLabel}>👁 Face Reads</Text>
                    </View>
                    <View style={styles.heroSourceDivider} />
                    <View style={styles.heroSourceItem}>
                      <Text style={styles.heroSourceCount}>{liveAudioCount}</Text>
                      <Text style={styles.heroSourceLabel}>🎤 Voice Reads</Text>
                    </View>
                  </View>
                </LinearGradient>

                <Text style={styles.featureSectionTitle}>Live Activity Breakdown</Text>
                {liveByFeature && Object.entries(liveByFeature).map(([feat, data]) => {
                  const avg = Math.round(data.totalScore / data.count);
                  const domEmo = Object.entries(data.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
                  return (
                    <View key={feat} style={styles.featureCard}>
                      <View style={styles.featureHeader}>
                        <Text style={styles.featureIcon}>{FEATURE_ICON[feat] || '📚'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.featureName}>{feat}</Text>
                          <Text style={styles.featureSub}>{data.count} readings · {data.face} 👁 · {data.audio} 🎤</Text>
                        </View>
                        <View style={styles.featureEmo}>
                          <Text style={styles.featureEmoEmoji}>{EMOTION_EMOJI[domEmo] || '😐'}</Text>
                          <Text style={styles.featureEmoPct}>{avg}%</Text>
                        </View>
                      </View>
                      <ConcentrationBar value={avg} />
                      <EmotionPips emotions={data.emotions} />
                    </View>
                  );
                })}
              </>
            )}

            {/* === HISTORICAL CLOUD SECTION === */}
            {report && (
              <>
                <View style={[styles.liveBadge, { backgroundColor: '#1E3A5F', marginTop: 24 }]}>
                  <Text style={[styles.liveBadgeTxt, { color: '#7DD3FC' }]}>☁️ CLOUD HISTORY — {report.total_logs} synced readings</Text>
                </View>

                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.heroCard}>
                  <Text style={styles.heroLabel}>OVERALL CONCENTRATION</Text>
                  <Text style={styles.heroScore}>{report.average_concentration}%</Text>
                  <Text style={styles.heroSub}>Across all synced sessions</Text>
                  <View style={styles.heroSourceRow}>
                    <View style={styles.heroSourceItem}>
                      <Text style={styles.heroSourceCount}>{totalFace}</Text>
                      <Text style={styles.heroSourceLabel}>👁 Face Reads</Text>
                    </View>
                    <View style={styles.heroSourceDivider} />
                    <View style={styles.heroSourceItem}>
                      <Text style={styles.heroSourceCount}>{totalAudio}</Text>
                      <Text style={styles.heroSourceLabel}>🎤 Voice Reads</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Overall Mood Distribution</Text>
                  <EmotionPips emotions={report.overall_emotions ?? {}} />
                </View>

                <Text style={styles.featureSectionTitle}>Breakdown by Activity</Text>
                <Text style={styles.featureSectionSub}>Tap each card to see Face vs. Voice details</Text>
                {Object.entries(report.by_feature ?? {}).map(([feat, data]) => (
                  <FeatureCard key={feat} featureName={feat} data={data} />
                ))}
              </>
            )}
          </>
        )}

        {/* Sync Button */}
        {sessionData.length > 0 && (
          <View style={styles.syncContainer}>
            <Text style={styles.syncInfo}>
              📡 {sessionData.length} new readings ready to sync
            </Text>
            <TouchableOpacity style={styles.syncBtnWrapper} onPress={clearSession}>
              <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.syncGradient}>
                <Text style={styles.syncBtnText}>Sync Session to Cloud ☁️</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
  headerBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  headerBtnTxt: { color: '#A5B4FC', fontWeight: 'bold' },
  logoutBtn: { padding: 10, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10 },
  logoutTxt: { color: '#F87171', fontWeight: 'bold' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#E2E8F0' },

  scroll: { padding: 16 },

  heroCard: {
    borderRadius: 24, padding: 28, marginBottom: 16,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  heroLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroScore: { color: '#FFF', fontSize: 72, fontWeight: '900', marginVertical: 4 },
  heroSub: { color: '#A5B4FC', fontSize: 14, marginBottom: 20 },
  heroSourceRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 14 },
  heroSourceItem: { flex: 1, alignItems: 'center' },
  heroSourceCount: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  heroSourceLabel: { color: '#C7D2FE', fontSize: 13, marginTop: 2 },
  heroSourceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '800', marginBottom: 14 },

  featureSectionTitle: { color: '#E2E8F0', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  featureSectionSub: { color: '#64748B', fontSize: 13, marginBottom: 14 },

  featureCard: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  featureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon: { fontSize: 28, marginRight: 12 },
  featureName: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  featureSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  featureEmo: { alignItems: 'center' },
  featureEmoEmoji: { fontSize: 24 },
  featureEmoPct: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  expandHint: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 10 },

  barContainer: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  barLabel: { position: 'absolute', right: 0, top: -16, fontSize: 11, fontWeight: '700' },

  expandedSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155' },

  sourceTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  sourceBarRow: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  sourceSegment: { height: 10 },
  sourceLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#94A3B8', fontSize: 13 },

  subSectionTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginBottom: 8 },

  pipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pip: { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 70 },
  pipEmoji: { fontSize: 22 },
  pipLabel: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'capitalize' },
  pipPct: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 60 },
  emptyText: { color: '#E2E8F0', fontSize: 22, fontWeight: '900', marginTop: 12 },
  emptySub: { color: '#64748B', fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },

  syncContainer: { marginTop: 24, borderRadius: 20, padding: 20, backgroundColor: '#0F2A1D', borderWidth: 1, borderColor: '#10B981', alignItems: 'center' },
  syncInfo: { color: '#34D399', fontWeight: '700', marginBottom: 12 },
  syncBtnWrapper: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  syncGradient: { padding: 18, alignItems: 'center' },
  syncBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#14532D', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveBadgeTxt: { color: '#86EFAC', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
