import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import { ComparisonPanel } from '../components/loadouts/ComparisonPanel';
import { useAuth } from '../lib/auth-context';
import { useDepartmentCourses, useUniversity } from '../lib/catalog';
import { useLoadouts } from '../lib/loadouts';

const MIN_PANEL_WIDTH = 260;
const OUTER_PADDING = 16;
const PANEL_GAP = 12;

// Dedicated full-screen route for the landscape side-by-side loadout
// comparison — see the Loadouts tab's "View side by side". Orientation
// unlocks only while this screen is mounted (app/_layout.tsx locks portrait
// everywhere else by default, and re-locks it here on unmount), so the rest
// of the app never rotates. Any number of loadouts can be compared: panels
// divide the available width evenly down to a readable minimum, then fall
// back to a horizontal scroll of fixed-width panels — see
// ComparisonPanel.tsx for why that panel itself never scrolls.
export default function LoadoutCompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const { data: university } = useUniversity(universityId);
  const { colorMap, coursesById } = useDepartmentCourses(departmentId);
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [hasBeenLandscape, setHasBeenLandscape] = useState(false);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  // Unlock on mount so a physical rotation can actually take effect here;
  // re-lock to the app-wide portrait default on unmount (see app/_layout.tsx).
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (isLandscape) setHasBeenLandscape(true);
  }, [isLandscape]);

  // Rotating back to portrait after having been landscape means "I'm done
  // comparing" — return to the Loadouts tab automatically. Guarded by
  // hasBeenLandscape so this doesn't fire immediately on open, before the
  // user has had a chance to actually rotate.
  useEffect(() => {
    if (hasBeenLandscape && !isLandscape) router.back();
  }, [hasBeenLandscape, isLandscape, router]);

  const selectedIds = useMemo(() => (ids ? ids.split(',').filter(Boolean) : []), [ids]);
  const comparedLoadouts = useMemo(
    () =>
      selectedIds
        .map((id) => loadouts.find((l) => l.id === id))
        .filter((l): l is NonNullable<typeof l> => Boolean(l)),
    [selectedIds, loadouts]
  );

  const maxCredits = university?.maxCreditsPerSemester ?? 20;
  const count = comparedLoadouts.length;

  const contentWidth = width - OUTER_PADDING * 2;
  const evenWidth = count > 0 ? (contentWidth - PANEL_GAP * (count - 1)) / count : contentWidth;
  const fitsEven = evenWidth >= MIN_PANEL_WIDTH;
  const panelWidth = fitsEven ? evenWidth : MIN_PANEL_WIDTH;

  function renderPanels() {
    return comparedLoadouts.map((loadout) => (
      <ComparisonPanel
        key={loadout.id}
        name={loadout.name}
        totalCredits={loadout.totalCredits}
        courses={loadout.courseIds.map((id) => coursesById.get(id)).filter((c): c is Course => Boolean(c))}
        maxCredits={maxCredits}
        colorFor={colorFor}
        width={panelWidth}
      />
    ));
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          Comparing {count} loadout{count === 1 ? '' : 's'}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {isLandscape ? 'Rotate back, or tap Done' : 'Done'}
          </Text>
        </Pressable>
      </View>

      {!isLandscape ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Rotate your device sideways to see both full schedules side by side.
          </Text>
        </View>
      ) : fitsEven ? (
        <View className="flex-1 flex-row gap-3 px-4 pb-4">{renderPanels()}</View>
      ) : (
        <ScrollView horizontal contentContainerClassName="flex-row gap-3 px-4 pb-4">
          {renderPanels()}
        </ScrollView>
      )}
    </View>
  );
}
