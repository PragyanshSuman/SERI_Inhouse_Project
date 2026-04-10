import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { ALPHABET, LETTER_PATHS } from '../constants/LetterPaths';
import ProgressIndicator from '../../letter-tracing/components/tracing/ProgressIndicator';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import EmotionTracker from '../../../components/EmotionTracker';
import { useSettings } from '../../../context/SettingsContext';
import InfoButton from '../../../components/InfoButton';
import BackButton from '../../../components/BackButton';
import { DT } from '../../../utils/DyslexiaTheme';

interface LetterItemProps {
  letter: string;
  onPress: (letter: string) => void;
  mastered: boolean;
  problematic: boolean;
  sessionCount: number;
  averageAccuracy?: number;
}

const LetterItem: React.FC<LetterItemProps> = ({
  letter,
  onPress,
  mastered,
  problematic,
  sessionCount,
  averageAccuracy,
}) => {
  const metadata = LETTER_PATHS[letter];
  
  const getStatusColor = () => {
    if (mastered) return DT.text.success;
    if (problematic) return DT.text.error;
    if (sessionCount > 0) return DT.accent.amber;
    return DT.surface.cardBorder;
  };

  return (
    <TouchableOpacity
      style={[
        styles.letterItem,
        { borderColor: getStatusColor() },
      ]}
      onPress={() => onPress(letter)}
      activeOpacity={0.7}
    >
      <View style={styles.letterContent}>
        <Text style={styles.letterText}>{letter}</Text>
        
        {sessionCount > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.sessionCount}>{sessionCount}</Text>
            {averageAccuracy !== undefined && (
              <ProgressIndicator 
                progress={averageAccuracy} 
                size={24} 
                color={averageAccuracy >= 80 ? DT.text.success : DT.accent.amber} 
              />
            )}
          </View>
        )}

        {mastered && (
          <View style={[styles.badge, { backgroundColor: DT.text.success }]}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        )}

        {problematic && (
          <View style={[styles.badge, { backgroundColor: DT.text.error }]}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const LetterSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'learning' | 'mastered'>('all');
  const [tourVisible, setTourVisible] = useState(false);
  
  // Mock summary data for consistent UI
  const [summary] = useState<any>({
    masteredLetters: [],
    problematicLetters: [],
    sessionHistory: [],
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleLetterPress = (letter: string) => {
    navigation.navigate('Tracing', { letter, userId: 'user_001' });
  };

  const getLetterStats = (letter: string) => {
    const letterSessions = summary.sessionHistory.filter((s: any) => s.letter === letter);
    const sessionCount = letterSessions.length;
    const averageAccuracy = letterSessions.length > 0
      ? letterSessions.reduce((sum: number, s: any) => sum + s.spatial_accuracy_deviation.accuracy_score, 0) / letterSessions.length
      : 0;

    return { sessionCount, averageAccuracy };
  };

  const getFilteredLetters = () => {
    let filtered = [...ALPHABET];

    if (searchQuery) {
      filtered = filtered.filter(letter =>
        letter.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(letter => {
        const metadata = LETTER_PATHS[letter];
        return metadata.difficulty === filterDifficulty;
      });
    }

    return filtered;
  };

  const renderLetterItem = ({ item }: { item: string }) => {
    const { sessionCount, averageAccuracy } = getLetterStats(item);
    const mastered = summary?.masteredLetters.includes(item) || false;
    const problematic = summary?.problematicLetters.includes(item) || false;

    return (
      <LetterItem
        letter={item}
        onPress={handleLetterPress}
        mastered={mastered}
        problematic={problematic}
        sessionCount={sessionCount}
        averageAccuracy={averageAccuracy}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Letter Mastery 🏫</Text>
      <Text style={styles.subtitle}>Select a letter to begin practice</Text>
      
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search letters..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={DT.text.muted}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DT.accent.navy} />
      </SafeAreaView>
    );
  }

  const filteredLetters = getFilteredLetters();

  return (
    <View style={styles.container}>
      <EmotionTracker moduleName="Letter Mastery" isActive={!tourVisible} />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={DT.bg.cream} />
        <View style={styles.topNav}>
          <BackButton onPress={() => navigation.goBack()} color={DT.accent.navy} />
          <InfoButton onPress={() => setTourVisible(true)} color={DT.accent.navy} />
        </View>

        <FlatList
          data={filteredLetters}
          renderItem={renderLetterItem}
          keyExtractor={item => item}
          numColumns={Platform.OS === 'ios' ? 4 : 4}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No letters found</Text>
            </View>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.navigate('ProgressDashboard')}
          >
            <Text style={styles.footerButtonText}>View Progress Dashboard</Text>
          </TouchableOpacity>
        </View>

        <FeatureTour
          visible={tourVisible}
          steps={[
              {
                  title: "Letter Menu 🔠",
                  description: "Tap any letter to start tracing. Check your progress indicators!",
                  position: 'center',
              }
          ]}
          onComplete={() => setTourVisible(false)}
          onSkip={() => setTourVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DT.bg.cream,
  },
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DT.bg.cream,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: DT.text.secondary,
    fontWeight: DT.typography.weightMedium,
    marginBottom: 24,
    textAlign: 'center',
  },
  searchBar: {
    width: '100%',
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...DT.shadow.soft,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  searchInput: {
    fontSize: 16,
    color: DT.text.primary,
    fontWeight: DT.typography.weightMedium,
  },
  letterItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 8,
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.lg,
    ...DT.shadow.soft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  letterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 48,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    textAlign: 'center',
  },
  statsContainer: {
    position: 'absolute',
    bottom: -15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionCount: {
    fontSize: 12,
    fontWeight: DT.typography.weightBold,
    color: DT.text.muted,
  },
  badge: {
    position: 'absolute',
    top: -35,
    right: -35,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: DT.text.muted,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopWidth: 1,
    borderTopColor: DT.surface.divider,
  },
  footerButton: {
    backgroundColor: DT.accent.navy,
    borderRadius: DT.radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...DT.shadow.medium,
  },
  footerButtonText: {
    color: DT.text.onDark,
    fontSize: 17,
    fontWeight: DT.typography.weightHeavy,
    letterSpacing: DT.typography.letterSpacingUI,
  },
});

export default LetterSelectionScreen;
