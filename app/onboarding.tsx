import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Car, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);
  const { completeProfile } = useAuth();
  const router = useRouter();

  const handleComplete = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    try {
      await completeProfile.mutateAsync({ name, role: selectedRole });
      
      if (selectedRole === 'passenger') {
        router.replace('/passenger');
      } else {
        router.replace('/driver');
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>I want to be a:</Text>
              
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'passenger' && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole('passenger')}
                >
                  <Users
                    size={32}
                    color={selectedRole === 'passenger' ? '#10b981' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === 'passenger' && styles.roleButtonTextActive,
                    ]}
                  >
                    Passenger
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'driver' && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole('driver')}
                >
                  <Car
                    size={32}
                    color={selectedRole === 'driver' ? '#10b981' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === 'driver' && styles.roleButtonTextActive,
                    ]}
                  >
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                completeProfile.isPending && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={completeProfile.isPending}
            >
              {completeProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
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
    gap: 24,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#111827',
  },
  roleSection: {
    gap: 16,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  roleButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#10b981',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
