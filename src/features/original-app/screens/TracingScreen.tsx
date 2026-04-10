import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { Svg, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { AppText as Text } from '../../../components/AppText';
import TracingCanvas from '../components/TracingCanvas';
import AudioButton from '../components/AudioButton';
import { useTracingSession } from '../hooks/useTracingSession';
import { LETTER_PATHS } from '../constants/LetterPaths';
import { LetterPath } from '../models/TracingData';
import StorageService from '../services/StorageService';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import EmotionTracker from '../../../components/EmotionTracker';
import InfoButton from '../../../components/InfoButton';
import BackButton from '../../../components/BackButton';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { DT } from '../../../utils/DyslexiaTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 24, 900);
const CANVAS_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 1200);

interface TracingScreenProps {
  letter: string;
  userId: string;
  onComplete?: (analytics: any) => void;
  onExit?: () => void;
}

const TracingScreen: React.FC<TracingScreenProps> = ({
  letter,
  userId,
  onComplete,
  onExit,
}) => {
  const { settings } = useSettings();
  const { language } = settings;
  const letterPath: LetterPath = LETTER_PATHS[letter.toUpperCase()];
  
  const [showInstructions, setShowInstructions] = useState(false);
  const [introTourVisible, setIntroTourVisible] = useState(false);
  const [tracingTourVisible, setTracingTourVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  useEffect(() => {
    initializeSession();
  }, [letter]);

  const userDemographics = {
    chronological_age: 7,
    chronological_age_months: 84,
    handedness: 'right',
    prior_dyslexia_diagnosis: 'none',
    comorbid_conditions: [],
    intervention_history: [],
    native_language: 'English',
    language_of_instruction: 'English',
    user_id: userId,
  };

  const {
    isActive,
    sessionStarted,
    analytics,
    idealPath,
    activeStrokeIndex,
    startTracing,
    handleTouchMove,
    handleTouchEnd,
    advanceStroke,
    handleAudioPlay,
    endSession,
    resetSession,
    initializeSession,
  } = useTracingSession({
    letterPath,
    userId,
    userDemographics,
  });

  const handleClear = () => {
    resetSession();
    setResetTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    resetSession();
    setShowResults(false);
    setShowInstructions(false);
    initializeSession();
  };

  const handleFinish = async () => {
    setIsCompleting(true);
    try {
      const report = await endSession('completed');
      if (report) {
          setSessionAnalytics(report);
          setShowResults(true);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      Alert.alert('Analysis Failed', 'There was an issue generating your report.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenDemo = () => {
    if (!sessionStarted) {
        initializeSession();
    }
    setIsDemoVisible(true);
  };

  const handleExit = () => {
    if (isActive && !showResults) {
      Alert.alert(
        'Exit?',
        'Your progress will not be saved. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => {
              endSession('abandoned');
              onExit?.();
            },
          },
        ]
      );
    } else {
      onExit?.();
    }
  };

  if (!idealPath) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DT.accent.sky} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <EmotionTracker moduleName="Letter Mastery" isActive={!introTourVisible && !tracingTourVisible} />
      <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.skyBlue} />
      <BackButton onPress={onExit} color={DT.accent.navy} />
      <InfoButton onPress={() => setIntroTourVisible(true)} color={DT.accent.navy} />
      
      <View style={styles.header}>
        {!showInstructions && !showResults && (
           <View style={styles.headerTitleRow}>
           </View>
        )}
      </View>



      {!showInstructions && !showResults && (
        <View style={styles.canvasContainer}>
          <View style={styles.canvasWrapper}>
            <TracingCanvas
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              idealPath={idealPath}
              activeStrokeIndex={activeStrokeIndex}
              onStrokeComplete={advanceStroke}
              onTouchMove={handleTouchMove}
              onTouchStart={startTracing}
              onTouchEnd={handleTouchEnd}
              isBareMode={true}
              resetTrigger={resetTrigger}
            />

            {!showResults && (
              <>
                {/* Top Controls: Clear and Watch */}
                <View style={styles.canvasClearOverlay}>
                  <TouchableOpacity style={styles.controlOrb} onPress={handleClear}>
                    <Svg width={32} height={32} viewBox="0 0 100 100">
                      <Path d="M25 25 L75 75 M75 25 L25 75" stroke="white" strokeWidth="12" strokeLinecap="round" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                <View style={styles.canvasPlayOverlay}>
                  <TouchableOpacity style={[styles.controlOrb, { backgroundColor: DT.accent.sky }]} onPress={handleOpenDemo}>
                    <Svg width={32} height={32} viewBox="0 0 100 100">
                      <Path d="M35 25 L75 50 L35 75 Z" fill="white" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                {/* Bottom Controls: Audio and Finish */}
                <View style={styles.canvasAudioOverlay}>
                  <AudioButton 
                    letter={letter} 
                    onPlayStart={handleAudioPlay} 
                    size={52} 
                    color={DT.accent.navy}
                  />
                </View>

                <View style={styles.canvasCheckOverlay}>
                  <TouchableOpacity 
                    style={[styles.finishOrb, isCompleting && { opacity: 0.7 }]} 
                    onPress={handleFinish}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <ActivityIndicator color={DT.text.onDark} />
                    ) : (
                      <Svg width={48} height={48} viewBox="0 0 100 100">
                        <Defs>
                          <LinearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
                          </LinearGradient>
                        </Defs>
                        <Circle cx="50" cy="50" r="48" fill={DT.accent.green} />
                        <Circle cx="50" cy="50" r="46" fill="url(#checkGrad)" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
                        <Path
                          d="M30 50l15 15l30-30"
                          stroke="white"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </Svg>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {showResults && sessionAnalytics && (
        <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
            <Text style={styles.resultsTitle}>{getTranslation(language, 'trace_result_title')}</Text>
            
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Accuracy</Text>
                    <Text style={[styles.statValue, { color: DT.text.success }]}>
                        {Math.round(sessionAnalytics.overview?.score || 0)}%
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Completeness</Text>
                    <Text style={[styles.statValue, { color: DT.accent.sky }]}>
                        {Math.round((sessionAnalytics.clinical?.dataQuality?.completenessScore || 0) * 100)}%
                    </Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>Training Feedback</Text>
                <Text style={styles.reportSubtitle}>How you did on sound "{letter}"</Text>
                
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tracing Speed</Text>
                    <Text style={styles.detailValue}>{( (sessionAnalytics.clinical?.kinematics?.avgVelocity || 0) * 1000 ).toFixed(1)} px/s</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fluency (Smoothness)</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.clinical?.kinematics?.fluencyRatio || 0) * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tremor (Shakiness)</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.tremorAmplitude || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Touch Pressure</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.avgPressure || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completion Time</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.overview?.completionTime || 0) / 1000).toFixed(1)} s</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>1. Kinematics (Motion)</Text>
                <Text style={styles.reportSubtitle}>How you moved your hand</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mean Velocity</Text>
                    <Text style={styles.detailValue}>{( (sessionAnalytics.clinical?.kinematics?.avgVelocity || 0) * 1000 ).toFixed(1)} px/s</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Peak Velocity</Text>
                    <Text style={styles.detailValue}>{( (sessionAnalytics.clinical?.kinematics?.peakVelocity || 0) * 1000 ).toFixed(1)} px/s</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Speed Consistency (CoV)</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.kinematics?.velocityCoV || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fluency Ratio</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.clinical?.kinematics?.fluencyRatio || 0) * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Velocity Peaks</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.kinematics?.velocityPeaks || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Velocity Valleys (Hesitations)</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.kinematics?.velocityValleys || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time In Motion</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.clinical?.kinematics?.timeInMotion || 0) / 1000).toFixed(1)} s</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>2. Dynamics (Smoothness)</Text>
                <Text style={styles.reportSubtitle}>The flow of your strokes</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Avg Jerk (Coordination)</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.dynamics?.avgJerk || 0).toFixed(3)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Normalized Jerk</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.dynamics?.normalizedJerk || 0).toFixed(3)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Max Acceleration</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.dynamics?.maxAcceleration || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Accel Symmetry</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.dynamics?.accelerationSymmetry || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ballistic (Smooth) Movements</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.dynamics?.ballisticMovements || 0}</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>3. Graphomotor (Mechanics)</Text>
                <Text style={styles.reportSubtitle}>Physical writing properties</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tremor Amplitude</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.tremorAmplitude || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tremor Frequency</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.tremorFrequency || 0).toFixed(2)} Hz</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tremor Power</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.tremorPower || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Avg Target Pressure</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.avgPressure || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pressure Variance</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.graphomotor?.pressureVariance || 0).toFixed(3)}</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>4. Shape & Spatial Analysis</Text>
                <Text style={styles.reportSubtitle}>Geometric correctness</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mean Path Deviation</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.shape?.mean_path_deviation || 0).toFixed(1)} px</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Off-Track Errors</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.shape?.offTrackEvents || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aspect Ratio</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.shape?.aspect_ratio || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Compactness Score</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.shape?.compactness_score || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Shape Closure Success</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.clinical?.shape?.closure_success_rate || 0)*100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Spatial Drift</Text>
                    <Text style={styles.detailValue}>{(sessionAnalytics.clinical?.shape?.spatialDrift || 0).toFixed(1)} px</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>5. Sequencing & Timing</Text>
                <Text style={styles.reportSubtitle}>Stroke order and delays</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stroke Count</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.sequencing?.strokeCountActual || 0} (Expected: {sessionAnalytics.clinical?.sequencing?.strokeCountExpected || 0})</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Extra Strokes</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.sequencing?.extraStrokes || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lift-Off Count</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.sequencing?.liftOffCount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Inter-Stroke Latency</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.sequencing?.avgInterStrokeLatency?.toFixed(0) || 0} ms</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>6. Orientation</Text>
                <Text style={styles.reportSubtitle}>Directionality and Mirroring</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reversal Detected</Text>
                    <Text style={[styles.detailValue, sessionAnalytics.clinical?.orientation?.reversalDetected && { color: DT.accent.rose }]}>
                        {sessionAnalytics.clinical?.orientation?.reversalDetected ? 'Yes' : 'No'}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mirror Confusion Score</Text>
                    <Text style={styles.detailValue}>{((sessionAnalytics.clinical?.orientation?.mirrorConfusionScore || 0)*100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Micropause Count</Text>
                    <Text style={styles.detailValue}>{sessionAnalytics.clinical?.orientation?.micropauseCount || 0}</Text>
                </View>
            </View>

            <View style={styles.detailedMetrics}>
                <Text style={styles.sectionTitle}>7. Artificial Intelligence (ML)</Text>
                <Text style={styles.reportSubtitle}>Neural Network Probability Map</Text>
                
                {sessionAnalytics.ml?.topPredictions?.map((prediction: any, index: number) => (
                    <View key={`pred-${index}`} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                            {index === 0 ? 'Top Match (1st)' : index === 1 ? 'Close Match (2nd)' : '3rd Guess'} - "{prediction.char}"
                        </Text>
                        <Text style={[styles.detailValue, index === 0 && { color: DT.accent.sky }]}>
                            {(prediction.score * 100).toFixed(1)}% Match
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.resultsActions}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryButtonText}>{getTranslation(language, 'trace_retry_button')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exitButtonResults} onPress={onExit}>
                    <Text style={styles.exitButtonTextResults}>Done</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
      )}

      </SafeAreaView>

      <Modal visible={isDemoVisible} transparent animationType="fade">
          <View style={styles.demoModalOverlay}>
              <View style={styles.demoModalContent}>
                  <TouchableOpacity style={styles.closeDemoButton} onPress={() => setIsDemoVisible(false)}>
                      <Text style={styles.closeDemoText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.demoTitle}>Watch Carefully!</Text>
                  <View style={styles.demoCanvasContainer}>
                      <TracingCanvas
                        width={CANVAS_WIDTH * 0.65}
                        height={CANVAS_HEIGHT * 0.65}
                        idealPath={idealPath}
                        activeStrokeIndex={-1}
                        onStrokeComplete={() => {}}
                        autoPlay={true}
                      />
                  </View>
              </View>
          </View>
      </Modal>

      <FeatureTour 
        visible={introTourVisible}
        steps={[
            {
                title: "Welcome to Letter Mastery! 🏫",
                description: "Let's learn how to write the letter " + letter,
                position: 'center',
            }
        ]}
        onComplete={() => setIntroTourVisible(false)}
        onSkip={() => setIntroTourVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.skyBlue,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    zIndex: 100,
  },
  exitButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 36, 23, 0.1)',
    borderRadius: 20,
  },
  exitButtonText: {
    fontSize: 20,
    color: DT.text.primary,
    fontWeight: '800',
  },
  headerWatchButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: DT.bg.lavender,
      borderRadius: 20,
      marginLeft: 'auto',
      marginRight: 16,
      ...DT.shadow.soft,
      borderWidth: 1,
      borderColor: DT.surface.cardBorder,
  },
  headerWatchText: {
      fontSize: 20,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerLetterText: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.indigo,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
  },
  placeholder: {
    width: 40,
  },
  instructionsContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: {
    fontSize: 28,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  mainLetterTitle: {
    fontSize: 180,
    fontWeight: DT.typography.weightHeavy,
    color: DT.accent.indigo,
    marginBottom: 60,
    ...DT.shadow.medium,
    textAlign: 'center',
  },
  instructionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  watchButton: {
    flex: 1,
    backgroundColor: DT.bg.lavender,
    paddingVertical: 18,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DT.surface.cardBorder,
  },
  watchButtonText: {
    color: DT.text.primary,
    fontSize: 17,
    fontWeight: DT.typography.weightBold,
  },
  startButton: {
    flex: 1,
    backgroundColor: DT.accent.sky,
    paddingVertical: 18,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  startButtonText: {
    color: DT.text.onDark,
    fontSize: 17,
    fontWeight: DT.typography.weightHeavy,
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100, // Increased to avoid overlap with letter picker strip
    width: '100%',
  },
  canvasWrapper: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: DT.radius.lg,
    overflow: 'hidden',
    backgroundColor: 'white',
    ...DT.shadow.medium,
  },
  canvasAudioOverlay: {
    position: 'absolute',
    bottom: 24, 
    left: 24,
    zIndex: 50,
  },
  canvasCheckOverlay: {
    position: 'absolute',
    bottom: 24, 
    right: 24,
    zIndex: 50,
  },
  canvasClearOverlay: {
    position: 'absolute',
    top: 24, 
    left: 24,
    zIndex: 50,
  },
  canvasPlayOverlay: {
    position: 'absolute',
    top: 24, 
    right: 24,
    zIndex: 50,
  },
  controlOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 69, 58, 0.8)', // Clear defaults to soft red
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.medium,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  finishOrb: {
    backgroundColor: DT.accent.green,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.medium,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  finishButton: {
    marginTop: 30,
    backgroundColor: DT.accent.green,
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: DT.radius.xl,
    ...DT.shadow.medium,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  finishButtonText: {
    color: DT.text.onDark,
    fontSize: 22,
    fontWeight: DT.typography.weightHeavy,
    letterSpacing: 1.5,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: DT.bg.parchment,
  },
  resultsContent: {
    padding: 24,
    paddingBottom: 100, // Increased to avoid overlap with letter picker strip
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginVertical: 32,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 20,
    alignItems: 'center',
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  statLabel: {
    fontSize: 14,
    color: DT.text.muted,
    fontWeight: DT.typography.weightBold,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    textAlign: 'center',
  },
  detailedMetrics: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 15,
    color: DT.text.secondary,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DT.surface.divider,
  },
  detailLabel: {
    fontSize: 16,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: DT.typography.weightBold,
    color: DT.text.primary,
  },
  resultsActions: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: DT.bg.lavender,
    paddingVertical: 18,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DT.accent.indigo,
  },
  retryButtonText: {
    color: DT.accent.indigo,
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
  },
  exitButtonResults: {
    backgroundColor: DT.accent.navy,
    paddingVertical: 18,
    borderRadius: DT.radius.lg,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  exitButtonTextResults: {
    color: DT.text.onDark,
    fontSize: 18,
    fontWeight: DT.typography.weightHeavy,
  },
  demoModalOverlay: {
    flex: 1,
    backgroundColor: DT.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoModalContent: {
    width: '90%',
    height: '75%',
    backgroundColor: DT.bg.cream,
    borderRadius: DT.radius.xl,
    padding: 24,
    alignItems: 'center',
    ...DT.shadow.medium,
    borderWidth: 2,
    borderColor: DT.surface.cardBorder,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 20,
  },
  closeDemoButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 44,
    height: 44,
    backgroundColor: DT.accent.navy,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...DT.shadow.medium,
    zIndex: 100,
  },
  closeDemoText: {
    fontSize: 24,
    color: DT.text.onDark,
    fontWeight: '800',
  },
  demoCanvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
});

export default TracingScreen;
