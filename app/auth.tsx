import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Phone, Lock } from 'lucide-react-native';
import { useState } from 'react';
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
  const { signInWithOTP, verifyOTP } = useAuth();
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      await signInWithOTP.mutateAsync(phone);
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your phone');
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    try {
      await verifyOTP.mutateAsync({ phone, token: otp });
      router.replace('/onboarding');
    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to RideShare</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Enter your phone number to get started'
                : 'Enter the verification code'}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <View style={styles.inputContainer}>
                  <Phone size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+1234567890"
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    signInWithOTP.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleSendOTP}
                  disabled={signInWithOTP.isPending}
                >
                  {signInWithOTP.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#6b7280" style={styles.inputIcon} />
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

                <TouchableOpacity
                  style={[
                    styles.button,
                    verifyOTP.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={verifyOTP.isPending}
                >
                  {verifyOTP.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify OTP</Text>
                  )}
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
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 16,
  },
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
