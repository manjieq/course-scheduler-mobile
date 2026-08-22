import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Course } from '@course-scheduler/shared-types';

interface IncludedCoursesStripProps {
  cartCourses: Course[];
  includedIds: Set<string>;
  colorFor: (courseId: string) => string;
  onToggle: (courseId: string, nextIncluded: boolean) => void;
}

// The fix for "I have to switch tabs just to untick a course": Schedule and
// Loadouts both render this strip, so the same schedule_courses.included
// flag CartSheet's checkboxes toggle (see useCartMutations().toggleIncluded
// in lib/schedule-data.ts) can be toggled right here too — no modal, no tab
// switch. Filled = included, outline = excluded, reusing the same
// filled/outline convention DepartmentSelector's chips already use, rather
// than adding a separate checkmark glyph on top of it.
export function IncludedCoursesStrip({ cartCourses, includedIds, colorFor, onToggle }: IncludedCoursesStripProps) {
  if (cartCourses.length === 0) {
    return (
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        Add courses in the Courses tab to see them here.
      </Text>
    );
  }

  return (
    <View>
      <Text className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Included courses
      </Text>
      <Text className="mb-2 text-xs text-neutral-400 dark:text-neutral-600">
        Tap to include or exclude — updates instantly
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
        {cartCourses.map((course) => {
          const included = includedIds.has(course.id);
          return (
            <Pressable
              key={course.id}
              onPress={() => onToggle(course.id, !included)}
              className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                included
                  ? 'bg-neutral-900 dark:bg-neutral-100'
                  : 'border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950'
              }`}
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: colorFor(course.id), opacity: included ? 1 : 0.5 }}
              />
              <Text
                className={`text-xs font-semibold ${
                  included ? 'text-white dark:text-neutral-900' : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {course.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
