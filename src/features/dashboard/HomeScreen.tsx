import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unified Learning</Text>
        <Text style={styles.subtitle}>Select a module to start learning</Text>
      </View>

      <ScrollView contentContainerStyle={styles.menu}>
        <MenuCard
          title="Letter Tracing"
          description="Practice writing letters A-Z"
          color="#4F46E5"
          onPress={() => navigation.navigate('LetterTracing')} 
          disabled={false} 
        />
        <MenuCard
          title="Phonics Check"
          description="Test your pronunciation"
          color="#10B981"
          onPress={() => navigation.navigate('PhonicCheck')}
          disabled={false}
        />
        <MenuCard
          title="Phonics & Phonemes"
          description="Listen and learn sounds"
          color="#D97706"
          onPress={() => navigation.navigate('PhonicsPhonemes')}
          disabled={false}
        />
        <MenuCard
          title="Original App"
          description="Assessment & Writing Test"
          color="#2b5876"
          onPress={() => navigation.navigate('OriginalApp')}
          disabled={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({
  title,
  description,
  color,
  onPress,
  disabled = false,
}: {
  title: string;
  description: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View>
        <Text style={[styles.cardTitle, { color }]}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      {disabled && <Text style={styles.soonBadge}>Coming Soon</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  menu: {
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  disabled: {
    opacity: 0.7,
    backgroundColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748B',
  },
  soonBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
