import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DT } from '../../../utils/DyslexiaTheme';
import ProgressIndicator from '../../../features/letter-tracing/components/tracing/ProgressIndicator';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';

interface RouteParams {
  sessionId: string;
}

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
          {Math.round(score)}
          {maxScore === 100 ? '%' : ''}
        </Text>
      </View>
    </View>
  );
};

const SessionSummary: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { sessionId } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed' | 'diagnostic'>('overview');

  // Mock analytics for visualization
  const analytics: any = {
      letter: 'B',
      timestamp: Date.now(),
      completion_persistence: { letter_completion_status: 'Complete' },
      spatial_accuracy_deviation: { accuracy_score: 87, mean_path_deviation: 12.4, max_path_deviation: 45.2, off_track_events: [], spatial_drift: 0.02 },
      velocity_kinematics: { fluency_ratio: 0.82, average_velocity: 120.5, velocity_range: 80, velocity_peaks: [], velocity_valleys: [] },
      stroke_count_sequencing: { stroke_order_score: 0.9, expected_stroke_count: 3, actual_stroke_count_used: 3, extra_strokes: 0, missing_strokes: 0 },
      time_based_performance: { total_session_duration: 35.2, active_tracing_time: 28.4, initial_reaction_time: 1.2, pause_frequency: 2 },
      automated_risk_assessment: { overall_risk_level: 'Low', dyslexia_risk_score: 15, dysgraphia_risk_score: 12, reversal_risk_score: 5, attention_deficit_risk_score: 8, processing_speed_deficit_score: 10, working_memory_deficit_score: 7 },
      acceleration_jerk_analysis: { normalized_jerk_score: 0.02, acceleration_symmetry: 0.92, ballistic_movement_count: 5, corrective_movement_count: 2, peak_jerk: 1.5 },
      directional_angular_metrics: { direction_reversals_count: 0, mean_curvature: 0.002, curvature_consistency: 0.94, turning_angle_sum: 2.1 },
      stroke_quality_consistency: { stroke_width_mean: 5.2, stroke_width_variance: 0.1, pressure_modulation_score: 85, tremor_frequency: 0.2, tremor_amplitude: 1.2 },
      shape_formation_quality: { aspect_ratio: 1.2, compactness_score: 0.85, symmetry_score: 0.92, baseline_adherence: 0.96, shape_similarity_to_ideal: 0.94 },
      attention_focus: { focus_score: 92, impulsivity_score: 15 },
      working_memory_load: { working_memory_score: 88 },
      cognitive_fatigue_endurance: { fatigue_index: 10 },
      raw_touch_data: { sampling_rate: 60, data_completeness_score: 98, touch_coordinates_array: new Array(200) },
      letter_reversal_orientation: { horizontal_mirror_similarity: 0.1, rotation_90_similarity: 0.05, rotation_180_similarity: 0.02, orientation_consistency_score: 0.98 },
      phonological_awareness_integration: { letter_name_recall_accuracy: 1.0, letter_sound_association: 0.95, audio_playback_count: 1, audio_to_trace_latency: 2.1 },
      clinical_alert_flags: { immediate_referral_flag: false, monitor_closely_flag: false, specific_concern_flags: [] }
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, [sessionId]);

  const handleExport = async () => {
    Alert.alert('Export', 'Analytics data exported to storage.');
  };

  const handleRetry = () => {
    navigation.navigate('Tracing', { letter: analytics.letter, userId: 'user_001' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DT.accent.navy} />
      </SafeAreaView>
    );
  }

  const renderOverview = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.letterDisplay}>{analytics.letter}</Text>
        <Text style={styles.dateText}>
          {new Date(analytics.timestamp).toLocaleString()}
        </Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {analytics.completion_persistence.letter_completion_status}
          </Text>
        </View>
      </View>

      <DetailSection title="Clinical Summary">
        <View style={styles.scoreCardsGrid}>
          <ScoreCard title="Accuracy" score={analytics.spatial_accuracy_deviation.accuracy_score} />
          <ScoreCard title="Fluency" score={analytics.velocity_kinematics.fluency_ratio * 100} />
          <ScoreCard title="Sequence" score={analytics.stroke_count_sequencing.stroke_order_score * 100} />
          <ScoreCard title="Focus" score={analytics.attention_focus.focus_score} />
        </View>
      </DetailSection>

      <DetailSection title="Session Metrics">
        <MetricRow label="Tracing Duration" value={`${analytics.time_based_performance.total_session_duration.toFixed(1)}s`} />
        <MetricRow label="Active Motion" value={`${analytics.time_based_performance.active_tracing_time.toFixed(1)}s`} />
        <MetricRow label="Avg Velocity" value={`${analytics.velocity_kinematics.average_velocity.toFixed(1)} px/s`} />
        <MetricRow label="Reaction Latency" value={`${analytics.time_based_performance.initial_reaction_time.toFixed(2)}s`} />
      </DetailSection>

      <DetailSection title="Stroke Analysis">
        <MetricRow 
            label="Sequence Match" 
            value={analytics.stroke_count_sequencing.actual_stroke_count_used === analytics.stroke_count_sequencing.expected_stroke_count ? "Perfect" : "Deviation"} 
            color={analytics.stroke_count_sequencing.actual_stroke_count_used === analytics.stroke_count_sequencing.expected_stroke_count ? DT.text.success : DT.accent.amber}
        />
        <MetricRow label="Expected Strokes" value={analytics.stroke_count_sequencing.expected_stroke_count} />
        <MetricRow label="Actual Strokes" value={analytics.stroke_count_sequencing.actual_stroke_count_used} />
      </DetailSection>
    </ScrollView>
  );

  const renderDetailed = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <DetailSection title="Kinematics & Smoothness">
        <MetricRow label="Normalized Jerk" value={analytics.acceleration_jerk_analysis.normalized_jerk_score.toFixed(4)} subtitle="Lower is smoother" />
        <MetricRow label="Tremor Amplitude" value={`${analytics.stroke_quality_consistency.tremor_amplitude.toFixed(2)} px`} />
        <MetricRow label="Velocity peaks" value={analytics.velocity_kinematics.velocity_peaks.length} />
      </DetailSection>

      <DetailSection title="Shape Formation">
        <MetricRow label="Symmetry Score" value={`${(analytics.shape_formation_quality.symmetry_score * 100).toFixed(0)}%`} />
        <MetricRow label="Baseline Adherence" value={`${(analytics.shape_formation_quality.baseline_adherence * 100).toFixed(0)}%`} />
        <MetricRow label="Similarity to Ideal" value={`${(analytics.shape_formation_quality.shape_similarity_to_ideal * 100).toFixed(0)}%`} />
      </DetailSection>

      <DetailSection title="Cognitive & Focus">
        <MetricRow label="Fatigue Index" value={analytics.cognitive_fatigue_endurance.fatigue_index} />
        <MetricRow label="Self-Corrections" value={analytics.error_detection_self_correction?.self_initiated_corrections || 0} />
      </DetailSection>
    </ScrollView>
  );

  const renderDiagnostic = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <DetailSection title="Screening Results 🩺">
        <View style={styles.riskBigCard}>
          <Text style={styles.riskBigLabel}>Risk Level</Text>
          <Text style={[styles.riskBigValue, { color: DT.text.success }]}>{analytics.automated_risk_assessment.overall_risk_level.toUpperCase()}</Text>
        </View>
        <View style={{ marginTop: 20 }}>
            <RiskBar label="Dyslexia Risk" score={analytics.automated_risk_assessment.dyslexia_risk_score} />
            <RiskBar label="Dysgraphia Risk" score={analytics.automated_risk_assessment.dysgraphia_risk_score} />
            <RiskBar label="Reversal Risk" score={analytics.automated_risk_assessment.reversal_risk_score} />
        </View>
      </DetailSection>

      <DetailSection title="Orientation Analysis">
        <MetricRow label="Mirror Similarity" value={`${(analytics.letter_reversal_orientation.horizontal_mirror_similarity * 100).toFixed(0)}%`} subtitle="Check for b/d reversals" />
        <MetricRow label="Rotation Similarity" value={`${(analytics.letter_reversal_orientation.rotation_90_similarity * 100).toFixed(0)}%`} />
      </DetailSection>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Clinical Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This report provides automated observations based on tracing kinematics. It is for screening and educational purposes. Consult a specialist for formal diagnosis.
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
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
            <Text style={styles.exportText}>Share</Text>
        </TouchableOpacity>
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

      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'detailed' && renderDetailed()}
      {selectedTab === 'diagnostic' && renderDiagnostic()}

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

const RiskBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <View style={styles.riskBarContainer}>
    <Text style={styles.riskBarLabel}>{label}</Text>
    <View style={styles.riskBarTrack}>
      <View style={[styles.riskBarFill, { width: `${score}%`, backgroundColor: score < 30 ? DT.text.success : DT.accent.amber }]} />
    </View>
    <Text style={styles.riskBarValue}>{Math.round(score)}%</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.cream,
  },
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
  exportBtn: {
    paddingHorizontal: 12,
  },
  exportText: {
    fontSize: 16,
    color: DT.accent.navy,
    fontWeight: DT.typography.weightBold,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: DT.accent.navy,
  },
  tabText: {
    fontSize: 14,
    fontWeight: DT.typography.weightBold,
    color: DT.text.secondary,
  },
  tabTextActive: {
    color: DT.accent.navy,
  },
  scrollView: {
    flex: 1,
  },
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
  dateText: {
    fontSize: 14,
    color: DT.text.muted,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: DT.bg.sage,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: DT.typography.weightBold,
    color: DT.text.success,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
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
  scoreCardText: {
    flex: 1,
  },
  scoreCardTitle: {
    fontSize: 12,
    color: DT.text.muted,
    fontWeight: DT.typography.weightBold,
  },
  scoreCardValue: {
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  metricLabel: {
    fontSize: 15,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
  },
  metricValueContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
  },
  metricSubtext: {
    fontSize: 11,
    color: DT.text.muted,
  },
  riskBigCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: DT.bg.stone,
    borderRadius: DT.radius.lg,
  },
  riskBigLabel: {
    fontSize: 14,
    color: DT.text.muted,
    textTransform: 'uppercase',
    fontWeight: DT.typography.weightBold,
    marginBottom: 4,
  },
  riskBigValue: {
    fontSize: 36,
    fontWeight: DT.typography.weightHeavy,
  },
  riskBarContainer: {
    marginBottom: 16,
  },
  riskBarLabel: {
    fontSize: 14,
    color: DT.text.primary,
    fontWeight: DT.typography.weightBold,
    marginBottom: 6,
  },
  riskBarTrack: {
    height: 10,
    backgroundColor: DT.bg.stone,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  riskBarValue: {
    fontSize: 12,
    textAlign: 'right',
    color: DT.text.secondary,
    fontWeight: DT.typography.weightBold,
  },
  disclaimerBox: {
    margin: 16,
    padding: 16,
    backgroundColor: DT.bg.blush,
    borderRadius: DT.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: DT.text.error,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
    color: DT.text.error,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 13,
    color: DT.text.primary,
    lineHeight: 18,
  },
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
  retryBtnText: {
    color: DT.accent.indigo,
    fontSize: 16,
    fontWeight: DT.typography.weightHeavy,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: DT.accent.navy,
    paddingVertical: 16,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  doneBtnText: {
    color: DT.text.onDark,
    fontSize: 16,
    fontWeight: DT.typography.weightHeavy,
  },
});

export default SessionSummary;
