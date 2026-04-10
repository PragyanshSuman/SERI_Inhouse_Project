import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

import { loginUser } from '../../../services/authApiService';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Hold on!', 'Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await loginUser(username, password);
      await login(data.access_token, username);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        Alert.alert('Network Error', 'Could not connect to the backend server. Check your Wi-Fi.');
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#EEF2FF', '#C7D2FE']} style={StyleSheet.absoluteFillObject} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🧠</Text>
            <Text style={styles.title}>Unified Learning</Text>
            <Text style={styles.subtitle}>Welcome back! Ready to learn?</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. HeroStudent"
            placeholderTextColor="#94A3B8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity 
            style={[styles.btn, isLoading && styles.btnDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Play Now</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.switchTxt}>Don't have an account? <Text style={styles.bold}>Register</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoEmoji: { fontSize: 80, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748B', marginTop: 8 },
  form: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1E293B', marginBottom: 20, fontWeight: '600' },
  btn: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchTxt: { color: '#64748B', fontSize: 14 },
  bold: { fontWeight: 'bold', color: '#4F46E5' }
});
