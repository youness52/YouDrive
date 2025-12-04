import { useAuth } from '@/lib/contexts/AuthContext';
import { useRide } from '@/lib/contexts/RideContext';
import { supabase } from '@/lib/supabase';
import { Coordinates, Driver, RideRequest } from '@/lib/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Car, DollarSign, LogOut, Power, Star, MapPin, Navigation, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverHomeScreen() {
  const { user, signOut } = useAuth();
  const { incomingRequests, activeRide, acceptRide, rejectRide } = useRide();
  const router = useRouter();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);

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
      return data as Driver;
    },
    enabled: !!user,
  });

  const updateOnlineStatus = useMutation({
    mutationFn: async (online: boolean) => {
      if (!driverQuery.data?.id) throw new Error('No driver found');

      const { error } = await supabase
        .from('drivers')
        .update({ online_status: online })
        .eq('id', driverQuery.data.id);

      if (error) throw error;
      
      if (online && location) {
        await updateLocation(location);
      }
      
      await driverQuery.refetch();
    },
  });

  const updateLocation = async (coords: Coordinates) => {
    if (!driverQuery.data?.id) return;

    await supabase.from('locations').upsert({
      driver_id: driverQuery.data.id,
      lat: coords.latitude,
      lng: coords.longitude,
      heading: 0,
      speed: 0,
      updated_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coords: Coordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    if (driverQuery.data?.online_status) {
      (async () => {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            const coords: Coordinates = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setLocation(coords);
            updateLocation(coords);
          }
        );
      })();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [driverQuery.data?.online_status]);

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    try {
      await updateOnlineStatus.mutateAsync(value);
    } catch (error) {
      console.error('Toggle online error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  useEffect(() => {
    if (activeRide) {
      router.push('/driver/tracking' as any);
    }
  }, [activeRide, router]);

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const handleAcceptRide = async (rideId: string) => {
    try {
      await acceptRide.mutateAsync(rideId);
      setSelectedRequest(null);
      Alert.alert('Success', 'Ride accepted! Navigating to pickup location.');
    } catch (error) {
      console.error('Accept ride error:', error);
      Alert.alert('Error', 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      await rejectRide.mutateAsync(rideId);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Reject ride error:', error);
      Alert.alert('Error', 'Failed to reject ride');
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'web' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {location && driverQuery.data?.online_status && (
          <>
            <Marker
              coordinate={location}
              title="You"
              pinColor="#10b981"
            >
              <View style={styles.carMarker}>
                <Car size={24} color="#fff" />
              </View>
            </Marker>
            <Circle
              center={location}
              radius={3000}
              fillColor="rgba(16, 185, 129, 0.1)"
              strokeColor="rgba(16, 185, 129, 0.3)"
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  driverQuery.data?.online_status && styles.statusDotOnline,
                ]}
              />
              <Text style={styles.statusText}>
                {driverQuery.data?.online_status ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.bottomContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={20} color="#f59e0b" />
              <Text style={styles.statValue}>
                {driverQuery.data?.rating?.toFixed(1) || '5.0'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Car size={20} color="#10b981" />
              <Text style={styles.statValue}>
                {driverQuery.data?.total_trips || 0}
              </Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push('/driver/earnings' as any)}
            >
              <DollarSign size={20} color="#3b82f6" />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.onlineToggle}>
            <Power
              size={24}
              color={driverQuery.data?.online_status ? '#10b981' : '#6b7280'}
            />
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {driverQuery.data?.online_status ? "You're Online" : 'Go Online'}
              </Text>
              <Text style={styles.toggleSubtitle}>
                {driverQuery.data?.online_status
                  ? 'Available for ride requests'
                  : 'Start accepting rides'}
              </Text>
            </View>
            <Switch
              value={driverQuery.data?.online_status || false}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={driverQuery.data?.online_status ? '#10b981' : '#f3f4f6'}
            />
          </View>
        </View>
      </View>

      {incomingRequests.length > 0 && !selectedRequest && (
        <View style={styles.requestsContainer}>
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>
              {incomingRequests.length} New Request{incomingRequests.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={() => setSelectedRequest(incomingRequests[0])}>
              <Text style={styles.viewRequestText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedRequest && (
        <View style={styles.requestModal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Ride Request</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.requestDetails}>
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Passenger Offer</Text>
                <Text style={styles.priceValue}>
                  ${(selectedRequest.passenger_price || selectedRequest.suggested_price).toFixed(2)}
                </Text>
              </View>

              <View style={styles.tripInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Distance</Text>
                  <Text style={styles.infoValue}>{selectedRequest.distance.toFixed(1)} km</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Suggested</Text>
                  <Text style={styles.infoValue}>${selectedRequest.suggested_price.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.addressSection}>
                <View style={styles.addressRow}>
                  <MapPin size={16} color="#10b981" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedRequest.pickup_address}
                  </Text>
                </View>
                <View style={styles.addressRow}>
                  <Navigation size={16} color="#ef4444" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedRequest.dest_address}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={() => handleRejectRide(selectedRequest.id)}
                disabled={rejectRide.isPending}
              >
                {rejectRide.isPending ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <Text style={styles.rejectButtonText}>Decline</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={() => handleAcceptRide(selectedRequest.id)}
                disabled={acceptRide.isPending}
              >
                {acceptRide.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptButtonText}>Accept Ride</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b7280',
  },
  statusDotOnline: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    padding: 8,
  },
  carMarker: {
    backgroundColor: '#10b981',
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
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  requestsContainer: {
    position: 'absolute' as const,
    top: 120,
    left: 20,
    right: 20,
  },
  requestsBadge: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  requestsBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  viewRequestText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  requestModal: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  requestDetails: {
    gap: 20,
  },
  priceSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#10b981',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  infoRow: {
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  addressSection: {
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
