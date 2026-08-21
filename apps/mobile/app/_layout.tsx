import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Root layout: Phase 1 scaffold only. The real routing gate — redirect to
// (onboarding)/university whenever the signed-in user's profile has no
// resolved university_id yet (see CLAUDE.md's Gap 2 notes) — gets wired in
// Phase 2 once Supabase Auth/profiles exist. For now this just establishes
// the route groups the rest of the app hangs off of:
//   (onboarding)/university  — mandatory pre-app university selection
//   (tabs)/courses,schedule  — the two main tabs ported from the prototype
//   scan, chat                — AI extraction entry points (Phase 4)
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ presentation: 'modal', headerShown: true, title: 'Scan a course' }} />
        <Stack.Screen name="chat" options={{ presentation: 'modal', headerShown: true, title: 'Describe a course' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
