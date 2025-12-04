import { useAuth } from '@/lib/contexts/AuthContext';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { LogOut, MapPin, Navigation, Search, Target } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coordinates } from '@/lib/types';

export default function PassengerHomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickupLocation, setPickupLocation] = useState<Coordinates | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [selectingPickup, setSelectingPickup] = useState(false);

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
      setPickupLocation(coords);
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRequestRide = () => {
    if (!pickupLocation) {
      Alert.alert('Error', 'Please select pickup location on map');
      return;
    }
    if (!destAddress.trim()) {
      Alert.alert('Error', 'Please enter destination address');
      return;
    }
    
    router.push({
      pathname: '/passenger/request' as any,
      params: {
        pickupLat: pickupLocation.latitude,
        pickupLng: pickupLocation.longitude,
        pickupAddress: pickupAddress || 'Selected Location',
        destAddress,
      },
    });
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (selectingPickup) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setPickupLocation({ latitude, longitude });
      setPickupAddress(`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setSelectingPickup(false);
    }
  };

  const handleSelectPickupOnMap = () => {
    setSelectingPickup(true);
    Alert.alert('Select Pickup', 'Tap anywhere on the map to set pickup location');
  };

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
        showsMyLocationButton
        onPress={handleMapPress}
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup Location"
            pinColor={selectingPickup ? "#f59e0b" : "#10b981"}
          >
            <View style={[styles.pickupMarker, selectingPickup && styles.pickupMarkerActive]}>
              <MapPin size={24} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.subtitle}>Where would you like to go?</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.searchContainer}>
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <MapPin size={20} color="#10b981" />
            <View style={styles.pickupInputContainer}>
              <Text style={styles.pickupText} numberOfLines={1}>
                {pickupAddress || 'Tap map to select pickup'}
              </Text>
              <TouchableOpacity
                style={styles.selectMapButton}
                onPress={handleSelectPickupOnMap}
              >
                <Target size={16} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.searchRow}>
            <Navigation size={20} color="#ef4444" />
            <TextInput
              style={styles.searchInput}
              placeholder="Where to?"
              placeholderTextColor="#9ca3af"
              value={destAddress}
              onChangeText={setDestAddress}
            />
          </View>

          <TouchableOpacity
            style={styles.requestButton}
            onPress={handleRequestRide}
          >
            <Search size={20} color="#fff" />
            <Text style={styles.requestButtonText}>Find Rides</Text>
          </TouchableOpacity>
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
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    padding: 8,
  },
  searchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  searchCard: {
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  requestButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pickupMarker: {
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
  pickupMarkerActive: {
    backgroundColor: '#f59e0b',
  },
  pickupInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickupText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  selectMapButton: {
    padding: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
  },
});
