// src/screens/ComingSoonScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import BackButton from '../../../components/BackButton';
import type { RouteProp } from '@react-navigation/native';
import { DT } from '../../../utils/DyslexiaTheme';

export default function ComingSoonScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ComingSoon'>>();
  const title = route.params?.title ?? 'Feature';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={DT.bg.skyBlue} />
      <SafeAreaView style={styles.safeArea}>
        <BackButton color={DT.accent.navy} />
        <View style={styles.center}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🚀</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>This feature is coming soon!</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>
                We are working hard to bring this dyslexia-friendly module to you. Stay tuned!
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: DT.bg.skyBlue 
  },
  safeArea: {
    flex: 1,
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: DT.surface.card,
    borderRadius: DT.radius.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    ...DT.shadow.medium,
    borderWidth: 1,
    borderColor: DT.surface.cardBorder,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: DT.typography.weightHeavy,
    color: DT.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'OpenDyslexic-Bold' : 'sans-serif-rounded',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: DT.typography.weightBold,
    color: DT.accent.navy,
    textAlign: 'center',
  },
  divider: {
    height: 4,
    width: 60,
    backgroundColor: DT.accent.sky,
    borderRadius: 2,
    marginVertical: 24,
  },
  description: {
    fontSize: 16,
    color: DT.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: DT.typography.weightMedium,
  },
});
