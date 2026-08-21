import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_* vars are inlined at build time and are safe to ship
// client-side — this is the anon key, scoped by RLS (see CLAUDE.md).
// Never put the service_role key here; that only ever lives in Supabase
// project secrets, used inside Edge Functions.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy apps/mobile/.env.example to apps/mobile/.env and fill in your Supabase project keys.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Magic-link/OTP flow is driven by explicit code entry (see
    // app/(auth)/verify.tsx), not a deep-linked redirect, so URL session
    // detection would just be dead weight here.
    detectSessionInUrl: false,
  },
});
