import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';

import { findConflicts, sumCredits } from '@course-scheduler/shared-types';

import { ErrorState } from '../../components/common/ErrorState';
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

  const {
    courses,
    colorMap,
    isLoading: isLoadingCourses,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { toggleIncluded } = useCartMutations(scheduleId);
  const { data: loadouts = [] } = useLoadouts(userId, departmentId);
  const { saveLoadout } = useLoadoutMutations(userId, universityId, departmentId, scheduleId);

  // Measured (not estimated) so the grid can shrink to fit whatever's
  // actually left after the strip/banner above it, without hardcoding
  // header/tab-bar heights — this screen's own root View already excludes
  // those, since they're rendered by the parent Tabs layout, not here.
  const [screenHeight, setScreenHeight] = useState(0);
  const [topSectionHeight, setTopSectionHeight] = useState(0);
  const handleScreenLayout = (e: LayoutChangeEvent) => setScreenHeight(e.nativeEvent.layout.height);
  const handleTopSectionLayout = (e: LayoutChangeEvent) => setTopSectionHeight(e.nativeEvent.layout.height);
  // Small bottom margin so the grid doesn't butt right up against the
  // screen edge even when it's using every pixel it can get.
  const gridMaxHeight =
    screenHeight && topSectionHeight ? Math.max(screenHeight - topSectionHeight - 16, 0) : undefined;

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
    <View className="flex-1 bg-white dark:bg-neutral-950" onLayout={handleScreenLayout}>
      <View className="gap-3 p-4 pb-2" onLayout={handleTopSectionLayout}>
        <IncludedCoursesStrip
          cartCourses={cartCourses}
          includedIds={includedIds}
          colorFor={colorFor}
          onToggle={(courseId, included) => toggleIncluded.mutate({ courseId, included })}
        />
        {!isLoadingCourses && <ConflictWarningBanner conflicts={conflicts} />}
      </View>

      {/* The grid itself is sized (via gridMaxHeight) to fit whatever's left
          on screen after the section above — everything below it here
          (namely "Save as a loadout") is what's allowed to require
          scrolling to reach, per the point of measuring in the first
          place. */}
      <ScrollView className="px-4" contentContainerClassName="gap-4 pb-10">
        {isLoadingCourses ? (
          <ActivityIndicator />
        ) : isCoursesError ? (
          <ErrorState message="Couldn't load courses." onRetry={refetchCourses} />
        ) : (
          <ScheduleGrid
            courses={includedCourses}
            colorFor={colorFor}
            conflicts={conflicts}
            maxBodyHeight={gridMaxHeight}
          />
        )}

        <View>
          <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Save as a loadout
          </Text>
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
    </View>
  );
}
