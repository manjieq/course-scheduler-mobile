import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LoadoutComparisonView } from '../../components/loadouts/LoadoutComparisonView';
import { LoadoutList } from '../../components/loadouts/LoadoutList';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useUniversity } from '../../lib/catalog';
import type { LoadoutRow } from '../../lib/loadouts';
import { useLoadoutMutations, useLoadouts } from '../../lib/loadouts';
import { useSchedule } from '../../lib/schedule-data';

// Loadouts' own tab — browsing, loading, deleting, and comparing saved
// loadouts. Saving a new one happens on the Schedule tab now (next to the
// schedule it's saving), and the included-courses toggle strip only lives
// on Schedule too — both were redundant here once the cart was reachable
// from every tab via the persistent header.
export default function LoadoutsScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [pendingLoadoutId, setPendingLoadoutId] = useState<string | null>(null);

  const { data: university } = useUniversity(universityId);
  const { colorMap, coursesById } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);
  const { deleteLoadout, loadLoadout } = useLoadoutMutations(userId, universityId, departmentId, scheduleId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';
  const maxCredits = university?.maxCreditsPerSemester ?? 20;

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLoad(loadout: LoadoutRow) {
    setPendingLoadoutId(loadout.id);
    await loadLoadout.mutateAsync(loadout.courseIds);
    setPendingLoadoutId(null);
  }

  function handleDelete(id: string) {
    deleteLoadout.mutate(id);
    setCompareIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const comparedLoadouts = loadouts.filter((l) => compareIds.has(l.id));

  if (!departmentId) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-950">
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          Pick a department in the Courses tab first.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-neutral-950" contentContainerClassName="gap-4 pb-10">
      <View>
        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">Saved loadouts</Text>
        <Text className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Tick two or more below to compare them side by side.
        </Text>
        <LoadoutList
          loadouts={loadouts}
          coursesById={coursesById}
          maxCredits={maxCredits}
          colorFor={colorFor}
          compareSelectedIds={compareIds}
          pendingId={pendingLoadoutId}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onToggleCompare={toggleCompare}
        />
      </View>

      {comparedLoadouts.length >= 2 && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/loadout-compare',
              params: { ids: comparedLoadouts.map((l) => l.id).join(',') },
            })
          }
          className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">View side by side</Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Rotate your phone sideways to compare full schedules side by side
          </Text>
        </Pressable>
      )}

      <LoadoutComparisonView
        loadouts={comparedLoadouts}
        coursesById={coursesById}
        maxCredits={maxCredits}
        colorFor={colorFor}
      />
    </ScrollView>
  );
}
