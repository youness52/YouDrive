import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth');
      } else if (!user.role) {
        router.replace('/onboarding');
      } else if (user.role === 'passenger') {
        router.replace('/passenger');
      } else if (user.role === 'driver') {
        router.replace('/driver');
      }
    }
  }, [user, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
