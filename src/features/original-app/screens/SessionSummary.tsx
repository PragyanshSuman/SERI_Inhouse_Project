import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DT } from '../../../utils/DyslexiaTheme';
import ProgressIndicator from '../../../features/letter-tracing/components/tracing/ProgressIndicator';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';
import StorageService from '../services/StorageService';
import {
  getTracingSessionReport,
  TracingSessionReport,
} from '../../../services/TracingStatsService';

// ─────────────────────────────────────────────────────────────────────────────
// Route param types
// ─────────────────────────────────────────────────────────────────────────────
interface RouteParams {
  sessionId?: string;
  // Rich analytics object passed directly (from original TracingScreen)
  analyticsData?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>
      {children}
    </View>
  </View>
);

interface MetricRowProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, color, subtitle }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricValueContainer}>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtext}>{subtitle}</Text>}
    </View>
  </View>
);

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  color?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, maxScore = 100, color }) => {
  const percentage = (score / maxScore) * 100;
  const displayColor = color || (percentage >= 80 ? DT.text.success : DT.accent.amber);
  return (
    <View style={styles.scoreCard}>
      <ProgressIndicator
        progress={percentage / 100}
        size={70}
        color={displayColor}
      />
      <View style={styles.scoreCardText}>
        <Text style={styles.scoreCardTitle}>{title}</Text>
        <Text style={[styles.scoreCardValue, { color: displayColor }]}>
          {Math.round(percentage)}{maxScore === 100 ? '%' : ''}
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const SessionSummary: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { sessionId, analyticsData } = (route.params ?? {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed' | 'diagnostic'>('overview');

  // ── Load real data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (analyticsData) {
          // Path A: full analytics passed directly (from original TracingScreen)
          setAnalytics(buildFromRichAnalytics(analyticsData));
        } else if (sessionId) {
          // Path B: load from TracingStatsService by sessionId (ScalableGuidedTracing)
          const report = await getTracingSessionReport(sessionId);
          if (report) {
            setAnalytics(buildFromSimpleReport(report));
          } else {
            // Path C: fallback — try StorageService (original TracingScreen saved there)
            const rich = await StorageService.getAnalytics(sessionId);
            if (rich) {
              setAnalytics(buildFromRichAnalytics(rich));
            } else {
              setAnalytics(null);
            }
          }
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        console.warn('[SessionSummary] loadData error:', err);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId, analyticsData]);

  // ── Navigate back to tracing ───────────────────────────────────────────────
  const handleRetry = () => {
    const letter = analytics?.letter ?? 'A';
    navigation.navigate('Tracing', { letter, userId: 'user_001' });
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DT.accent.navy} />
      </SafeAreaView>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <EmotionTracker moduleName="Session Summary" isActive={true} />
        <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} color={DT.accent.navy} />
          <Text style={styles.headerTitle}>Session Report</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No Session Data</Text>
          <Text style={styles.emptyBody}>
            Complete a tracing session to see your detailed report here.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render tabs ───────────────────────────────────────────────────────────
  const renderOverview = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.letterDisplay}>{analytics.letter}</Text>
        <Text style={styles.dateText}>{new Date(analytics.timestamp).toLocaleString()}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{analytics.completionStatus}</Text>
        </View>
      </View>

      <DetailSection title="Performance Summary">
        <View style={styles.scoreCardsGrid}>
          <ScoreCard title="Accuracy" score={analytics.accuracyScore} />
          <ScoreCard title="Fluency" score={analytics.fluencyScore} />
          <ScoreCard title="Coverage" score={analytics.coverageScore} />
          <ScoreCard title="Duration" score={analytics.durationScore} />
        </View>
      </DetailSection>

      <DetailSection title="Session Metrics">
        <MetricRow label="Duration" value={`${analytics.durationSecs}s`} />
        <MetricRow label="Segments Traced" value={`${analytics.segmentCount}`} />
        <MetricRow
          label="Avg Speed"
          value={analytics.avgVelocity ? `${analytics.avgVelocity.toFixed(1)} px/s` : '—'}
        />
        <MetricRow
          label="Reaction Time"
          value={analytics.reactionTime ? `${analytics.reactionTime.toFixed(2)}s` : '—'}
        />
      </DetailSection>

      <DetailSection title="Stroke Analysis">
        <MetricRow
          label="Stroke Match"
          value={analytics.strokeMatch}
          color={analytics.strokeMatch === 'Perfect' ? DT.text.success : DT.accent.amber}
        />
        <MetricRow label="Expected Strokes" value={analytics.expectedStrokes} />
        <MetricRow label="Actual Strokes" value={analytics.actualStrokes} />
      </DetailSection>
    </ScrollView>
  );

  const renderDetailed = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <DetailSection title="Segment-by-Segment Coverage">
        {analytics.segmentAccuracies && analytics.segmentAccuracies.length > 0
          ? analytics.segmentAccuracies.map((acc: number, i: number) => (
              <MetricRow
                key={`seg-${i}`}
                label={`Segment ${i + 1}`}
                value={`${acc}%`}
                color={acc >= 80 ? DT.text.success : acc >= 50 ? DT.accent.amber : DT.text.error}
              />
            ))
          : <MetricRow label="No segment data" value="—" />}
      </DetailSection>

      <DetailSection title="Kinematics & Smoothness">
        <MetricRow
          label="Normalized Jerk"
          value={analytics.normalizedJerk !== undefined ? analytics.normalizedJerk.toFixed(4) : '—'}
          subtitle="Lower is smoother"
        />
        <MetricRow
          label="Tremor Amplitude"
          value={analytics.tremorAmplitude !== undefined ? `${analytics.tremorAmplitude.toFixed(2)} px` : '—'}
        />
        <MetricRow
          label="Velocity Peaks"
          value={analytics.velocityPeaks !== undefined ? analytics.velocityPeaks : '—'}
        />
      </DetailSection>

      <DetailSection title="Shape Formation">
        <MetricRow
          label="Symmetry Score"
          value={analytics.symmetryScore !== undefined ? `${(analytics.symmetryScore * 100).toFixed(0)}%` : '—'}
        />
        <MetricRow
          label="Baseline Adherence"
          value={analytics.baselineAdherence !== undefined ? `${(analytics.baselineAdherence * 100).toFixed(0)}%` : '—'}
        />
        <MetricRow
          label="Similarity to Ideal"
          value={analytics.shapeSimilarity !== undefined ? `${(analytics.shapeSimilarity * 100).toFixed(0)}%` : '—'}
        />
      </DetailSection>

      <DetailSection title="Cognitive & Focus">
        <MetricRow
          label="Fatigue Index"
          value={analytics.fatigueIndex !== undefined ? analytics.fatigueIndex : '—'}
        />
        <MetricRow
          label="Self-Corrections"
          value={analytics.selfCorrections !== undefined ? analytics.selfCorrections : '—'}
        />
      </DetailSection>
    </ScrollView>
  );

  const renderDiagnostic = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <DetailSection title="Screening Results 🩺">
        <View style={styles.riskBigCard}>
          <Text style={styles.riskBigLabel}>Risk Level</Text>
          <Text style={[styles.riskBigValue, { color: analytics.riskColor }]}>
            {analytics.riskLevel}
          </Text>
        </View>
        <View style={{ marginTop: 20 }}>
          <RiskBar label="Dyslexia Risk"   score={analytics.dyslexiaRisk} />
          <RiskBar label="Dysgraphia Risk" score={analytics.dysgraphiaRisk} />
          <RiskBar label="Reversal Risk"   score={analytics.reversalRisk} />
        </View>
      </DetailSection>

      <DetailSection title="Orientation Analysis">
        <MetricRow
          label="Mirror Similarity"
          value={analytics.mirrorSimilarity !== undefined ? `${(analytics.mirrorSimilarity * 100).toFixed(0)}%` : '—'}
          subtitle="Check for b/d reversals"
        />
        <MetricRow
          label="Rotation Similarity"
          value={analytics.rotationSimilarity !== undefined ? `${(analytics.rotationSimilarity * 100).toFixed(0)}%` : '—'}
        />
      </DetailSection>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Clinical Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This report provides automated observations based on tracing kinematics.
          It is for screening and educational purposes. Consult a specialist for formal diagnosis.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Session Summary" isActive={true} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color={DT.accent.navy} />
        <Text style={styles.headerTitle}>Session Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        {(['overview', 'detailed', 'diagnostic'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'overview'    && renderOverview()}
      {selectedTab === 'detailed'    && renderDetailed()}
      {selectedTab === 'diagnostic'  && renderDiagnostic()}

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>Practice Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Data mappers — convert raw storage shape → display shape
// ─────────────────────────────────────────────────────────────────────────────

/** Map a TracingSessionReport (ScalableGuidedTracing) → display analytics */
function buildFromSimpleReport(r: TracingSessionReport) {
  const acc = r.accuracy;
  // Derive fluency from segment consistency (std dev of segment accuracies)
  const segs = r.segmentAccuracies ?? [];
  const avgSeg = segs.length > 0 ? segs.reduce((s, v) => s + v, 0) / segs.length : acc;
  const variance = segs.length > 1
    ? segs.reduce((s, v) => s + Math.pow(v - avgSeg, 2), 0) / segs.length
    : 0;
  const consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance)));
  // Duration score: bonus for being fast, penalty for very slow (>120s)
  const durationScore = Math.max(20, Math.min(100, 100 - (r.durationSecs / 120) * 40));

  // Risk inference from accuracy (simple heuristic — no clinical data available)
  const dyslexiaRisk = Math.max(0, Math.min(100, 100 - acc));
  const dysgraphiaRisk = Math.max(0, Math.min(100, (100 - consistency) * 0.8));
  const reversalRisk = 5; // cannot compute without full kinematics
  const overallRisk = (dyslexiaRisk + dysgraphiaRisk + reversalRisk) / 3;
  const riskLevel = overallRisk < 30 ? 'LOW' : overallRisk < 60 ? 'MODERATE' : 'HIGH';
  const riskColor = overallRisk < 30 ? DT.text.success : overallRisk < 60 ? DT.accent.amber : DT.text.error;

  return {
    letter: r.letter,
    timestamp: r.timestamp,
    completionStatus: 'Complete',
    accuracyScore: acc,
    fluencyScore: Math.round(consistency),
    coverageScore: avgSeg,
    durationScore: Math.round(durationScore),
    durationSecs: r.durationSecs,
    segmentCount: r.segmentCount,
    segmentAccuracies: r.segmentAccuracies ?? [],
    avgVelocity: undefined,
    reactionTime: undefined,
    strokeMatch: r.segmentCount > 0 ? 'Segments Completed' : '—',
    expectedStrokes: r.segmentCount,
    actualStrokes: r.segmentCount,
    // No rich kinematics from ScalableGuidedTracing
    normalizedJerk: undefined,
    tremorAmplitude: undefined,
    velocityPeaks: undefined,
    symmetryScore: undefined,
    baselineAdherence: undefined,
    shapeSimilarity: undefined,
    fatigueIndex: undefined,
    selfCorrections: undefined,
    mirrorSimilarity: undefined,
    rotationSimilarity: undefined,
    riskLevel,
    riskColor,
    dyslexiaRisk: Math.round(dyslexiaRisk),
    dysgraphiaRisk: Math.round(dysgraphiaRisk),
    reversalRisk,
  };
}

/** Map a rich ShadowFeatureExtractor report (original TracingScreen) → display analytics */
function buildFromRichAnalytics(r: any) {
  const acc = r.spatial_accuracy_deviation?.accuracy_score
    ?? r.overview?.score
    ?? 0;
  const fluency = (r.velocity_kinematics?.fluency_ratio ?? r.clinical?.kinematics?.fluencyRatio ?? 0.5) * 100;
  const coverage = r.raw_touch_data?.data_completeness_score ?? 90;
  const totalSecs = r.time_based_performance?.total_session_duration
    ?? (r.overview?.completionTime ? r.overview.completionTime / 1000 : 30);
  const durationScore = Math.max(20, Math.min(100, 100 - (totalSecs / 120) * 40));

  const risk = r.automated_risk_assessment ?? {};
  const dyslexiaRisk  = risk.dyslexia_risk_score  ?? Math.max(0, 100 - acc);
  const dysgraphiaRisk = risk.dysgraphia_risk_score ?? Math.max(0, 100 - fluency);
  const reversalRisk  = risk.reversal_risk_score   ?? 5;
  const riskLevel     = (risk.overall_risk_level ?? (dyslexiaRisk < 30 ? 'Low' : 'Moderate')).toUpperCase();
  const riskColor     = riskLevel === 'LOW' ? DT.text.success : riskLevel === 'MODERATE' ? DT.accent.amber : DT.text.error;

  const seq = r.stroke_count_sequencing ?? {};
  const expected = seq.expected_stroke_count ?? r.clinical?.sequencing?.strokeCountExpected ?? 0;
  const actual   = seq.actual_stroke_count_used ?? r.clinical?.sequencing?.strokeCountActual ?? 0;

  return {
    letter: r.letter ?? '?',
    timestamp: r.timestamp ?? new Date().toISOString(),
    completionStatus: r.completion_persistence?.letter_completion_status ?? 'Complete',
    accuracyScore: Math.round(acc),
    fluencyScore: Math.round(fluency),
    coverageScore: Math.round(coverage),
    durationScore: Math.round(durationScore),
    durationSecs: Math.round(totalSecs),
    segmentCount: actual,
    segmentAccuracies: [],   // not available in rich format
    avgVelocity: r.velocity_kinematics?.average_velocity ?? r.clinical?.kinematics?.avgVelocity
      ? (r.clinical?.kinematics?.avgVelocity || 0) * 1000 : undefined,
    reactionTime: r.time_based_performance?.initial_reaction_time,
    strokeMatch: actual === expected ? 'Perfect' : 'Deviation',
    expectedStrokes: expected,
    actualStrokes: actual,
    normalizedJerk: r.acceleration_jerk_analysis?.normalized_jerk_score ?? r.clinical?.dynamics?.normalizedJerk,
    tremorAmplitude: r.stroke_quality_consistency?.tremor_amplitude ?? r.clinical?.graphomotor?.tremorAmplitude,
    velocityPeaks: r.velocity_kinematics?.velocity_peaks?.length ?? r.clinical?.kinematics?.velocityPeaks,
    symmetryScore: r.shape_formation_quality?.symmetry_score ?? r.clinical?.shape?.symmetryScore,
    baselineAdherence: r.shape_formation_quality?.baseline_adherence,
    shapeSimilarity: r.shape_formation_quality?.shape_similarity_to_ideal,
    fatigueIndex: r.cognitive_fatigue_endurance?.fatigue_index ?? r.clinical?.fatigue?.fatigueIndex,
    selfCorrections: r.error_detection_self_correction?.self_initiated_corrections,
    mirrorSimilarity: r.letter_reversal_orientation?.horizontal_mirror_similarity ?? r.clinical?.orientation?.mirrorConfusionScore,
    rotationSimilarity: r.letter_reversal_orientation?.rotation_90_similarity,
    riskLevel,
    riskColor,
    dyslexiaRisk: Math.round(dyslexiaRisk),
    dysgraphiaRisk: Math.round(dysgraphiaRisk),
    reversalRisk: Math.round(reversalRisk),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskBar helper
// ─────────────────────────────────────────────────────────────────────────────
const RiskBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <View style={styles.riskBarContainer}>
    <Text style={styles.riskBarLabel}>{label}</Text>
    <View style={styles.riskBarTrack}>
      <View style={[styles.riskBarFill, { width: `${Math.min(100, score)}%`, backgroundColor: score < 30 ? DT.text.success : DT.accent.amber }]} />
    </View>
    <Text style={styles.riskBarValue}>{Math.round(score)}%</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DT.bg.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: DT.accent.navy },
  tabText: { fontSize: 14, fontWeight: DT.typography.weightBold, color: DT.text.secondary },
  tabTextActive: { color: DT.accent.navy },
  scrollView: { flex: 1 },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: DT.surface.card,
    margin: 16,
    borderRadius: DT.radius.xl,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  letterDisplay: {
    fontSize: 80,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.navy,
    marginBottom: 4,
  },
  dateText: { fontSize: 14, color: DT.text.muted, marginBottom: 12 },
  statusBadge: { backgroundColor: DT.bg.sage, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: DT.typography.weightBold, color: DT.text.success, textTransform: 'uppercase' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  sectionCard: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    padding: 16,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  scoreCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  scoreCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DT.bg.stone,
    padding: 12,
    borderRadius: DT.radius.md,
    gap: 12,
  },
  scoreCardText: { flex: 1 },
  scoreCardTitle: { fontSize: 12, color: DT.text.muted, fontWeight: DT.typography.weightBold },
  scoreCardValue: { fontSize: 18, fontWeight: DT.typography.weightHeavy },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  metricLabel: { fontSize: 15, color: DT.text.secondary, fontWeight: DT.typography.weightMedium },
  metricValueContainer: { alignItems: 'flex-end' },
  metricValue: { fontSize: 16, fontWeight: DT.typography.weightBold, color: DT.text.primary },
  metricSubtext: { fontSize: 11, color: DT.text.muted },
  riskBigCard: { alignItems: 'center', padding: 20, backgroundColor: DT.bg.stone, borderRadius: DT.radius.lg },
  riskBigLabel: { fontSize: 14, color: DT.text.muted, textTransform: 'uppercase', fontWeight: DT.typography.weightBold, marginBottom: 4 },
  riskBigValue: { fontSize: 36, fontWeight: DT.typography.weightHeavy },
  riskBarContainer: { marginBottom: 16 },
  riskBarLabel: { fontSize: 14, color: DT.text.primary, fontWeight: DT.typography.weightBold, marginBottom: 6 },
  riskBarTrack: { height: 10, backgroundColor: DT.bg.stone, borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  riskBarFill: { height: '100%', borderRadius: 5 },
  riskBarValue: { fontSize: 12, textAlign: 'right', color: DT.text.secondary, fontWeight: DT.typography.weightBold },
  disclaimerBox: {
    margin: 16,
    padding: 16,
    backgroundColor: DT.bg.blush,
    borderRadius: DT.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: DT.text.error,
  },
  disclaimerTitle: { fontSize: 16, fontWeight: DT.typography.weightBold, color: DT.text.error, marginBottom: 8 },
  disclaimerText: { fontSize: 13, color: DT.text.primary, lineHeight: 18 },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: DT.surface.divider,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: DT.bg.lavender,
    paddingVertical: 16,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DT.accent.indigo,
  },
  retryBtnText: { color: DT.accent.indigo, fontSize: 16, fontWeight: DT.typography.weightHeavy },
  doneBtn: {
    flex: 1,
    backgroundColor: DT.accent.navy,
    paddingVertical: 16,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  doneBtnText: { color: DT.text.onDark, fontSize: 16, fontWeight: DT.typography.weightHeavy },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: DT.typography.weightHeavy, color: DT.text.primary, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: DT.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});

export default SessionSummary;
