// lib/contexts/AuthContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useMutation, useQuery } from '@tanstack/react-query';

export type User = {
  id: string;
  name?: string | null;
  phone?: string | null;
  role?: 'passenger' | 'driver' | null;
  created_at?: string;
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user row from 'users' table based on supabase user id
  const userQuery = useQuery({
    queryKey: ['user', supabaseUser?.id],
    queryFn: async (): Promise<User | null> => {
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
    staleTime: 1000 * 60 * 5,
  });

  // Listen to auth state and get initial session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSupabaseUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    }
  }, [userQuery.data]);

  // Mutations
  const signInWithOTP = useMutation({
    mutationFn: async (phone: string) => {
      const { data, error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      // data may contain a session if Supabase auto-auths
      return data;
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async ({ phone, token }: { phone: string; token: string }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;
      return data;
    },
  });

  const completeProfile = useMutation({
    mutationFn: async ({ name, role }: { name: string; role: 'passenger' | 'driver' }) => {
      if (!supabaseUser) throw new Error('No authenticated user');

      // upsert user record (insert if not exists)
      const { error } = await supabase.from('users').upsert({
        id: supabaseUser.id,
        name,
        role,
        phone: supabaseUser.phone ?? null,
      });
      if (error) throw error;

      // If driver, ensure driver row exists
      if (role === 'driver') {
        const { error: driverError } = await supabase.from('drivers').upsert({
          user_id: supabaseUser.id,
          car_model: 'Not set',
          car_color: 'Not set',
          plate: 'Not set',
        });
        if (driverError) throw driverError;
      }

      // refetch user
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
