import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

export default function PassengerRatingScreen() {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const submitRating = useMutation({
    mutationFn: async () => {
      
      return { success: true };
    },
    onSuccess: () => {
      Alert.alert('Thank you!', 'Your rating has been submitted', [
        { text: 'OK', onPress: () => router.replace('/passenger') },
      ]);
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Rate Your Trip</Text>
          <Text style={styles.subtitle}>How was your ride?</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Star
                  size={48}
                  color={star <= rating ? '#f59e0b' : '#d1d5db'}
                  fill={star <= rating ? '#f59e0b' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment (optional)"
            placeholderTextColor="#9ca3af"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, submitRating.isPending && styles.buttonDisabled]}
            onPress={() => submitRating.mutate()}
            disabled={submitRating.isPending}
          >
            {submitRating.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/passenger')}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
