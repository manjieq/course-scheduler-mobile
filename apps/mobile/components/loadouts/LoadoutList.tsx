import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from '../../lib/loadouts';
import { LoadoutCard } from './LoadoutCard';

interface LoadoutListProps {
  loadouts: LoadoutRow[];
  coursesById: Map<string, Course>;
  maxCredits: number;
  compareSelectedIds: Set<string>;
  /** True once compareSelectedIds is at the caller's cap — dims (but doesn't disable the tap on, so the Alert explaining the cap still fires) any not-yet-selected loadout's Compare checkbox. */
  compareLimitReached?: boolean;
  pendingId?: string | null;
  onLoad: (loadout: LoadoutRow) => void;
  onDelete: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export function LoadoutList({
  loadouts,
  coursesById,
  maxCredits,
  compareSelectedIds,
  compareLimitReached = false,
  pendingId,
  onLoad,
  onDelete,
  onToggleCompare,
}: LoadoutListProps) {
  if (loadouts.length === 0) {
    return (
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        No loadouts saved yet. Add courses in the Courses tab, then save your schedule from the Schedule tab.
      </Text>
    );
  }

  return (
    <View>
      {loadouts.map((loadout) => {
        const courses = loadout.courseIds.map((id) => coursesById.get(id)).filter((c): c is Course => Boolean(c));
        const compared = compareSelectedIds.has(loadout.id);
        return (
          <LoadoutCard
            key={loadout.id}
            loadout={loadout}
            courses={courses}
            maxCredits={maxCredits}
            actions={
              <View className="flex-row flex-wrap items-center gap-4 pt-1">
                <Pressable onPress={() => onLoad(loadout)} disabled={pendingId === loadout.id} hitSlop={8}>
                  {pendingId === loadout.id ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Load into Courses</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => onDelete(loadout.id)} hitSlop={8}>
                  <Text className="text-sm font-medium text-red-600 dark:text-red-400">Delete</Text>
                </Pressable>
                <Pressable
                  onPress={() => onToggleCompare(loadout.id)}
                  className={`flex-row items-center gap-1.5 ${!compared && compareLimitReached ? 'opacity-40' : ''}`}
                  hitSlop={8}
                >
                  <View
                    className={`h-4 w-4 items-center justify-center rounded border ${
                      compared
                        ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                        : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {compared && <Text className="text-[10px] text-white dark:text-neutral-900">✓</Text>}
                  </View>
                  <Text className="text-sm text-neutral-700 dark:text-neutral-300">Compare</Text>
                </Pressable>
              </View>
            }
          />
        );
      })}
    </View>
  );
}
