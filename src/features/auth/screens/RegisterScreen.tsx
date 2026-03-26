import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

import { registerUser } from '../../../services/authApiService';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Hold on!', 'Please enter a cool username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await registerUser(username, password);
      await login(data.access_token);
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
      <LinearGradient colors={['#FDF2F8', '#FBCFE8']} style={StyleSheet.absoluteFillObject} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚀</Text>
            <Text style={styles.title}>Join the Fun!</Text>
            <Text style={styles.subtitle}>Create an account to start your adventure.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Pick a Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. StarReader"
            placeholderTextColor="#94A3B8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Secret Password</Text>
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
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Start Playing</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchTxt}>Already have an account? <Text style={styles.bold}>Login</Text></Text>
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
  btn: { backgroundColor: '#DB2777', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchTxt: { color: '#64748B', fontSize: 14 },
  bold: { fontWeight: 'bold', color: '#DB2777' }
});
