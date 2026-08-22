import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../lib/auth-context';
import { ExtractionReviewProvider } from '../lib/extraction-review-context';

const queryClient = new QueryClient();

// The Phase 2 routing gate: signed-out users only ever see (auth); signed-in
// users with no completed profile only ever see (onboarding); everyone else
// lands in (tabs). See CLAUDE.md's Gap 2 — onboarding is mandatory and
// blocks every other screen until profiles.onboarding_completed_at is set.
function useAuthRoutingGate() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const inOnboardingGroup = group === '(onboarding)';
    const onboardingDone = Boolean(profile?.onboarding_completed_at);

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && !onboardingDone && !inOnboardingGroup && !inAuthGroup) {
      router.replace('/(onboarding)/university');
    } else if (session && onboardingDone && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(tabs)/courses');
    }
  }, [session, profile, isLoading, segments, router]);

  return isLoading;
}

// The app is portrait-only everywhere except app/loadout-compare.tsx, which
// unlocks on focus and re-locks here on blur — see that route. app.json's
// manifest-level "orientation" is left at "default" (unlocked) precisely so
// this runtime lock/unlock actually has something to override.
function useDefaultPortraitLock() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);
}

function RootLayoutNav() {
  const isLoading = useAuthRoutingGate();
  useDefaultPortraitLock();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ presentation: 'modal', headerShown: true, title: 'Scan a course' }} />
      <Stack.Screen name="chat" options={{ presentation: 'modal', headerShown: true, title: 'Describe a course' }} />
      <Stack.Screen
        name="confirm-courses"
        options={{ presentation: 'modal', headerShown: true, title: 'Confirm courses' }}
      />
      <Stack.Screen name="loadout-compare" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

// Route groups this app hangs off of:
//   (auth)          — signed-out entry: email OTP sign-in/verify (Phase 2)
//   (onboarding)    — mandatory pre-app university selection
//   (tabs)          — Courses/Schedule/Loadouts, ported from the prototype
//   scan, chat      — AI extraction entry points (Phase 4)
//   confirm-courses — shared review/edit screen both scan and chat land on
//                     (Phase 4) — see lib/extraction-review-context.tsx
//   loadout-compare — landscape side-by-side loadout comparison (see the
//                     Loadouts tab's "View side by side")
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ExtractionReviewProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <RootLayoutNav />
          </SafeAreaProvider>
        </ExtractionReviewProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
