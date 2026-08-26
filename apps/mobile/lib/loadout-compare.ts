import { useMemo } from 'react';

import { computeScheduleDays, computeScheduleHourRange, sharedCourseIds } from '@course-scheduler/shared-types';
import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from './loadouts';

/**
 * Shared by both loadout comparison views — landscape's full-detail
 * app/loadout-compare.tsx and portrait's compact LoadoutComparisonView (see
 * components/loadouts/LoadoutComparisonView.tsx) — so the "one shared hour
 * range/day set across every panel, plus which courses are actually common"
 * math isn't duplicated between them and can't drift out of sync.
 */
export function useComparisonLayout(comparedLoadouts: LoadoutRow[], coursesById: Map<string, Course>) {
  const loadoutCourses = useMemo(
    () =>
      comparedLoadouts.map((loadout) =>
        loadout.courseIds.map((id) => coursesById.get(id)).filter((c): c is Course => Boolean(c))
      ),
    [comparedLoadouts, coursesById]
  );

  const allComparedCourses = useMemo(() => loadoutCourses.flat(), [loadoutCourses]);
  const { startHour, endHour } = useMemo(() => computeScheduleHourRange(allComparedCourses), [allComparedCourses]);
  const days = useMemo(() => computeScheduleDays(allComparedCourses), [allComparedCourses]);
  const shared = useMemo(
    () => sharedCourseIds(comparedLoadouts.map((l) => l.courseIds)),
    [comparedLoadouts]
  );

  return { loadoutCourses, startHour, endHour, days, sharedCourseIds: shared };
}
