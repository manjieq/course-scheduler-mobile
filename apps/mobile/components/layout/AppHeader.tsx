import { useSegments } from 'expo-router';
import { Text, View } from 'react-native';

import { CartHeaderButton } from '../courses/CartHeaderButton';

const TAB_TITLES: Record<string, string> = {
  courses: 'Courses',
  schedule: 'Schedule',
  loadouts: 'Loadouts',
};

interface AppHeaderProps {
  universityShortName?: string;
  cartCount: number;
  onOpenCart: () => void;
}

// Persistent header rendered above the tab bar in app/(tabs)/_layout.tsx, on
// every tab — replaces the old per-screen native header that only existed
// on Courses (see courses.tsx's previous navigation.setOptions), so the
// cart is reachable from Schedule and Loadouts too, not just Courses.
export function AppHeader({ universityShortName, cartCount, onOpenCart }: AppHeaderProps) {
  const segments = useSegments();
  const activeTab = segments[segments.length - 1];
  const title = TAB_TITLES[activeTab] ?? 'Course Scheduler';

  return (
    <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 pb-3 pt-2 dark:border-neutral-800">
      <View>
        {universityShortName && (
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
            {universityShortName}
          </Text>
        )}
        <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
      </View>
      <CartHeaderButton count={cartCount} onPress={onOpenCart} />
    </View>
  );
}
