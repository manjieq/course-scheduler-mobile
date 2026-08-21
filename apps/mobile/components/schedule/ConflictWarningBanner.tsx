import { Text, View } from 'react-native';

import { slotLabel } from '@course-scheduler/shared-types';
import type { ConflictPair } from '@course-scheduler/shared-types';

export function ConflictWarningBanner({ conflicts }: { conflicts: ConflictPair[] }) {
  if (conflicts.length === 0) return null;

  return (
    <View className="mb-3 gap-1 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
      <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        {conflicts.length} time conflict{conflicts.length > 1 ? 's' : ''} in this schedule
      </Text>
      {conflicts.map((c, i) => (
        <Text key={i} className="text-xs text-amber-700 dark:text-amber-400">
          {c.courseA.code} ({slotLabel(c.slotA)}) overlaps {c.courseB.code} ({slotLabel(c.slotB)})
        </Text>
      ))}
    </View>
  );
}
