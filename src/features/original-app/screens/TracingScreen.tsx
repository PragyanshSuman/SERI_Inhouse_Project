import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import TracingCanvas from '../components/TracingCanvas';
import AudioButton from '../components/AudioButton';
import LetterDisplay from '../components/LetterDisplay';
import { useTracingSession } from '../hooks/useTracingSession';
import { LETTER_PATHS } from '../constants/LetterPaths';
import { LetterPath } from '../models/TracingData';
import StorageService from '../services/StorageService';
import { Dimensions } from 'react-native';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import { useLanguage } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';





const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive Dimensions
// Maximize width and height within safe bounds, do NOT force aspect ratio here.
// The Canvas component handles "meet" scaling (letterboxing).
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 20, 600); // 10px margin/side, max 600
const CANVAS_HEIGHT = Math.min(SCREEN_HEIGHT * 0.70, 800); // Max 70% height, max 800


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
  const { language } = useLanguage();
  const letterPath: LetterPath = LETTER_PATHS[letter.toUpperCase()];
  
  const [showInstructions, setShowInstructions] = useState(true);
  const [introTourVisible, setIntroTourVisible] = useState(true);
  const [tracingTourVisible, setTracingTourVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);
  const [isDemoVisible, setIsDemoVisible] = useState(false);

  // Trigger tracing tour when instructions view is dismissed
  useEffect(() => {
    if (!showInstructions) {
        // Find a way to delay slightly for transition? Or just set it.
        // A small timeout feels better for UI transition
        const timer = setTimeout(() => {
            setTracingTourVisible(true);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [showInstructions]);

  // User demographics (would come from user profile)
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
    advanceStroke,
    handleAudioPlay,
    endSession,
    resetSession,
    initializeSession,
    feedback,
  } = useTracingSession({
    letterPath,
    userId,
    userDemographics,
  });

  // Removed canvasRef as state is managed by props and hooks


  useEffect(() => {
    // Initialize session on mount
    initializeSession();
  }, []);

  /**
   * Start tracing session
   */
  const handleStartTracing = () => {
    setShowInstructions(false);
    startTracing();
  };

  /**
   * Complete session with ML validation
   * 
   * HYBRID APPROACH:
   * - Template remains visible in TracingCanvas for visual guidance
   * - ML model (via ShadowFeatureExtractor) validates character correctness
   * - All biomechanical features (jerk, tremor, etc.) calculated independently
   */
  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      // Get session analytics (includes ML validation from ShadowFeatureExtractor)
      const result = await endSession('completed');
      if (result) {
        // result.mlFeatures contains ML-based character recognition
        // result.features contains all biomechanical metrics (unchanged)
        setSessionAnalytics(result);
        setShowResults(true);
        onComplete?.(result);
        
        // Auto-export for study
        await StorageService.exportToJSON(result);
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
      Alert.alert('Error', 'Failed to save session data');
    } finally {
      setIsCompleting(false);
    }
  };

  /**
   * Retry tracing
   */
  const handleRetry = () => {
    resetSession();
    setShowResults(false);
    setShowInstructions(true);
    initializeSession();
  };

  /**
   * Export analytics
   */
  const handleExport = async () => {
    if (!sessionAnalytics) return;

    try {
      const jsonPath = await StorageService.exportToJSON(sessionAnalytics);
      const csvPath = await StorageService.exportToCSV(sessionAnalytics);
      
      Alert.alert(
        'Export Successful',
        `Files saved:\n${jsonPath}\n${csvPath}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export analytics');
    }
  };

  /**
   * Exit screen
   */
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
        <ActivityIndicator size="large" color="#58CC02" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={styles.headerWatchButton}
            onPress={() => setIsDemoVisible(true)}
        >
            <Text style={styles.headerWatchText}>👁️</Text>
        </TouchableOpacity>
        
        {/* Progress Bar (Mock) */}
        {!showInstructions && !showResults && (
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${((activeStrokeIndex) / letterPath.strokes.length) * 100}%` }]} />
            </View>
        )}
        
        {/* Placeholder for balance */}
        <View style={styles.placeholder} />
      </View>

      {/* Instructions Screen */}
      {showInstructions && (
        <View style={styles.instructionsContainer}>
           <Text style={styles.instructionTitle}>{getTranslation(language, 'trace_lets_learn')}</Text>
           <Text style={styles.mainLetterTitle}>{letter}</Text>
           
           <View style={styles.audioSection}>
             <AudioButton
               letter={letter}
               onPlayStart={handleAudioPlay}
               size={120}
             />
             <Text style={styles.instructionText}>{getTranslation(language, 'trace_tap_listen')}</Text>
           </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartTracing}
          >
            <Text style={styles.startButtonText}>{getTranslation(language, 'trace_start_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tracing Screen */}
      {!showInstructions && !showResults && (
        <View style={styles.tracingContainer}>
          <View style={styles.topSection}>
            <Text style={styles.tracePrompt}>
                {activeStrokeIndex === 0 ? getTranslation(language, 'trace_start_green') :
                 activeStrokeIndex === letterPath.strokes.length - 1 ? getTranslation(language, 'trace_almost_done') :
                 `${getTranslation(language, 'trace_stroke')} ${activeStrokeIndex + 1}`}
            </Text>
            <View style={styles.soundButtonRow}>
                <Text style={styles.targetLetterSmall}>{letter}</Text>
                <AudioButton
                  letter={letter}
                  onPlayStart={handleAudioPlay}
                  size={50}
                  useLetterName={true}
                />
            </View>
          </View>

       
          <View style={styles.canvasContainer}>
            <TracingCanvas
              idealPath={idealPath}
              activeStrokeIndex={activeStrokeIndex}
              letterStrokes={letterPath.strokes}
              onTouchStart={startTracing}
              onTouchMove={handleTouchMove}
              onStrokeComplete={advanceStroke} // Auto-advance stroke
              showGuidelines={true}  // Show letter template
              showFeedback={true}
              showHand={false} // Hide hand on main canvas
              showStrokeHints={false} // Hide numbers on main canvas
              showGrid={false}
              showActiveStrokeBackground={false}
              showActiveStrokeGuide={false}
              validationFeedback={feedback}
              tolerancePixels={50}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={[styles.primaryButton, isCompleting && styles.disabledButton]}
              onPress={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{getTranslation(language, 'trace_check_btn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Results Screen */}
      {showResults && sessionAnalytics && (
        <ScrollView style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>{getTranslation(language, 'lesson_complete')}</Text>
            <LetterDisplay letter={letter} size={100} color="#fff" />
            <View style={styles.resultStatsRow}>
                 <View style={styles.statBox}>
                    <Text style={styles.statLabel}>{getTranslation(language, 'time')}</Text>
                    <Text style={[styles.statValue, { color: '#2196F3' }]}>
                        {(sessionAnalytics.overview.completionTime / 1000).toFixed(1)}s
                    </Text>
                 </View>
            </View>
          </View>

          <View style={styles.detailedMetrics}>
            <Text style={styles.sectionTitle}>{getTranslation(language, 'analytics_report')}</Text>
            <Text style={styles.reportSubtitle}>{getTranslation(language, 'data_saved')}</Text>
            
            {/* 1. Structural Analysis */}
            <Text style={styles.subHeader}>{getTranslation(language, 'shape_structure')}</Text>
            <DetailRow label="Aspect Ratio" value={sessionAnalytics.clinical.shape?.aspect_ratio?.toFixed(2) ?? '-'} />
            <DetailRow label="Compactness" value={sessionAnalytics.clinical.shape?.compactness_score?.toFixed(2) ?? '-'} />
            <DetailRow label="Closure Rate" value={`${((sessionAnalytics.clinical.shape?.closure_success_rate ?? 0) * 100).toFixed(0)}%`} />
            
            {/* 2. Kinematics & Fluency */}
            <Text style={styles.subHeader}>{getTranslation(language, 'speed_fluency')}</Text>
            <DetailRow label="Avg Velocity" value={`${(sessionAnalytics.clinical.kinematics.avgVelocity ?? 0).toFixed(1)} px/ms`} />
            <DetailRow label="Peak Velocity" value={`${(sessionAnalytics.clinical.kinematics.peakVelocity ?? 0).toFixed(1)} px/ms`} />
            <DetailRow label="Velocity CoV" value={`${(sessionAnalytics.clinical.kinematics.velocityCoV ?? 0).toFixed(2)}`} />
            <DetailRow label="Velocity Peaks" value={`${sessionAnalytics.clinical.kinematics.velocityPeaks}`} />
            <DetailRow label="Hesitations" value={`${sessionAnalytics.clinical.kinematics.velocityValleys}`} />
            <DetailRow label="Smoothness" value={`${(100 - ((sessionAnalytics.clinical.dynamics.avgJerk ?? 0) * 1000)).toFixed(0)}%`} />
            <DetailRow label="Avg Jerk" value={`${(sessionAnalytics.clinical.dynamics.avgJerk ?? 0).toFixed(4)}`} />
            <DetailRow label="Sampling Rate" value={`${(sessionAnalytics.clinical.dataQuality.samplingRate ?? 0).toFixed(0)} Hz`} />

            {/* 3. Motor Control & Dynamics */}
            <Text style={styles.subHeader}>{getTranslation(language, 'motor_dynamics')}</Text>
            <DetailRow label="Tremor Power" value={`${sessionAnalytics.clinical.graphomotor.tremorPower?.toFixed(2) ?? '0.00'}`} />
            <DetailRow label="Tremor Freq" value={`${sessionAnalytics.clinical.graphomotor.tremorFrequency?.toFixed(1) ?? '0'} Hz`} />
            <DetailRow label="Tremor Amp" value={`${sessionAnalytics.clinical.graphomotor.tremorAmplitude?.toFixed(2) ?? '0'} px`} />
            <DetailRow label="Max Accel" value={`${(sessionAnalytics.clinical.dynamics.maxAcceleration ?? 0).toFixed(1)} px/s²`} />
            <DetailRow label="Symmetry" value={`${(sessionAnalytics.clinical.dynamics.accelerationSymmetry ?? 0).toFixed(2)}`} />
            <DetailRow label="Avg Pressure" value={`${(sessionAnalytics.clinical.graphomotor.avgPressure ?? 1).toFixed(2)}`} />
            <DetailRow label="Press Variance" value={`${(sessionAnalytics.clinical.graphomotor.pressureVariance ?? 0).toFixed(4)}`} />
            <DetailRow label="Ballistic Strokes" value={`${sessionAnalytics.clinical.dynamics.ballisticMovements}`} />

            {/* 4. Temporal & Sequencing */}
            <Text style={styles.subHeader}>{getTranslation(language, 'temporal_sequencing')}</Text>
            <DetailRow label="Time in Motion" value={`${(sessionAnalytics.clinical.kinematics.timeInMotion / 1000).toFixed(1)}s`} />
            <DetailRow label="Paused Time" value={`${(sessionAnalytics.clinical.kinematics.timePaused / 1000).toFixed(1)}s`} />
            <DetailRow label="Fluency Ratio" value={`${(sessionAnalytics.clinical.kinematics.fluencyRatio * 100).toFixed(0)}%`} />
            <DetailRow label="Strokes" value={`${sessionAnalytics.clinical.sequencing.strokeCountActual} ${sessionAnalytics.clinical.sequencing.strokeCountExpected > 0 ? '/ ' + sessionAnalytics.clinical.sequencing.strokeCountExpected : ''}`} />
            <DetailRow label="Extra Strokes" value={`${sessionAnalytics.clinical.sequencing.extraStrokes}`} />
            <DetailRow label="Lift Offs" value={`${sessionAnalytics.clinical.sequencing.liftOffCount}`} />
            <DetailRow label="Pauses" value={`${sessionAnalytics.clinical.kinematics.velocityValleys}`} />
            <DetailRow label="Reversals" value={`${sessionAnalytics.clinical.orientation.reversalDetected ? 'YES' : 'NO'}`} />
          </View>

          {/* ML Analysis Section */}
          {sessionAnalytics.ml && (
            <View style={styles.detailedMetrics}>
              <Text style={styles.sectionTitle}>{getTranslation(language, 'ml_analysis')}</Text>
              <Text style={styles.reportSubtitle}>
                {getTranslation(language, 'ai_recognition')}
              </Text>
              
              <DetailRow
                label="Recognition"
                value={sessionAnalytics.ml.predictedChar}
              />
              <DetailRow
                label="Confidence"
                value={`${(sessionAnalytics.ml.confidence * 100).toFixed(1)}%`}
              />
              <DetailRow
                label="Accuracy"
                value={sessionAnalytics.ml.isCorrect ? '✅ Correct' : '❌ Incorrect'}
              />
              
              {/* Reversal Warning */}
              {sessionAnalytics.ml.reversalDetected && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>{getTranslation(language, 'reversal_detected')}</Text>
                    <Text style={styles.warningText}>
                      {sessionAnalytics.ml.reversalType === 'horizontal_flip' && getTranslation(language, 'reversal_backward')}
                      {sessionAnalytics.ml.reversalType === 'vertical_flip' && getTranslation(language, 'reversal_upside_down')}
                      {sessionAnalytics.ml.reversalType === 'rotation_180' && getTranslation(language, 'reversal_rotated')}
                    </Text>
                    {sessionAnalytics.ml.reversalConfidence && (
                      <Text style={styles.warningSubtext}>
                        Confidence: {(sessionAnalytics.ml.reversalConfidence * 100).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              {/* Top Predictions */}
              {sessionAnalytics.ml.topPredictions && sessionAnalytics.ml.topPredictions.length > 1 && (
                <View style={styles.topPredictionsContainer}>
                  <Text style={styles.topPredictionsTitle}>{getTranslation(language, 'top_predictions')}</Text>
                  {sessionAnalytics.ml.topPredictions.slice(0, 3).map((pred, idx) => (
                    <View key={idx} style={styles.predictionRow}>
                      <Text style={styles.predictionChar}>{idx + 1}. {pred.char}</Text>
                      <View style={styles.confidenceBar}>
                        <View 
                          style={[
                            styles.confidenceBarFill, 
                            { width: `${(pred.score || 0) * 100}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.predictionConfidence}>
                        {((pred.score || 0) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.resultsActions}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleExit}
            >
              <Text style={styles.startButtonText}>{getTranslation(language, 'trace_continue_btn')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRetry}
            >
              <Text style={styles.secondaryButtonText}>{getTranslation(language, 'trace_practice_again')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      
      {/* Intro Tour (Let's Learn) */}
      <FeatureTour 
        visible={introTourVisible}
        steps={[
            {
                title: `${getTranslation(language, 'tour_learning_letter_title')} ${letter} 🅰️`,
                description: `${getTranslation(language, 'tour_learning_letter_desc')} ${letter}.`,
                style: { top: '12%', alignSelf: 'center' }, // Moved very high to avoid letter
                arrowPosition: 'bottom', // Point down to the letter
                arrowOffset: 92,
            },
            {
                title: getTranslation(language, 'tour_hear_sound_title'),
                description: getTranslation(language, 'tour_hear_sound_desc_short'),
                style: { top: '57%', left: '57%' }, // To the right of the center speaker
                arrowPosition: 'left',
                arrowOffset: 25, 
            },
            {
                title: getTranslation(language, 'tour_watch_demo_title'),
                description: getTranslation(language, 'tour_watch_demo_desc'),
                style: { top: 70, right: 10 }, 
                arrowPosition: 'top', // Point UP to the eye button
                arrowOffset: 110, // Pushed further right to align with corner icon
            },
            {
                title: getTranslation(language, 'tour_start_writing_title'),
                description: getTranslation(language, 'tour_start_writing_desc'),
                style: { bottom: 150, alignSelf: 'center' }, // Kept top as it's safe
                arrowPosition: 'bottom',
                arrowOffset: 92,
            }
        ]}
        onComplete={() => setIntroTourVisible(false)} 
        onSkip={() => setIntroTourVisible(false)}
      />

      {/* Tracing Phase Tour */}
      <FeatureTour 
        visible={tracingTourVisible}
        steps={[
            {
                title: getTranslation(language, 'tour_hear_sound_title'),
                description: getTranslation(language, 'tour_hear_sound_desc_long'),
                style: { top: 140, right: 20 },
                arrowPosition: 'top',
                arrowOffset: 160, // Align with top-right eye icon
            },
            {
                title: getTranslation(language, 'tour_watch_tutorial_title'),
                description: getTranslation(language, 'tour_watch_tutorial_desc'),
                style: { top: 75, left: 45 },
                arrowPosition: 'top', 
                arrowOffset: 20, // Align with top-left speaker (if present there, checking header layout)
            },
            {
                title: getTranslation(language, 'tour_trace_here_title'),
                description: getTranslation(language, 'tour_trace_here_desc'),
                style: { top: '30%', alignSelf: 'center' },
                arrowPosition: 'bottom',
                arrowOffset: 92,
            },
            {
                title: getTranslation(language, 'tour_check_work_title'), 
                description: getTranslation(language, 'tour_check_work_desc'),
                style: { bottom: 100, alignSelf: 'center' },
                arrowPosition: 'bottom',
                arrowOffset: 92,
            }
        ]}
        onComplete={() => setTracingTourVisible(false)} 
        onSkip={() => setTracingTourVisible(false)}
      />
      
      <Modal
        visible={isDemoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDemoVisible(false)}
      >
          <View style={styles.demoModalOverlay}>
              <View style={styles.demoModalContent}>
                  <TouchableOpacity 
                    style={styles.closeDemoButton}
                    onPress={() => setIsDemoVisible(false)}
                  >
                      <Text style={styles.closeDemoText}>✕</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.demoTitle}>{getTranslation(language, 'watch_how_to_write')} '{letter}'</Text>
                  
                  <View style={styles.demoCanvasContainer}>
                      <TracingCanvas
                        idealPath={idealPath}
                        activeStrokeIndex={0} // Doesn't matter for autoplay
                        letterStrokes={letterPath.strokes}
                        showGuidelines={true}
                        showHand={true}
                        showStrokeHints={true}
                        autoPlay={true}
                        width={CANVAS_WIDTH * 0.8}
                        height={CANVAS_HEIGHT * 0.8}
                      />
                  </View>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
};

// Supporting components
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131F24', // Duolingo Dark Background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#131F24',
  },
  exitButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 24,
    color: '#52656d',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#37464F',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 8,
  },
  placeholder: {
    width: 40,
  },
  // Instructions
  instructionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  instructionTitle: {
    fontSize: 24,
    color: '#777',
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  mainLetterTitle: {
      fontSize: 120,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 32,
  },
  audioSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  instructionText: {
    fontSize: 18,
    color: '#52656d',
    fontWeight: 'bold',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  // Tracing
  tracingContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topSection: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tracePrompt: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
  },
  // New Instruction Styles
  instructionList: {
      width: '100%',
      paddingHorizontal: 32,
      marginVertical: 20,
      gap: 12,
  },
  instructionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  instructionIcon: {
      fontSize: 24,
  },
  soundButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    width: '100%',
    padding: 24,
    paddingBottom: 32,
  },
  // Buttons
  startButton: {
    backgroundColor: '#58CC02', // Duolingo Green
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#58CC02',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    borderBottomWidth: 4,
    borderBottomColor: '#46A302', // Darker green for 3D effect
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  primaryButton: {
    backgroundColor: '#58CC02',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#37464F',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#2196F3', // Duolingo Blue
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  disabledButton: {
    backgroundColor: '#37464F',
    borderBottomColor: '#252F35',
  },
  // Results
  resultsContainer: {
    flex: 1,
    padding: 24,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFC800', // Gold
    marginBottom: 24,
  },
  resultStatsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
  },
  statBox: {
      backgroundColor: '#131F24',
      borderWidth: 2,
      borderColor: '#37464F',
      borderRadius: 16,
      padding: 16,
      minWidth: 120,
      alignItems: 'center',
  },
  statLabel: {
      color: '#52656d',
      fontWeight: 'bold',
      fontSize: 12,
      marginBottom: 8,
  },
  targetLetterSmall: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 16,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#90A4AE', // Blue Grey
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
      fontSize: 24,
      fontWeight: 'bold',
  },
  detailedMetrics: {
    backgroundColor: '#131F24',
    borderWidth: 2,
    borderColor: '#37464F',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  reportSubtitle: {
      color: '#52656d',
      marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#37464F',
  },
  detailLabel: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultsActions: {
      marginBottom: 32,
  },
  // ML Analysis Styles
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFA500',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#000',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  topPredictionsContainer: {
    marginTop: 16,
  },
  topPredictionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionChar: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    width: 60,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#37464F',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#58CC02',
  },
  predictionConfidence: {
    fontSize: 14,
    color: '#999',
    width: 50,
    textAlign: 'right',
  },
  demoModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  demoModalContent: {
      width: '90%',
      height: '80%',
      backgroundColor: '#131F24',
      borderRadius: 24,
      padding: 20,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#37464F',
  },
  demoTitle: {
      fontSize: 24,
      color: '#fff',
      fontWeight: 'bold',
      marginBottom: 20,
  },
  closeDemoButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      backgroundColor: '#37464F',
      borderRadius: 20,
  },
  closeDemoText: {
      fontSize: 24,
      color: '#fff',
      fontWeight: 'bold',
  },
  demoCanvasContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  headerWatchButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#37464F',
      borderRadius: 20,
      marginLeft: 'auto',
      marginRight: 16,
  },
  headerWatchText: {
      fontSize: 20,
  },
  instructionButtonsRow: {
      flexDirection: 'row',
      gap: 16,
      width: '100%',
  },
  watchButton: {
      flex: 1,
      backgroundColor: '#37464F',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderBottomWidth: 4,
      borderBottomColor: '#252F35',
  },
  watchButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      letterSpacing: 1,
  },
});

export default TracingScreen;
