import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { RideRequest, Driver } from '../types';
import { useAuth } from './AuthContext';

export const [RideProvider, useRide] = createContextHook(() => {
  const { user } = useAuth();
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<RideRequest[]>([]);

  const driverQuery = useQuery({
    queryKey: ['driver', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'driver') return null;
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Driver;
    },
    enabled: !!user && user.role === 'driver',
  });

  const passengerRideQuery = useQuery({
    queryKey: ['passengerActiveRide', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'passenger') return null;

      const { data, error } = await supabase
        .from('ride_requests')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('passenger_id', user.id)
        .in('status', ['pending', 'accepted', 'driver_arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as RideRequest | null;
    },
    enabled: !!user && user.role === 'passenger',
    refetchInterval: 3000,
  });

  const driverRideQuery = useQuery({
    queryKey: ['driverActiveRide', user?.id, driverQuery.data?.id],
    queryFn: async () => {
      if (!driverQuery.data?.id) return null;

      const { data, error } = await supabase
        .from('ride_requests')
        .select('*, passenger:users(*)')
        .eq('driver_id', driverQuery.data.id)
        .in('status', ['accepted', 'driver_arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as RideRequest | null;
    },
    enabled: !!driverQuery.data,
    refetchInterval: 3000,
  });

  const pendingRequestsQuery = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: async () => {
      if (!driverQuery.data?.online_status) return [];

      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RideRequest[];
    },
    enabled: !!driverQuery.data?.online_status,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (user?.role === 'passenger' && passengerRideQuery.data) {
      setActiveRide(passengerRideQuery.data);
    } else if (user?.role === 'driver' && driverRideQuery.data) {
      setActiveRide(driverRideQuery.data);
    }
  }, [passengerRideQuery.data, driverRideQuery.data, user?.role]);

  useEffect(() => {
    if (pendingRequestsQuery.data) {
      setIncomingRequests(pendingRequestsQuery.data);
    }
  }, [pendingRequestsQuery.data]);

  useEffect(() => {
    if (!driverQuery.data?.online_status) return;

    const channel = supabase
      .channel('ride-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending',
        },
        (payload: any) => {
          console.log('New ride request:', payload);
          pendingRequestsQuery.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
        },
        (payload: any) => {
          console.log('Ride request updated:', payload);
          pendingRequestsQuery.refetch();
          driverRideQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverQuery.data?.online_status]);

  const acceptRide = useMutation({
    mutationFn: async (rideId: string) => {
      if (!driverQuery.data?.id) throw new Error('No driver found');

      const { error } = await supabase
        .from('ride_requests')
        .update({
          driver_id: driverQuery.data.id,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rideId);

      if (error) throw error;

      await driverRideQuery.refetch();
      await pendingRequestsQuery.refetch();
    },
  });

  const rejectRide = useMutation({
    mutationFn: async (rideId: string) => {
      const { error } = await supabase
        .from('ride_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rideId);

      if (error) throw error;
      await pendingRequestsQuery.refetch();
    },
  });

  const updateRideStatus = useMutation({
    mutationFn: async ({ rideId, status }: { rideId: string; status: string }) => {
      const { error } = await supabase
        .from('ride_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rideId);

      if (error) throw error;

      if (status === 'in_progress' && driverQuery.data?.id && activeRide) {
        const { error: tripError } = await supabase
          .from('trips')
          .insert({
            ride_request_id: rideId,
            driver_id: driverQuery.data.id,
            passenger_id: activeRide.passenger_id,
            distance: activeRide.distance,
            price: activeRide.passenger_price || activeRide.suggested_price,
            status: 'active',
          });

        if (tripError) throw tripError;
      }

      if (status === 'completed') {
        const { data: trip } = await supabase
          .from('trips')
          .select('id')
          .eq('ride_request_id', rideId)
          .single();

        if (trip) {
          await supabase
            .from('trips')
            .update({
              status: 'completed',
              end_time: new Date().toISOString(),
            })
            .eq('id', trip.id);

          if (driverQuery.data?.id) {
            await supabase
              .from('drivers')
              .update({
                total_trips: (driverQuery.data.total_trips || 0) + 1,
              })
              .eq('id', driverQuery.data.id);
          }
        }
      }

      await driverRideQuery.refetch();
      await passengerRideQuery.refetch();
      await driverQuery.refetch();
    },
  });

  return {
    activeRide,
    incomingRequests,
    driver: driverQuery.data,
    acceptRide,
    rejectRide,
    updateRideStatus,
    isLoading: driverQuery.isLoading || passengerRideQuery.isLoading,
  };
});
