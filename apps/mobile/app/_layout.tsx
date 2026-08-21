import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../lib/auth-context';

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

function RootLayoutNav() {
  const isLoading = useAuthRoutingGate();

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
    </Stack>
  );
}

// Route groups this app hangs off of:
//   (auth)        — signed-out entry: email OTP sign-in/verify (Phase 2)
//   (onboarding)  — mandatory pre-app university selection
//   (tabs)        — the two main tabs ported from the prototype
//   scan, chat    — AI extraction entry points (Phase 4)
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
