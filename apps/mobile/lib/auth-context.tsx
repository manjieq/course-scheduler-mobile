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

// supabase-js's GoTrueClient can hang indefinitely rather than reject — seen
// in practice as a getSession()/token-refresh call that never resolves
// (reports elsewhere tie this to its internal cross-instance lock getting
// stuck, e.g. after a dev-client Fast Refresh reload leaves a prior client
// instance's lock unreleased). A try/catch alone doesn't help a promise
// that never settles at all, so every call that blocks app/_layout.tsx's
// loading spinner is raced against a hard timeout — past it we give up and
// fall back to signed-out rather than spin forever.
const AUTH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS}ms`)),
      AUTH_TIMEOUT_MS
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
        } = await withTimeout(supabase.auth.getSession(), 'getSession');
        if (!isMounted) return;

        setSession(initialSession);
        if (initialSession) {
          setProfile(await withTimeout(fetchProfile(initialSession.user.id), 'fetchProfile'));
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
        setProfile(nextSession ? await withTimeout(fetchProfile(nextSession.user.id), 'fetchProfile') : null);
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
