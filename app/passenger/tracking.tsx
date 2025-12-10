import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Coordinates, RideRequest } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Car, MapPin, Navigation, User } from 'lucide-react-native';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { interpolateCoordinates } from '@/lib/utils/maps';

export default function PassengerTrackingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const mapRef = useRef<MapView>(null);

  const rideQuery = useQuery({
    queryKey: ['activeRide', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('ride_requests')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('passenger_id', user.id)
        .in('status', ['pending', 'accepted', 'driver_arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as RideRequest;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!rideQuery.data?.driver_id) return;

    const channel = supabase
      .channel('driver-location')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
          filter: `driver_id=eq.${rideQuery.data.driver_id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newLocation: Coordinates = {
              latitude: parseFloat(payload.new.lat),
              longitude: parseFloat(payload.new.lng),
            };

            if (driverLocation) {
              const start = driverLocation;
              const end = newLocation;
              let step = 0;
              const steps = 20;
              const animationInterval = setInterval(() => {
                step++;
                const fraction = step / steps;
                const interpolated = interpolateCoordinates(start, end, fraction);
                setDriverLocation(interpolated);

                if (step >= steps) clearInterval(animationInterval);
              }, 50);
            } else {
              setDriverLocation(newLocation);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [rideQuery.data?.driver_id, driverLocation]);

  useEffect(() => {
    if (rideQuery.data?.status === 'completed') {
      router.replace('/passenger/rating' as any);
    }
  }, [rideQuery.data?.status, router]);

  if (rideQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Finding your ride...</Text>
      </View>
    );
  }

  if (!rideQuery.data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No active ride found</Text>
      </View>
    );
  }

  const pickupCoords: Coordinates = {
    latitude: rideQuery.data.pickup_lat,
    longitude: rideQuery.data.pickup_lng,
  };

  const destCoords: Coordinates = {
    latitude: rideQuery.data.dest_lat,
    longitude: rideQuery.data.dest_lng,
  };

  const handleCancelRide = async () => {
    try {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'cancelled' })
        .eq('id', rideQuery.data.id);

      if (error) throw error;
      router.replace('/passenger'); // back to main screen
    } catch (err) {
      console.error('Cancel ride error:', err);
      Alert.alert('Error', 'Failed to cancel the ride.');
    }
  };

  const handleEditPrice = async () => {
    try {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'cancelled' })
        .eq('id', rideQuery.data.id);

      if (error) throw error;
      router.back(); // back to main screen
    } catch (err) {
      console.error('Cancel ride error:', err);
      Alert.alert('Error', 'Failed to cancel the ride.');
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'web' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={{
          latitude: pickupCoords.latitude,
          longitude: pickupCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        <Marker coordinate={pickupCoords} title="Pickup" pinColor="#10b981">
          <View style={styles.pickupMarker}>
            <MapPin size={20} color="#fff" />
          </View>
        </Marker>

        <Marker coordinate={destCoords} title="Destination" pinColor="#ef4444">
          <View style={styles.destMarker}>
            <Navigation size={20} color="#fff" />
          </View>
        </Marker>

        {driverLocation && (
          <Marker coordinate={driverLocation} title="Driver">
            <View style={styles.carMarker}>
              <Car size={24} color="#fff" />
            </View>
          </Marker>
        )}

        <Polyline coordinates={[pickupCoords, destCoords]} strokeColor="#10b981" strokeWidth={3} />
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            {rideQuery.data.status === 'pending' && 'Looking for drivers...'}
            {rideQuery.data.status === 'accepted' && 'Driver is on the way'}
            {rideQuery.data.status === 'driver_arrived' && 'Driver has arrived'}
            {rideQuery.data.status === 'in_progress' && 'Trip in progress'}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.bottomContainer}>
        <View style={styles.infoCard}>
          {rideQuery.data.driver && (
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <User size={24} color="#fff" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{rideQuery.data.driver.user?.name || 'Driver'}</Text>
                <Text style={styles.driverCar}>
                  {rideQuery.data.driver.car_model} • {rideQuery.data.driver.plate}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>
                  ⭐ {rideQuery.data.driver.rating?.toFixed(1) || '5.0'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.tripDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                ${(rideQuery.data.passenger_price || rideQuery.data.suggested_price).toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>{rideQuery.data.distance.toFixed(1)} km</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#ef4444' }]} onPress={handleCancelRide}>
            <Text style={styles.actionButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fbbf24' }]} onPress={handleEditPrice}>
            <Text style={styles.actionButtonText}>Edit Price</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#6b7280' },
  errorText: { fontSize: 16, color: '#ef4444' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  statusCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusText: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  pickupMarker: {
    backgroundColor: '#10b981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  destMarker: {
    backgroundColor: '#ef4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  carMarker: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 12,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  driverCar: { fontSize: 14, color: '#6b7280' },
  ratingBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  tripDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
