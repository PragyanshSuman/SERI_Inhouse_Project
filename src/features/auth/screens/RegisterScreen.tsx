import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../../../components/BackButton';
import { registerUser } from '../../../services/authApiService';
import { DT } from '../../../utils/DyslexiaTheme';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }).start();
  };

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Hold on!', 'Please enter a cool username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await registerUser(username, password);
      await login(data.access_token, username);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        Alert.alert('Network Error', 'Could not connect to the backend server. Check your Wi-Fi.');
      } else {
        Alert.alert('Registration Failed', error.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[DT.bg.lemon, DT.bg.cream, DT.bg.skyBlue]} style={StyleSheet.absoluteFillObject} />
      <BackButton color={DT.accent.rose} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.logoContainer}>
            <View style={styles.emojiCircle}>
                <Text style={styles.logoEmoji}>🚀</Text>
            </View>
            <Text style={styles.title}>Join the Fun!</Text>
            <Text style={styles.subtitle}>Create an account to start your adventure.</Text>
        </View>

        <View style={styles.glassForm}>
          <Text style={styles.label}>Pick a Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. StarReader"
            placeholderTextColor={DT.text.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Secret Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={DT.text.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 10 }}>
            <TouchableOpacity 
                style={[styles.btn, isLoading && styles.btnDisabled]} 
                onPress={handleRegister}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={1}
            >
                <LinearGradient colors={[DT.accent.rose, '#e11d48']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Start Playing 🎉</Text>}
                </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchTxt}>Already have an account? <Text style={styles.bold}>Login ✨</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, paddingTop: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  emojiCircle: { width: 100, height: 100, backgroundColor: '#FFF', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...DT.shadow.medium, borderWidth: 4, borderColor: DT.bg.cream },
  logoEmoji: { fontSize: 50 },
  title: { fontSize: 36, fontWeight: '900', color: DT.text.primary, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: DT.text.secondary, marginTop: 8, fontWeight: '600' },
  glassForm: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 28, padding: 28, shadowColor: DT.accent.rose, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: '#FFF' },
  label: { fontSize: 14, fontWeight: '800', color: DT.text.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16, padding: 18, fontSize: 18, color: DT.text.primary, marginBottom: 24, fontWeight: '700' },
  btn: { borderRadius: 16, overflow: 'hidden', ...DT.shadow.medium },
  btnGradient: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: 0.5 },
  switchBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 10 },
  switchTxt: { color: DT.text.secondary, fontSize: 15, fontWeight: '600' },
  bold: { fontWeight: '900', color: DT.accent.rose }
});
