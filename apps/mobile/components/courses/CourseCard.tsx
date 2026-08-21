import { Pressable, Text, View } from 'react-native';

import { slotLabel } from '@course-scheduler/shared-types';
import type { Course } from '@course-scheduler/shared-types';

import { CategoryBadge } from './CategoryBadge';

interface CourseCardProps {
  course: Course;
  color: string;
  inCart: boolean;
  pending?: boolean;
  onAdd: (courseId: string) => void;
  onRemove: (courseId: string) => void;
}

export function CourseCard({ course, color, inCart, pending, onAdd, onRemove }: CourseCardProps) {
  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <View className="h-full w-1.5 self-stretch rounded-full" style={{ backgroundColor: color }} />
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{course.code}</Text>
          <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-300" numberOfLines={1}>
            {course.name}
          </Text>
        </View>
        <CategoryBadge category={course.category} />
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {course.credits} credits · {course.schedule.map(slotLabel).join(', ')}
        </Text>
      </View>
      <Pressable
        onPress={() => (inCart ? onRemove(course.id) : onAdd(course.id))}
        disabled={pending}
        className={`rounded-lg px-3 py-2 disabled:opacity-50 ${inCart ? 'bg-red-50 dark:bg-red-950' : 'bg-neutral-900 dark:bg-neutral-100'}`}
      >
        <Text className={`text-xs font-medium ${inCart ? 'text-red-700 dark:text-red-300' : 'text-white dark:text-neutral-900'}`}>
          {inCart ? 'Remove' : 'Add'}
        </Text>
      </Pressable>
    </View>
  );
}
