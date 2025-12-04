import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, TrendingUp } from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverEarningsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <DollarSign size={32} color="#10b981" />
              <Text style={styles.summaryTitle}>Total Earnings</Text>
            </View>
            <Text style={styles.summaryAmount}>$0.00</Text>
            <Text style={styles.summarySubtitle}>0 trips completed</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <DollarSign size={20} color="#3b82f6" />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>

            <View style={styles.statCard}>
              <DollarSign size={20} color="#8b5cf6" />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>

            <View style={styles.statCard}>
              <TrendingUp size={20} color="#10b981" />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>

            <View style={styles.statCard}>
              <DollarSign size={20} color="#f59e0b" />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySubtext}>
                Start driving to see your earnings here
              </Text>
            </View>
          </View>
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  summaryAmount: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#111827',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
