import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { findConflicts } from '@course-scheduler/shared-types';
import type { Course } from '@course-scheduler/shared-types';

interface LoadoutCardData {
  id: string;
  name: string;
  totalCredits: number;
  createdAt: string;
}

interface LoadoutCardProps {
  loadout: LoadoutCardData;
  courses: Course[];
  maxCredits: number;
  actions?: ReactNode;
}

// Its own full schedule grid used to be an option here (a showSchedule
// prop, plus a colorFor prop to drive it), used only by
// LoadoutComparisonView's old vertically-stacked-cards approach to
// comparison — removed once that view switched to ComparisonPanel's
// compact side-by-side grids instead (see LoadoutComparisonView.tsx).
// LoadoutList (the Loadouts tab's own browse list) is this card's only
// remaining caller, and never wanted the full grid inline.
export function LoadoutCard({ loadout, courses, maxCredits, actions }: LoadoutCardProps) {
  const conflicts = findConflicts(courses);
  const overLimit = loadout.totalCredits > maxCredits;

  return (
    <View className="mb-3 gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{loadout.name}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {new Date(loadout.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-3">
        <Text
          className={`text-xs ${overLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {loadout.totalCredits} / {maxCredits} credits
        </Text>
        <Text className="text-xs text-neutral-600 dark:text-neutral-400">{courses.length} courses</Text>
        {conflicts.length > 0 && (
          <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View className="gap-0.5">
        {courses.map((c) => (
          <Text key={c.id} className="text-xs text-neutral-700 dark:text-neutral-300">
            {c.code} — {c.name}
          </Text>
        ))}
      </View>
      {actions}
    </View>
  );
}
