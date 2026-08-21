import { ScrollView, Text, View } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import type { LoadoutRow } from '../../lib/loadouts';
import { LoadoutCard } from './LoadoutCard';

interface LoadoutComparisonViewProps {
  loadouts: LoadoutRow[];
  coursesById: Map<string, Course>;
  maxCredits: number;
  colorFor: (courseId: string) => string;
}

export function LoadoutComparisonView({ loadouts, coursesById, maxCredits, colorFor }: LoadoutComparisonViewProps) {
  if (loadouts.length < 2) return null;

  return (
    <View className="mt-4 gap-2">
      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Comparing {loadouts.length} loadouts
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {loadouts.map((loadout) => {
            const courses = loadout.courseIds.map((id) => coursesById.get(id)).filter((c): c is Course => Boolean(c));
            return (
              <View key={loadout.id} style={{ width: 260 }}>
                <LoadoutCard loadout={loadout} courses={courses} maxCredits={maxCredits} colorFor={colorFor} showSchedule />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
