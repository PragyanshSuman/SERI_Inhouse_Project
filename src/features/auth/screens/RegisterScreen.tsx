import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
      <LinearGradient colors={DT.gradient.cream} style={StyleSheet.absoluteFillObject} />
      <BackButton color={DT.accent.rose} />
      
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
  title: { fontSize: 32, fontWeight: DT.typography.weightHeavy, color: DT.text.primary, textAlign: 'center', letterSpacing: DT.typography.letterSpacingUI },
  subtitle: { fontSize: 16, color: DT.text.secondary, marginTop: 8, lineHeight: DT.typography.lineHeightBody },
  form: { backgroundColor: DT.surface.card, borderRadius: DT.radius.xl, padding: 24, ...DT.shadow.medium },
  label: { fontSize: 14, fontWeight: DT.typography.weightBold, color: DT.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: DT.surface.input, borderWidth: 2, borderColor: DT.surface.inputBorder, borderRadius: DT.radius.md, padding: 16, fontSize: 16, color: DT.text.primary, marginBottom: 20, fontWeight: DT.typography.weightMedium, lineHeight: DT.typography.lineHeightBody },
  btn: { backgroundColor: DT.accent.rose, borderRadius: DT.radius.md, padding: 18, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: DT.text.muted },
  btnText: { color: DT.text.onDark, fontSize: 18, fontWeight: 'bold', letterSpacing: DT.typography.letterSpacingUI },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchTxt: { color: DT.text.secondary, fontSize: 14, lineHeight: DT.typography.lineHeightBody },
  bold: { fontWeight: 'bold', color: DT.accent.rose }
});
