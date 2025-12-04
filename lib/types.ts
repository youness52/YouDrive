export type UserRole = 'passenger' | 'driver';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  car_model: string;
  car_color: string;
  plate: string;
  online_status: boolean;
  rating: number;
  total_trips: number;
  created_at: string;
  user?: User;
}

export interface Location {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updated_at: string;
}

export type RideStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RideRequest {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dest_lat: number;
  dest_lng: number;
  dest_address: string;
  distance: number;
  suggested_price: number;
  passenger_price?: number;
  driver_price?: number;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  passenger?: User;
  driver?: Driver;
}

export interface Trip {
  id: string;
  ride_request_id: string;
  driver_id: string;
  passenger_id: string;
  start_time: string;
  end_time?: string;
  distance: number;
  price: number;
  status: 'active' | 'completed';
  created_at: string;
  passenger?: User;
  driver?: Driver;
}

export interface Rating {
  id: string;
  trip_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
