import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';

interface ParentalGateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ParentalGateModal({ visible, onClose, onSuccess }: ParentalGateModalProps) {
  const { settings } = useSettings();
  const [pin, setPin] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorVisible(false);
    }
  }, [visible]);

  const handlePinChange = (val: string) => {
    // Only allow numbers
    const numericVal = val.replace(/[^0-9]/g, '');
    setPin(numericVal);
    setErrorVisible(false);

    if (numericVal.length === 4) {
      // Verify
      if (numericVal === settings.parentalPIN) {
        Keyboard.dismiss();
        onSuccess();
      } else {
        triggerShake();
        setErrorVisible(true);
        setPin(''); // Clear on fail
      }
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.backdrop} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
             <View style={styles.headerIconBox}>
                <Text style={styles.headerIcon}>🔐</Text>
             </View>
             <Text style={styles.headerTitle}>Parental Gate</Text>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.promptText}>
              Please enter your 4-digit Parent PIN to access these settings.
            </Text>

            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#CBD5E1"
              autoFocus={true}
            />

            {errorVisible && (
              <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
               <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFF',
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10
  },
  header: {
    padding: 24, alignItems: 'center', gap: 12
  },
  headerIconBox: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  body: { padding: 24, alignItems: 'center' },
  promptText: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  pinInput: {
    width: '100%', backgroundColor: '#F1F5F9', borderRadius: 16,
    fontSize: 28, fontWeight: '900', color: '#1E293B', textAlign: 'center',
    paddingVertical: 16, letterSpacing: 12, borderWidth: 2, borderColor: '#E2E8F0',
    marginBottom: 8
  },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  cancelBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 15 }
});
