import { ActivityIndicator, View } from 'react-native';

// The app has no real content of its own at "/" — every screen lives under
// (auth)/(onboarding)/(tabs), which are all sub-paths, not "/" itself. This
// file exists purely so "/" always resolves to *something* the moment the
// app launches, instead of expo-router's built-in "Unmatched Route" screen.
// app/_layout.tsx's useAuthRoutingGate immediately replaces this with the
// correct destination (sign-in / onboarding / tabs) once auth state is
// known — this screen is only ever visible for a single frame on cold
// start, so it just mirrors the same loading spinner _layout.tsx shows
// while it's working that out.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <ActivityIndicator />
    </View>
  );
}
