import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { sumCredits } from '@course-scheduler/shared-types';

import { IncludedCoursesStrip } from '../../components/schedule/IncludedCoursesStrip';
import { LoadoutComparisonView } from '../../components/loadouts/LoadoutComparisonView';
import { LoadoutList } from '../../components/loadouts/LoadoutList';
import { LoadoutSaveForm } from '../../components/loadouts/LoadoutSaveForm';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useUniversity } from '../../lib/catalog';
import type { LoadoutRow } from '../../lib/loadouts';
import { useLoadoutMutations, useLoadouts } from '../../lib/loadouts';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';

// Loadouts' own tab — previously this whole section was bolted onto the
// bottom of Schedule (see CLAUDE.md's plan history for the layout-redesign
// mockup this implements). Ported from that section unchanged apart from
// the new IncludedCoursesStrip (a course can be unticked right here now)
// and the "View side by side" affordance, which hands off to the dedicated
// app/loadout-compare.tsx route for a landscape comparison view.
export default function LoadoutsScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [pendingLoadoutId, setPendingLoadoutId] = useState<string | null>(null);

  const { data: university } = useUniversity(universityId);
  const { courses, colorMap, coursesById, isLoading: isLoadingCourses } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { toggleIncluded } = useCartMutations(scheduleId);
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);
  const { saveLoadout, deleteLoadout, loadLoadout } = useLoadoutMutations(
    userId,
    universityId,
    departmentId,
    scheduleId
  );

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const cartCourseIds = useMemo(() => new Set(scheduleCourses.map((r) => r.course_id)), [scheduleCourses]);
  const includedIds = useMemo(
    () => new Set(scheduleCourses.filter((r) => r.included).map((r) => r.course_id)),
    [scheduleCourses]
  );
  const cartCourses = useMemo(() => courses.filter((c) => cartCourseIds.has(c.id)), [courses, cartCourseIds]);
  const includedCourses = useMemo(() => courses.filter((c) => includedIds.has(c.id)), [courses, includedIds]);

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
      {isLoadingCourses ? (
        <ActivityIndicator />
      ) : (
        <IncludedCoursesStrip
          cartCourses={cartCourses}
          includedIds={includedIds}
          colorFor={colorFor}
          onToggle={(courseId, included) => toggleIncluded.mutate({ courseId, included })}
        />
      )}

      <View>
        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Save & compare loadouts
        </Text>
        <Text className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Save this course combination, then tick two or more below to compare them side by side.
        </Text>
        <LoadoutSaveForm
          disabled={includedCourses.length === 0}
          isSaving={saveLoadout.isPending}
          existingCount={loadouts.length}
          onSave={(name) =>
            saveLoadout.mutate({
              name,
              courseIds: includedCourses.map((c) => c.id),
              totalCredits: sumCredits(includedCourses),
            })
          }
        />
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
