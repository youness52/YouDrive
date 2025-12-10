import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const { user, signInWithOTP, verifyOTP } = useAuth();
  const router = useRouter();

  // ------------------------------------
  // Redirect if already logged in & profile complete
  // ------------------------------------
  useEffect(() => {
    if (!user) return;

    if (user.role && user.name) {
      router.replace(user.role === 'passenger' ? '/passenger' : '/driver');
    } else {
      router.replace('/onboarding');
    }
  }, [user]);

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      const normalized = phone.trim();

      // Check if phone exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalized)
        .maybeSingle();

      if (existingUser) {
        // User exists -> skip OTP, just log in
        const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
        if (error) throw error;
        // Will trigger onAuthStateChange in AuthContext -> auto redirect
      } else {
        // New user -> send OTP
        await signInWithOTP.mutateAsync(normalized);
        setStep('otp');
        Alert.alert('Verification Required', 'Enter the code sent to your phone.');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    try {
      await verifyOTP.mutateAsync({ phone: phone.trim(), token: otp.trim() });
      // Success -> onboarding handled by AuthContext's user state
    } catch (err) {
      console.error('Verify OTP error:', err);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to RideShare</Text>
            <Text style={styles.subtitle}>
              {step === 'phone' ? 'Enter your phone number to get started' : 'Enter the verification code'}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <View style={styles.inputContainer}>
                  <Feather name="phone" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+212612345678"
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
                  <Text style={styles.buttonText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Feather name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9ca3af"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP}>
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                >
                  <Text style={styles.backButtonText}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 48 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { padding: 12, alignItems: 'center' },
  backButtonText: { color: '#10b981', fontSize: 14, fontWeight: '500' },
});
