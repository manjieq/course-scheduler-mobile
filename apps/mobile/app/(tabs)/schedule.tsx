import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { findConflicts, sumCredits } from '@course-scheduler/shared-types';

import { LoadoutSaveForm } from '../../components/loadouts/LoadoutSaveForm';
import { ConflictWarningBanner } from '../../components/schedule/ConflictWarningBanner';
import { IncludedCoursesStrip } from '../../components/schedule/IncludedCoursesStrip';
import { ScheduleGrid } from '../../components/schedule/ScheduleGrid';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses } from '../../lib/catalog';
import { useLoadoutMutations, useLoadouts } from '../../lib/loadouts';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';

// Schedule tab: build the week (toggle included courses right here via
// IncludedCoursesStrip — no need to switch tabs, the original layout
// complaint), then save it as a loadout once it looks right — per user
// feedback, saving lives next to the schedule it's saving, not on the
// Loadouts tab. Browsing/loading/comparing saved loadouts stays on the
// Loadouts tab (app/(tabs)/loadouts.tsx).
export default function ScheduleScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const { courses, colorMap, isLoading: isLoadingCourses } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { toggleIncluded } = useCartMutations(scheduleId);
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);
  const { saveLoadout } = useLoadoutMutations(userId, universityId, departmentId, scheduleId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const cartCourseIds = useMemo(() => new Set(scheduleCourses.map((r) => r.course_id)), [scheduleCourses]);
  const includedIds = useMemo(
    () => new Set(scheduleCourses.filter((r) => r.included).map((r) => r.course_id)),
    [scheduleCourses]
  );
  const cartCourses = useMemo(() => courses.filter((c) => cartCourseIds.has(c.id)), [courses, cartCourseIds]);
  const includedCourses = useMemo(() => courses.filter((c) => includedIds.has(c.id)), [courses, includedIds]);

  const conflicts = findConflicts(includedCourses);

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
      <IncludedCoursesStrip
        cartCourses={cartCourses}
        includedIds={includedIds}
        colorFor={colorFor}
        onToggle={(courseId, included) => toggleIncluded.mutate({ courseId, included })}
      />

      {isLoadingCourses ? (
        <ActivityIndicator />
      ) : (
        <>
          <ConflictWarningBanner conflicts={conflicts} />
          <ScheduleGrid courses={includedCourses} colorFor={colorFor} conflicts={conflicts} />
        </>
      )}

      <View>
        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">Save as a loadout</Text>
        <Text className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Save this course combination — browse and compare it against others on the Loadouts tab.
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
      </View>
    </ScrollView>
  );
}
