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
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DriverHomeScreen() {
  const { user, signOut } = useAuth();
  const { incomingRequests, activeRide, acceptRide, rejectRide } = useRide();
  const router = useRouter();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalIndex, setModalIndex] = useState(0); // current slide index

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
      if (online && location) await updateLocation(location);
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
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    if (driverQuery.data?.online_status) {
      (async () => {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setLocation(coords);
            updateLocation(coords);
          }
        );
      })();
    }
    return () => subscription?.remove();
  }, [driverQuery.data?.online_status]);

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      router.replace('/auth');
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    try {
      await updateOnlineStatus.mutateAsync(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      await acceptRide.mutateAsync(rideId);
      Alert.alert('Ride accepted', 'Navigating to pickup location');
      setShowModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      await rejectRide.mutateAsync(rideId);
      if (incomingRequests.length <= 1) setShowModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject ride');
    }
  };

  useEffect(() => {
    if (activeRide) router.push('/driver/tracking' as any);
  }, [activeRide]);

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

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
      >
        {location && driverQuery.data?.online_status && (
          <>
            <Marker coordinate={location} title="You" pinColor="#10b981">
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

      {/* Header */}
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

      {/* Bottom stats */}
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

      {/* Incoming requests badge */}
      {incomingRequests && incomingRequests.length > 0 && !showModal && (
        <View style={styles.requestsContainer}>
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>
              {incomingRequests.length} New Request{incomingRequests.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Text style={styles.viewRequestText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal */}
      {showModal && (
        <View style={styles.requestModal}>
          <ScrollView
            horizontal
            pagingEnabled
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setModalIndex(index);
            }}
            showsHorizontalScrollIndicator={false}
          >
            {incomingRequests.map((req) => (
              <View key={req.id} style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Ride Request</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <MapView
                  style={{ height: 160, borderRadius: 16 }}
                  provider={Platform.OS === 'web' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: req.pickup_lat,
                    longitude: req.pickup_lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: req.pickup_lat, longitude: req.pickup_lng }}>
                    <View style={styles.pickupMarker}>
                      <MapPin size={20} color="#fff" />
                    </View>
                  </Marker>
                  <Marker coordinate={{ latitude: req.dest_lat, longitude: req.dest_lng }}>
                    <View style={styles.destMarker}>
                      <Navigation size={20} color="#fff" />
                    </View>
                  </Marker>
                </MapView>

                <View style={styles.tripInfo}>
                  <Text>Distance: {req.distance.toFixed(1)} km</Text>
                  <Text>Offer: ${(req.passenger_price || req.suggested_price).toFixed(2)}</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={() => handleRejectRide(req.id)}
                  >
                    <Text style={styles.rejectButtonText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.acceptButton]}
                    onPress={() => handleAcceptRide(req.id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination dots */}
          <View style={styles.pagination}>
            {incomingRequests.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, modalIndex === idx && styles.activeDot]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#6b7280' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  userInfo: {},
  greeting: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6b7280' },
  statusDotOnline: { backgroundColor: '#10b981' },
  statusText: { fontSize: 14, color: '#6b7280' },
  logoutButton: { padding: 8 },
  carMarker: { backgroundColor: '#10b981', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  statsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statDivider: { width: 1, backgroundColor: '#e5e7eb' },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  toggleSubtitle: { fontSize: 13, color: '#6b7280' },
  requestsContainer: { position: 'absolute', top: 120, left: 20, right: 20 },
  requestsBadge: { backgroundColor: '#10b981', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestsBadgeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  viewRequestText: { color: '#fff', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  requestModal: { position: 'absolute', top: 120, left: 10, right: 10 },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, width: width - 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  tripInfo: { padding: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rejectButton: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#ef4444' },
  rejectButtonText: { color: '#ef4444', fontWeight: '600' },
  acceptButton: { backgroundColor: '#10b981' },
  acceptButtonText: { color: '#fff', fontWeight: '600' },
  pickupMarker: { backgroundColor: '#10b981', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  destMarker: { backgroundColor: '#ef4444', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  activeDot: { backgroundColor: '#10b981' },
});
