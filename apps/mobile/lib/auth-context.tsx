import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

// Mirrors the `profiles` row (see apps/api/supabase/migrations/0001_init.sql).
// university_id/onboarding_completed_at are null until the onboarding
// screen's Confirm writes them — that's the signal the routing gate in
// app/_layout.tsx uses to decide whether onboarding is still required.
export interface Profile {
  id: string;
  university_id: string | null;
  department_id: string | null;
  onboarding_completed_at: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session restore (and, if signed in, first profile fetch) resolves. */
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, university_id, department_id, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // A missing profile row is expected for a brand-new user (no
    // auto-create trigger — see the onboarding screen's upsert); only
    // surface unexpected query errors.
    console.error('fetchProfile failed', error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(initialSession);
        if (initialSession) {
          setProfile(await fetchProfile(initialSession.user.id));
        }
      } catch (error) {
        // A network blip or a stale/corrupted stored session must not leave
        // the app stuck behind app/_layout.tsx's loading spinner forever —
        // fall back to signed-out and let the routing gate send the user to
        // sign-in, same as any other failed session restore. Mirrors the
        // .finally() safety lib/theme.ts's useThemeRestore already has.
        console.error('Session restore failed', error);
        if (!isMounted) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      try {
        setProfile(nextSession ? await fetchProfile(nextSession.user.id) : null);
      } catch (error) {
        console.error('Profile fetch on auth change failed', error);
        if (isMounted) setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!session) return;
    setProfile(await fetchProfile(session.user.id));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
