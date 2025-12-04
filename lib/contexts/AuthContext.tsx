import createContextHook from '@nkzw/create-context-hook';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { useMutation, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const userQuery = useQuery({
    queryKey: ['user', supabaseUser?.id],
    queryFn: async () => {
      if (!supabaseUser?.id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!supabaseUser,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    }
  }, [userQuery.data]);

  const signInWithOTP = useMutation({
    mutationFn: async (phone: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async ({ phone, token }: { phone: string; token: string }) => {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;
    },
  });

  const completeProfile = useMutation({
    mutationFn: async ({ name, role }: { name: string; role: 'passenger' | 'driver' }) => {
      if (!supabaseUser) throw new Error('No user found');

      const { error } = await supabase.from('users').insert({
        id: supabaseUser.id,
        name,
        role,
        phone: supabaseUser.phone || '',
      });

      if (error) throw error;

      if (role === 'driver') {
        const { error: driverError } = await supabase
          .from('drivers')
          .insert({
            user_id: supabaseUser.id,
            car_model: 'Not set',
            car_color: 'Not set',
            plate: 'Not set',
          })
          .select()
          .single();

        if (driverError) throw driverError;
      }

      await userQuery.refetch();
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      await AsyncStorage.clear();
    },
  });

  return {
    session,
    supabaseUser,
    user,
    loading,
    signInWithOTP,
    verifyOTP,
    completeProfile,
    signOut,
    refetchUser: userQuery.refetch,
  };
});
