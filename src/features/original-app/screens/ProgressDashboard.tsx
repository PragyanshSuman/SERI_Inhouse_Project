import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { DT } from '../../../utils/DyslexiaTheme';
import BackButton from '../../../components/BackButton';
import EmotionTracker from '../../../components/EmotionTracker';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  color = DT.accent.navy,
  trend,
}) => (
  <View style={[styles.metricCard, { borderColor: color }]}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    {trend !== undefined && (
      <View style={styles.trendContainer}>
        <Text
          style={[
            styles.trendText,
            { color: trend >= 0 ? DT.text.success : DT.text.error },
          ]}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </Text>
      </View>
    )}
  </View>
);

const ProgressDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'details' | 'risk'>('overview');

  // Mock data for dashboard visualization
  const summary = {
      masteredLetters: ['A', 'B', 'C'],
      problematicLetters: ['S', 'Z'],
      totalSessions: 12,
      averageAccuracy: 84,
      averageDuration: 45,
      overallRiskLevel: 'Low',
      sessionHistory: [
          { session_id: '1', letter: 'A', timestamp: Date.now(), spatial_accuracy_deviation: { accuracy_score: 92 }, time_based_performance: { total_session_duration: 32 }, stroke_count_sequencing: { actual_stroke_count_used: 3, expected_stroke_count: 3 } }
      ],
      automated_risk_assessment: {
          dyslexia_risk_score: 15,
          dysgraphia_risk_score: 10,
          reversal_risk_score: 5,
          attention_deficit_risk_score: 8,
          processing_speed_deficit_score: 12,
          working_memory_deficit_score: 9
      },
      clinical_alert_flags: {
          specific_concern_flags: []
      }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DT.accent.navy} />
      </SafeAreaView>
    );
  }

  const renderOverview = () => {
    const masteredCount = summary.masteredLetters.length;
    const learningCount = 26 - masteredCount - summary.problematicLetters.length;

    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Mastery 🏆</Text>
          <View style={styles.card}>
            <View style={styles.progressRow}>
                <View style={styles.progressCircleStub}>
                    <Text style={styles.progressPercent}>{Math.round((masteredCount/26)*100)}%</Text>
                </View>
                <View style={styles.progressDetails}>
                    <Text style={styles.progressText}>{masteredCount} / 26 Letters Mastered</Text>
                    <Text style={styles.progressSubtext}>{summary.problematicLetters.length} letters need more practice</Text>
                </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics 📈</Text>
          <View style={styles.metricsGrid}>
            <MetricCard title="Sessions" value={summary.totalSessions} color={DT.accent.navy} />
            <MetricCard title="Avg Accuracy" value={`${summary.averageAccuracy}%`} color={DT.text.success} />
            <MetricCard title="Avg Duration" value={`${summary.averageDuration}s`} color={DT.accent.sky} />
            <MetricCard title="Risk Level" value={summary.overallRiskLevel} color={DT.accent.teal} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accuracy Trend</Text>
          <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr"],
                  datasets: [{ data: [70, 75, 82, 84] }],
                }}
                width={SCREEN_WIDTH - 64}
                height={200}
                chartConfig={{
                  backgroundColor: DT.surface.card,
                  backgroundGradientFrom: DT.surface.card,
                  backgroundGradientTo: DT.surface.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(46, 74, 122, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "6", strokeWidth: "2", stroke: DT.accent.navy },
                }}
                bezier
                style={styles.chart}
              />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letter Status</Text>
          <View style={styles.chartCard}>
              <PieChart
                data={[
                  { name: 'Mastered', count: masteredCount, color: DT.text.success, legendFontColor: DT.text.primary, legendFontSize: 12 },
                  { name: 'Learning', count: learningCount, color: DT.accent.amber, legendFontColor: DT.text.primary, legendFontSize: 12 },
                  { name: 'Struggling', count: summary.problematicLetters.length, color: DT.text.error, legendFontColor: DT.text.primary, legendFontSize: 12 },
                ]}
                width={SCREEN_WIDTH - 64}
                height={180}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
          </View>
        </View>
      </View>
    );
  };

  const renderDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Session History</Text>
      {summary.sessionHistory.map((session, index) => (
        <TouchableOpacity
          key={index}
          style={styles.sessionCard}
          onPress={() => navigation.navigate('SessionSummary', { sessionId: session.session_id })}
        >
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionLetter}>{session.letter}</Text>
            <Text style={styles.sessionDate}>{new Date(session.timestamp).toLocaleDateString()}</Text>
          </View>
          <View style={styles.sessionMetrics}>
            <View style={styles.sessionMetric}>
                <Text style={styles.sessionMetricLabel}>Accuracy</Text>
                <Text style={[styles.sessionMetricValue, { color: DT.text.success }]}>
                    {session.spatial_accuracy_deviation.accuracy_score}%
                </Text>
            </View>
            <View style={styles.sessionMetric}>
                <Text style={styles.sessionMetricLabel}>Duration</Text>
                <Text style={styles.sessionMetricValue}>{session.time_based_performance.total_session_duration}s</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRiskAssessment = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Screening Report 🛡️</Text>
      <Text style={styles.sectionSubtitle}>Preliminary risk assessment based on tracing patterns</Text>

      <View style={styles.card}>
        <Text style={styles.riskTitle}>Overall Risk Indicator</Text>
        <Text style={[styles.riskLevel, { color: DT.text.success }]}>
          {summary.overallRiskLevel.toUpperCase()}
        </Text>
      </View>

      <View style={styles.riskMetricsGrid}>
        <RiskMetric label="Visual-Spatial" value={summary.automated_risk_assessment.dyslexia_risk_score} />
        <RiskMetric label="Motor Control" value={summary.automated_risk_assessment.dysgraphia_risk_score} />
        <RiskMetric label="Orientation" value={summary.automated_risk_assessment.reversal_risk_score} />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          <Text style={{fontWeight: 'bold'}}>Note: </Text>
          This is an automated educational tool, not a medical diagnosis.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <EmotionTracker moduleName="Analytics Dashboard" isActive={true} />
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />
      <View style={styles.topNav}>
        <BackButton onPress={() => navigation.goBack()} color={DT.accent.navy} />
        <Text style={styles.headerTitle}>Progress Dashboard</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabContainer}>
        {(['overview', 'details', 'risk'] as const).map(view => (
          <TouchableOpacity
            key={view}
            style={[styles.tab, selectedView === view && styles.tabActive]}
            onPress={() => setSelectedView(view)}
          >
            <Text style={[styles.tabText, selectedView === view && styles.tabTextActive]}>
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'details' && renderDetails()}
        {selectedView === 'risk' && renderRiskAssessment()}
      </ScrollView>
    </SafeAreaView>
  );
};

const RiskMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.riskMetricCard}>
    <Text style={styles.riskMetricLabel}>{label}</Text>
    <View style={styles.riskBar}>
      <View style={[styles.riskBarFill, { width: `${value}%`, backgroundColor: value < 30 ? DT.text.success : DT.accent.amber }]} />
    </View>
    <Text style={styles.riskMetricValue}>{Math.round(value)}%</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.cream,
  },
  topNav: {
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
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
    fontSize: 15,
    fontWeight: DT.typography.weightBold,
    color: DT.text.secondary,
  },
  tabTextActive: {
    color: DT.accent.navy,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 12,
    letterSpacing: DT.typography.letterSpacingUI,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: DT.text.secondary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    padding: 20,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressCircleStub: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DT.bg.sage,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: DT.text.success,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
  },
  progressDetails: {
    flex: 1,
  },
  progressText: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
  },
  progressSubtext: {
    fontSize: 14,
    color: DT.text.secondary,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: DT.surface.card,
    padding: 16,
    borderRadius: DT.radius.md,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
    borderLeftWidth: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: DT.text.muted,
    fontWeight: DT.typography.weightBold,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: DT.typography.weightHeavy,
    marginTop: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: DT.text.muted,
  },
  chartCard: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    padding: 16,
    alignItems: 'center',
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  chart: {
    borderRadius: 16,
  },
  sessionCard: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.md,
    padding: 16,
    marginBottom: 12,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionLetter: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.navy,
  },
  sessionDate: {
    fontSize: 14,
    color: DT.text.muted,
  },
  sessionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionMetric: {
    alignItems: 'center',
  },
  sessionMetricLabel: {
    fontSize: 12,
    color: DT.text.muted,
  },
  sessionMetricValue: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
  },
  riskTitle: {
    fontSize: 16,
    color: DT.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  riskLevel: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    textAlign: 'center',
  },
  riskMetricsGrid: {
    gap: 12,
  },
  riskMetricCard: {
    backgroundColor: DT.surface.card,
    padding: 16,
    borderRadius: DT.radius.md,
    ...DT.shadow.soft,
  },
  riskMetricLabel: {
    fontSize: 14,
    color: DT.text.primary,
    fontWeight: DT.typography.weightBold,
    marginBottom: 8,
  },
  riskBar: {
    height: 8,
    backgroundColor: DT.bg.stone,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  riskMetricValue: {
    fontSize: 14,
    fontWeight: DT.typography.weightBold,
    color: DT.text.secondary,
    textAlign: 'right',
  },
  infoBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: DT.bg.sage,
    borderRadius: DT.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: DT.accent.teal,
  },
  infoText: {
    fontSize: 14,
    color: DT.text.primary,
    lineHeight: 20,
  },
});

export default ProgressDashboard;
