import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { DT } from '../../utils/DyslexiaTheme';
import BackButton from '../../components/BackButton';
import EmotionTracker from '../../components/EmotionTracker';

type ModeSelectionRouteProp = RouteProp<RootStackParamList, 'ModeSelection'>;

export default function ModeSelectionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ModeSelectionRouteProp>();
  const { toolType } = route.params;

  const title = toolType === 'magic_words' ? 'Magic Word Studio' : 'Practice Speaking';
  const subtitle = 'Choose how you want to learn today!';

  const handleSelectMode = (mode: 'custom' | 'adaptive') => {
      if (toolType === 'magic_words') {
          navigation.navigate('PhonicsPhonemes', { mode });
      } else if (toolType === 'pronunciation') {
          navigation.navigate('PhonicCheckStudio', { mode });
      }
  };

  return (
    <View style={styles.bg}>
      <EmotionTracker moduleName="Mode Selection" isActive={true} />
      <SafeAreaView style={styles.container}>
        <BackButton onPress={() => navigation.goBack()} color={DT.text.primary} />
        
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.content}>
            <TouchableOpacity 
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleSelectMode('custom')}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.cardGradient}
                >
                    <View style={[styles.iconWrapper, { backgroundColor: DT.accent.sky + '20' }]}>
                        <Text style={styles.icon}>✍️</Text>
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>Custom Words</Text>
                        <Text style={styles.cardSubtitle}>Type your own words to practice.</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleSelectMode('adaptive')}
            >
                <LinearGradient
                    colors={[DT.accent.navy, '#1E1B4B']}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                        <Text style={styles.icon}>🚀</Text>
                    </View>
                    <View style={styles.cardText}>
                        <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Adaptive Journey</Text>
                        <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                            Automatically learn words that match your level.
                        </Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: DT.bg.cream,
  },
  container: {
    flex: 1,
  },
  header: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 30,
      alignItems: 'center',
  },
  title: {
      fontSize: 28,
      fontWeight: DT.typography.weightHeavy,
      color: DT.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
      textAlign: 'center',
      marginBottom: 8,
  },
  subtitle: {
      fontSize: 16,
      color: DT.text.secondary,
      textAlign: 'center',
      fontWeight: DT.typography.weightMedium,
  },
  content: {
      flex: 1,
      paddingHorizontal: 24,
      gap: 20,
      justifyContent: 'center',
      paddingBottom: 60,
  },
  card: {
      borderRadius: DT.radius.xl,
      ...DT.shadow.medium,
      overflow: 'hidden',
  },
  cardGradient: {
      padding: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
  },
  iconWrapper: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
  },
  icon: {
      fontSize: 28,
  },
  cardText: {
      flex: 1,
  },
  cardTitle: {
      fontSize: 22,
      fontWeight: DT.typography.weightHeavy,
      color: DT.text.primary,
      marginBottom: 4,
  },
  cardSubtitle: {
      fontSize: 15,
      color: DT.text.secondary,
      lineHeight: 22,
  }
});
