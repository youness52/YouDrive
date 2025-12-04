# InDrive-Style Ride Hailing App - Setup Instructions

This is a complete React Native ride-hailing application built with Expo, Supabase, and Google Maps.

## Features

### Passenger Features
- Phone OTP authentication
- Map-based pickup/destination selection
- InDrive-style price negotiation
- Real-time driver tracking with animated markers
- Trip history and ratings

### Driver Features
- Online/offline status toggle
- Real-time GPS location broadcasting
- Incoming ride requests with accept/decline
- Active trip tracking and management
- Trip status updates (arrived, started, completed)
- Earnings dashboard
- Rating system

## Setup Instructions

### 1. Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `lib/database-schema.sql` in the Supabase SQL Editor
3. Enable Realtime for the `locations` table:
   - Go to Database > Replication
   - Enable replication for `public.locations` table
4. Configure Phone Auth:
   - Go to Authentication > Providers
   - Enable Phone provider
   - Configure Twilio or another SMS provider

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

```bash
npm install
# or
bun install
```

### 4. Run the App

```bash
npm start
```

## Key Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and build tools
- **Supabase** - Backend (Auth, Database, Realtime, Storage)
- **react-native-maps** - Google Maps integration
- **expo-location** - GPS tracking
- **React Query** - Server state management
- **TypeScript** - Type safety

## App Structure

```
app/
├── (auth)/                 # Authentication flow
│   ├── auth.tsx           # Phone OTP login
│   └── onboarding.tsx     # Role selection
├── passenger/             # Passenger features
│   ├── index.tsx          # Map home screen
│   ├── request.tsx        # Ride request with price negotiation
│   ├── tracking.tsx       # Real-time trip tracking
│   └── rating.tsx         # Post-trip rating
└── driver/                # Driver features
    ├── index.tsx          # Map home with online toggle + ride requests
    ├── tracking.tsx       # Active trip tracking and management
    └── earnings.tsx       # Earnings dashboard

lib/
├── supabase.ts           # Supabase client
├── types.ts              # TypeScript types
├── database-schema.sql   # Database schema
├── contexts/
│   └── AuthContext.tsx   # Authentication state
└── utils/
    └── maps.ts           # Map calculations

```

## Database Schema

The app uses these main tables:
- `users` - User profiles (linked to Supabase Auth)
- `drivers` - Driver-specific data (car info, rating, status)
- `locations` - Real-time driver GPS coordinates
- `ride_requests` - Ride requests with negotiated prices
- `trips` - Completed trip records
- `ratings` - Trip ratings and feedback

## Real-Time Features

The app uses Supabase Realtime for:
1. Driver location updates (broadcast every 5 seconds)
2. Ride request status changes
3. Driver-passenger matching

## Testing the App

### Test as Passenger:
1. Sign up with phone OTP
2. Select "Passenger" role
3. Enter pickup and destination
4. Set a custom price
5. Send ride request
6. View tracking screen

### Test as Driver:
1. Sign up with another phone number
2. Select "Driver" role
3. Toggle "Go Online"
4. Accept incoming ride requests
5. Complete rides and view earnings

## Important Notes

- **Supabase Auth**: Configure your phone auth provider (Twilio recommended)
- **Maps API**: Requires Google Maps API key for Android/iOS production
- **Location Permissions**: App requests location permissions on first launch
- **Real-time Subscriptions**: Ensure Supabase Realtime is enabled
- **Row Level Security**: Database policies are configured for security

## Deployment

1. Configure app.json with your app details
2. Build with EAS Build:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```
3. Submit to stores:
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

## Support

For issues and questions:
- Check Supabase logs for backend errors
- Check Expo logs for frontend errors
- Ensure all environment variables are set
- Verify Supabase Realtime is enabled

## License

MIT
