import { Tabs } from 'expo-router';

// Two tabs, matching the prototype's Courses/Schedule split (NavTabs.tsx).
// Tab navigation here is real (Expo Router), unlike the prototype's
// in-memory-only tab state — this is a genuine improvement (deep-linkable,
// survives reload), not just a port.
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Tabs>
  );
}
