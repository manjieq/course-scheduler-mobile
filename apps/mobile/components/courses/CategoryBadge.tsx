import { Text, View } from 'react-native';

import { CATEGORY_LABELS } from '@course-scheduler/shared-types';
import type { CourseCategory } from '@course-scheduler/shared-types';

// Ported from the prototype's CategoryBadge.tsx (CSS-module color classes
// -> a lookup of NativeWind class strings, same idea).
const BADGE_CLASSES: Record<CourseCategory, string> = {
  core: 'bg-blue-100 dark:bg-blue-950',
  extended: 'bg-indigo-100 dark:bg-indigo-950',
  compulsory: 'bg-green-100 dark:bg-green-950',
  elective: 'bg-amber-100 dark:bg-amber-950',
};
const TEXT_CLASSES: Record<CourseCategory, string> = {
  core: 'text-blue-800 dark:text-blue-300',
  extended: 'text-indigo-800 dark:text-indigo-300',
  compulsory: 'text-green-800 dark:text-green-300',
  elective: 'text-amber-800 dark:text-amber-300',
};

export function CategoryBadge({ category }: { category: CourseCategory }) {
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${BADGE_CLASSES[category]}`}>
      <Text className={`text-xs font-semibold ${TEXT_CLASSES[category]}`}>{CATEGORY_LABELS[category]}</Text>
    </View>
  );
}
