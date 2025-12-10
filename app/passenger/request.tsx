import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Coordinates } from '@/lib/types';
import { calculateDistance, calculateETA, calculatePrice } from '@/lib/utils/maps';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, DollarSign, MapPin, Navigation } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PassengerRequestScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [pickupLat] = useState(params.pickupLat ? String(params.pickupLat) : '37.7749');
  const [pickupLng] = useState(params.pickupLng ? String(params.pickupLng) : '-122.4194');
  const [pickupAddress] = useState(params.pickupAddress ? String(params.pickupAddress) : 'Selected Location');
  const [destLat] = useState(params.destLat ? String(params.destLat) : '37.7749');
  const [destLng] = useState(params.pickupLng ? String(params.destLng) : '-122.4194');
  const [destAddress] = useState(params.destAddress ? String(params.destAddress) : 'Destination');
  const [customPrice, setCustomPrice] = useState('');

  const pickup: Coordinates = {
    latitude: parseFloat(pickupLat),
    longitude: parseFloat(pickupLng),
  };

  const destination: Coordinates = {
    latitude: parseFloat(destLat),
    longitude: parseFloat(destLng),
  };

  const distance = calculateDistance(pickup, destination);
  const suggestedPrice = calculatePrice(distance);
  const eta = calculateETA(distance);

  const onlineDriversQuery = useQuery({
    queryKey: ['onlineDrivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, user:users(*)')
        .eq('online_status', true);

      if (error) throw error;
      return data;
    },
  });

  const createRideRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user found');

      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          passenger_id: user.id,
          pickup_lat: pickup.latitude,
          pickup_lng: pickup.longitude,
          pickup_address: pickupAddress,
          dest_lat: destination.latitude,
          dest_lng: destination.longitude,
          dest_address: destAddress,
          distance,
          suggested_price: suggestedPrice,
          passenger_price: customPrice ? parseFloat(customPrice) : null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Ride request sent to nearby drivers!', [
        { text: 'OK', onPress: () => router.push('/passenger/tracking' as any) },
      ]);
    },
    onError: (error) => {
      console.error('Create ride request error:', error);
      Alert.alert('Error', 'Failed to create ride request');
    },
  });

  const handleCreateRequest = () => {
    createRideRequest.mutate();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Ride</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            
            <View style={styles.card}>
              <View style={styles.locationRow}>
                <MapPin size={20} color="#10b981" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationAddress}>{pickupAddress}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locationRow}>
                <Navigation size={20} color="#ef4444" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Destination</Text>
                  <Text style={styles.locationAddress}>{destAddress}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Info</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Est. Time</Text>
                <Text style={styles.infoValue}>{Math.ceil(eta)} min</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Suggested Price</Text>
                <Text style={styles.infoPriceValue}>DH{suggestedPrice.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Offer (InDrive Style)</Text>
            <Text style={styles.sectionSubtitle}>
              Set your price and drivers will accept or negotiate
            </Text>
            
            <View style={styles.priceInputContainer}>
              <DollarSign size={24} color="#10b981" />
              <TextInput
                style={styles.priceInput}
                placeholder={suggestedPrice.toFixed(2)}
                placeholderTextColor="#9ca3af"
                value={customPrice}
                onChangeText={setCustomPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Drivers</Text>
            {onlineDriversQuery.isLoading ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <Text style={styles.driversCount}>
                {onlineDriversQuery.data?.length || 0} drivers online nearby
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.requestButton, createRideRequest.isPending && styles.buttonDisabled]}
            onPress={handleCreateRequest}
            disabled={createRideRequest.isPending}
          >
            {createRideRequest.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.requestButtonText}>Send Ride Request</Text>
            )}
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
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
    gap: 4,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  locationAddress: {
    fontSize: 16,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  infoPriceValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#10b981',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    paddingHorizontal: 16,
    height: 56,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#111827',
    marginLeft: 8,
  },
  driversCount: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  requestButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
