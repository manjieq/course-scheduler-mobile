import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { findConflicts } from '@course-scheduler/shared-types';

import { ConflictWarningBanner } from '../../components/schedule/ConflictWarningBanner';
import { IncludedCoursesStrip } from '../../components/schedule/IncludedCoursesStrip';
import { ScheduleGrid } from '../../components/schedule/ScheduleGrid';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses } from '../../lib/catalog';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';

// Phase 3/layout-redesign: Postgres-backed Schedule tab, porting the
// prototype's ScheduleView. Loadouts moved out to its own tab (see
// app/(tabs)/loadouts.tsx) — this screen now only owns the grid itself, plus
// the included-courses strip so a course can be unticked without leaving
// this tab (previously only possible from the Cart sheet on Courses).
export default function ScheduleScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const { courses, colorMap, isLoading: isLoadingCourses } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { toggleIncluded } = useCartMutations(scheduleId);

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
    </ScrollView>
  );
}
