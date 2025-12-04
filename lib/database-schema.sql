-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table
CREATE TABLE public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
  car_model TEXT NOT NULL,
  car_color TEXT NOT NULL,
  plate TEXT NOT NULL,
  online_status BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver locations (for real-time tracking)
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  heading DECIMAL(5,2) DEFAULT 0,
  speed DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride requests
CREATE TABLE public.ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_id UUID REFERENCES public.users(id) NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  dest_lat DECIMAL(10,8) NOT NULL,
  dest_lng DECIMAL(11,8) NOT NULL,
  dest_address TEXT NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  suggested_price DECIMAL(10,2) NOT NULL,
  passenger_price DECIMAL(10,2),
  driver_price DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'driver_arrived', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips
CREATE TABLE public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID REFERENCES public.ride_requests(id) NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) NOT NULL,
  passenger_id UUID REFERENCES public.users(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  distance DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ratings
CREATE TABLE public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) NOT NULL,
  rater_id UUID REFERENCES public.users(id) NOT NULL,
  rated_id UUID REFERENCES public.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_locations_driver_id ON public.locations(driver_id);
CREATE INDEX idx_locations_updated_at ON public.locations(updated_at DESC);
CREATE INDEX idx_ride_requests_passenger_id ON public.ride_requests(passenger_id);
CREATE INDEX idx_ride_requests_driver_id ON public.ride_requests(driver_id);
CREATE INDEX idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX idx_trips_passenger_id ON public.trips(passenger_id);
CREATE INDEX idx_drivers_online_status ON public.drivers(online_status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Drivers can read all driver data
CREATE POLICY "Anyone can read drivers" ON public.drivers
  FOR SELECT USING (true);

-- Drivers can update their own data
CREATE POLICY "Drivers can update own data" ON public.drivers
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can read locations (for passenger tracking)
CREATE POLICY "Anyone can read locations" ON public.locations
  FOR SELECT USING (true);

-- Drivers can insert/update their own location
CREATE POLICY "Drivers can insert own location" ON public.locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update own location" ON public.locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- Ride requests policies
CREATE POLICY "Users can read their ride requests" ON public.ride_requests
  FOR SELECT USING (
    auth.uid() = passenger_id OR 
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Passengers can create ride requests" ON public.ride_requests
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Users can update their ride requests" ON public.ride_requests
  FOR UPDATE USING (
    auth.uid() = passenger_id OR 
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- Trips policies
CREATE POLICY "Users can read their trips" ON public.trips
  FOR SELECT USING (
    auth.uid() = passenger_id OR 
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- Ratings policies
CREATE POLICY "Anyone can read ratings" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Function to update driver rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.drivers
  SET rating = (
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM public.ratings
    WHERE rated_id IN (
      SELECT user_id FROM public.drivers WHERE id = (
        SELECT driver_id FROM public.trips WHERE id = NEW.trip_id
      )
    )
  )
  WHERE id = (
    SELECT driver_id FROM public.trips WHERE id = NEW.trip_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_rating_trigger
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating();

-- Function to auto-timeout ride requests
CREATE OR REPLACE FUNCTION timeout_ride_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.ride_requests
  SET status = 'cancelled'
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '20 seconds';
END;
$$ LANGUAGE plpgsql;
