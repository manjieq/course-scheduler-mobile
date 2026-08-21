import { ScrollView, Text, View } from 'react-native';

import { DAYS_OF_WEEK, DAY_LABELS, layoutOverlaps, toMinutes } from '@course-scheduler/shared-types';
import type { ConflictPair, Course, LayoutInput } from '@course-scheduler/shared-types';

import { EventBlock } from './EventBlock';

// Ported from the prototype's ScheduleGrid.tsx. The web version was never
// actually flex-shrunk to fit its container — its CSS grid uses
// `minmax(110px, 1fr)` per day column inside an `overflow-x: auto` wrapper,
// staying comfortably readable and just scrolling sideways instead. The
// first mobile port missed that (flex-1 columns dividing phone width into
// ~60px slivers); this restores the same horizontal-scroll-with-a-floor
// pattern instead of inventing a mobile-only layout.
const START_HOUR = 8;
const END_HOUR = 17;
const GUTTER_WIDTH = 48;
const DAY_COLUMN_WIDTH = 104;
const HOUR_PX = 48;

interface ScheduleGridProps {
  courses: Course[];
  colorFor: (courseId: string) => string;
  conflicts?: ConflictPair[];
}

interface EventEntry {
  course: Course;
  slot: Course['schedule'][number];
}

export function ScheduleGrid({ courses, colorFor, conflicts = [] }: ScheduleGridProps) {
  if (courses.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          No courses selected — add courses to generate a schedule.
        </Text>
      </View>
    );
  }

  const totalHours = END_HOUR - START_HOUR;
  const pxPerMin = HOUR_PX / 60;
  const bodyHeight = totalHours * HOUR_PX;

  const isConflicted = (slot: Course['schedule'][number]) =>
    conflicts.some((c) => c.slotA === slot || c.slotB === slot);

  return (
    <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View className="flex-row border-b border-neutral-200 dark:border-neutral-800">
            <View style={{ width: GUTTER_WIDTH }} />
            {DAYS_OF_WEEK.map((day) => (
              <View key={day} style={{ width: DAY_COLUMN_WIDTH }} className="items-center py-1.5">
                <Text className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {DAY_LABELS[day]}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row">
            <View style={{ width: GUTTER_WIDTH, height: bodyHeight }}>
              {Array.from({ length: totalHours + 1 }, (_, i) => START_HOUR + i).map((hour) => (
                <Text
                  key={hour}
                  className="absolute text-[10px] text-neutral-400 dark:text-neutral-500"
                  style={{ top: (hour - START_HOUR) * HOUR_PX - 5, left: 4 }}
                >
                  {hour}:00
                </Text>
              ))}
            </View>

            {DAYS_OF_WEEK.map((day) => {
              const entries: LayoutInput<EventEntry>[] = [];
              for (const course of courses) {
                for (const slot of course.schedule) {
                  if (slot.day !== day) continue;
                  entries.push({
                    key: `${course.id}-${slot.day}-${slot.start}`,
                    start: toMinutes(slot.start),
                    end: toMinutes(slot.end),
                    data: { course, slot },
                  });
                }
              }
              const positioned = layoutOverlaps(entries);

              return (
                <View
                  key={day}
                  style={{ width: DAY_COLUMN_WIDTH, height: bodyHeight }}
                  className="border-l border-neutral-100 dark:border-neutral-900"
                >
                  {positioned.map((item) => {
                    const top = (item.start - START_HOUR * 60) * pxPerMin;
                    const height = Math.max((item.end - item.start) * pxPerMin - 2, 16);
                    const widthPct = 100 / item.columnCount;
                    const leftPct = item.column * widthPct;
                    return (
                      <EventBlock
                        key={item.key}
                        course={item.data.course}
                        slot={item.data.slot}
                        color={colorFor(item.data.course.id)}
                        conflicted={isConflicted(item.data.slot)}
                        position={{
                          top,
                          height,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      />
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
