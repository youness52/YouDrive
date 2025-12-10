import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjzhezxnvbnkdczabsib.supabase.co' || '';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqemhlenhudmJua2RjemFic2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzAwMjYsImV4cCI6MjA4MDQ0NjAyNn0.wW9gqbOcSOclREzYrUwzWcF5UdnQ6aGLdDJdrlXPzws' || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
