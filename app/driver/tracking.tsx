import { useAuth } from '@/lib/contexts/AuthContext';
import { useRide } from '@/lib/contexts/RideContext';
import { supabase } from '@/lib/supabase';
import { Coordinates } from '@/lib/types';
import { interpolateCoordinates } from '@/lib/utils/maps';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Car, MapPin, Navigation, User, Check, Phone } from 'lucide-react-native';
import { useEffect, useState, useRef } from 'react';
import * as Linking from 'expo-linking';

import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverTrackingScreen() {
  const { user } = useAuth();
  const { activeRide, updateRideStatus } = useRide();
  const router = useRouter();
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [passengerLocation, setPassengerLocation] = useState<Coordinates | null>(null);
  const mapRef = useRef<MapView>(null);

  const driverQuery = useQuery({
    queryKey: ['driver', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    if (activeRide) {
      (async () => {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          async (loc) => {
            const coords: Coordinates = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setDriverLocation(coords);

            if (driverQuery.data?.id) {
              await supabase.from('locations').upsert({
                driver_id: driverQuery.data.id,
                lat: coords.latitude,
                lng: coords.longitude,
                heading: loc.coords.heading || 0,
                speed: loc.coords.speed || 0,
                updated_at: new Date().toISOString(),
              });
            }
          }
        );
      })();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [activeRide, driverQuery.data?.id]);

  useEffect(() => {
    if (!activeRide?.passenger_id) return;

    const channel = supabase
      .channel('passenger-location')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
        },
        (payload: any) => {
          if (payload.new) {
            const newLocation: Coordinates = {
              latitude: parseFloat(payload.new.lat),
              longitude: parseFloat(payload.new.lng),
            };

            if (passengerLocation) {
              const start = passengerLocation;
              const end = newLocation;

              let step = 0;
              const steps = 20;
              const animationInterval = setInterval(() => {
                step++;
                const fraction = step / steps;
                const interpolated = interpolateCoordinates(start, end, fraction);
                setPassengerLocation(interpolated);

                if (step >= steps) {
                  clearInterval(animationInterval);
                }
              }, 50);
            } else {
              setPassengerLocation(newLocation);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.passenger_id, passengerLocation]);

  const handleUpdateStatus = async (status: string) => {
    if (!activeRide) return;

    try {
      await updateRideStatus.mutateAsync({ rideId: activeRide.id, status });

      if (status === 'completed') {
        Alert.alert('Trip Completed', 'Great job! Earnings have been added.', [
          { text: 'OK', onPress: () => router.replace('/driver') },
        ]);
      }
    } catch (error) {
      console.error('Update status error:', error);
      Alert.alert('Error', 'Failed to update ride status');
    }
  };

  if (!activeRide) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No active ride found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/driver')}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickupCoords: Coordinates = {
    latitude: activeRide.pickup_lat,
    longitude: activeRide.pickup_lng,
  };

  const destCoords: Coordinates = {
    latitude: activeRide.dest_lat,
    longitude: activeRide.dest_lng,
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
          <Marker coordinate={driverLocation} title="You">
            <View style={styles.carMarker}>
              <Car size={24} color="#fff" />
            </View>
          </Marker>
        )}

        <Polyline
          coordinates={[pickupCoords, destCoords]}
          strokeColor="#10b981"
          strokeWidth={3}
        />
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            {activeRide.status === 'accepted' && 'Drive to pickup location'}
            {activeRide.status === 'driver_arrived' && 'Waiting for passenger'}
            {activeRide.status === 'in_progress' && 'Trip in progress'}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.bottomContainer}>
        <View style={styles.infoCard}>
          <View style={styles.passengerInfo}>
            <View style={styles.passengerAvatar}>
              <User size={24} color="#fff" />
            </View>
            <View style={styles.passengerDetails}>
              <Text style={styles.passengerName}>
                {activeRide.passenger?.name || 'Passenger'}
              </Text>
              <Text style={styles.tripDetails}>
                {activeRide.distance.toFixed(1)} km • DH
                {(activeRide.passenger_price || activeRide.suggested_price).toFixed(2)}
              </Text>
            </View>
            {activeRide.status !== 'pending' && (
              <TouchableOpacity style={styles.phoneButton}>
                <Phone
                  size={20}
                  color="#10b981"
                  onPress={() => Linking.openURL(`tel:${activeRide.passenger?.phone}`)}
                />



              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.addressesContainer}>
            <View style={styles.addressRow}>
              <MapPin size={16} color="#10b981" />
              <Text style={styles.addressText} numberOfLines={1}>
                {activeRide.pickup_address}
              </Text>
            </View>
            <View style={styles.addressRow}>
              <Navigation size={16} color="#ef4444" />
              <Text style={styles.addressText} numberOfLines={1}>
                {activeRide.dest_address}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionsContainer}>
            {activeRide.status === 'accepted' && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleUpdateStatus('driver_arrived')}
                disabled={updateRideStatus.isPending}
              >
                {updateRideStatus.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Arrived at Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {activeRide.status === 'driver_arrived' && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleUpdateStatus('in_progress')}
                disabled={updateRideStatus.isPending}
              >
                {updateRideStatus.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Car size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Start Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {activeRide.status === 'in_progress' && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleUpdateStatus('completed')}
                disabled={updateRideStatus.isPending}
              >
                {updateRideStatus.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" />
                    <Text style={styles.completeButtonText}>Complete Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
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
  statusText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    textAlign: 'center',
  },
  pickupMarker: {
    backgroundColor: '#10b981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  tripDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  phoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  addressesContainer: {
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  completeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

