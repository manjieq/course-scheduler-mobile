import { Text, View } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

import { CourseCard } from './CourseCard';

interface CourseListProps {
  title: string;
  courses: Course[];
  cartCourseIds: Set<string>;
  pendingCourseId?: string | null;
  colorFor: (courseId: string) => string;
  onAdd: (courseId: string) => void;
  onRemove: (courseId: string) => void;
}

export function CourseList({
  title,
  courses,
  cartCourseIds,
  pendingCourseId,
  colorFor,
  onAdd,
  onRemove,
}: CourseListProps) {
  return (
    <View className="mb-4 gap-1">
      <Text className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </Text>
      {courses.length === 0 ? (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">No courses in this category.</Text>
      ) : (
        courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            color={colorFor(course.id)}
            inCart={cartCourseIds.has(course.id)}
            pending={pendingCourseId === course.id}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))
      )}
    </View>
  );
}
