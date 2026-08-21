import { Text, View } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from '../../lib/loadouts';
import { LoadoutCard } from './LoadoutCard';

interface LoadoutComparisonViewProps {
  loadouts: LoadoutRow[];
  coursesById: Map<string, Course>;
  maxCredits: number;
  colorFor: (courseId: string) => string;
}

// Ported from the prototype's side-by-side comparison row, but stacked
// vertically instead: side-by-side only worked on the web because there was
// enough width to fit multiple full schedule grids at once. Shrinking each
// card to fit side by side on a phone made the embedded grid illegible (and
// would have nested a horizontal scroll inside ScheduleGrid's own horizontal
// scroll — a gesture conflict, not just a style problem). Scrolling down
// between full-width, fully readable cards is the better tradeoff here.
export function LoadoutComparisonView({ loadouts, coursesById, maxCredits, colorFor }: LoadoutComparisonViewProps) {
  if (loadouts.length < 2) return null;

  return (
    <View className="mt-4 gap-3">
      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Comparing {loadouts.length} loadouts
      </Text>
      {loadouts.map((loadout) => {
        const courses = loadout.courseIds.map((id) => coursesById.get(id)).filter((c): c is Course => Boolean(c));
        return (
          <LoadoutCard key={loadout.id} loadout={loadout} courses={courses} maxCredits={maxCredits} colorFor={colorFor} showSchedule />
        );
      })}
    </View>
  );
}
