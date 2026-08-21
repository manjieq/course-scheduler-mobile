import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { findConflicts, sumCredits } from '@course-scheduler/shared-types';

import { ConflictWarningBanner } from '../../components/schedule/ConflictWarningBanner';
import { ScheduleGrid } from '../../components/schedule/ScheduleGrid';
import { LoadoutComparisonView } from '../../components/loadouts/LoadoutComparisonView';
import { LoadoutList } from '../../components/loadouts/LoadoutList';
import { LoadoutSaveForm } from '../../components/loadouts/LoadoutSaveForm';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useUniversity } from '../../lib/catalog';
import type { LoadoutRow } from '../../lib/loadouts';
import { useLoadoutMutations, useLoadouts } from '../../lib/loadouts';
import { useSchedule, useScheduleCourses } from '../../lib/schedule-data';

// Phase 3: Postgres-backed Schedule tab, porting the prototype's
// ScheduleView + LoadoutManager + LoadoutComparisonView. University and
// department come from the profile — the same context the Courses tab set —
// not local selectors, so both tabs always show the same schedule.
export default function ScheduleScreen() {
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
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);
  const { saveLoadout, deleteLoadout, loadLoadout } = useLoadoutMutations(userId, universityId, departmentId, scheduleId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const includedCourses = useMemo(() => {
    const includedIds = new Set(scheduleCourses.filter((r) => r.included).map((r) => r.course_id));
    return courses.filter((c) => includedIds.has(c.id));
  }, [courses, scheduleCourses]);

  const conflicts = findConflicts(includedCourses);
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
        <>
          <ConflictWarningBanner conflicts={conflicts} />
          <ScheduleGrid courses={includedCourses} colorFor={colorFor} conflicts={conflicts} />
        </>
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

      <LoadoutComparisonView
        loadouts={comparedLoadouts}
        coursesById={coursesById}
        maxCredits={maxCredits}
        colorFor={colorFor}
      />
    </ScrollView>
  );
}
