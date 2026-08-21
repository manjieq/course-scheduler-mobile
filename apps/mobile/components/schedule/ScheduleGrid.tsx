import { Text, View } from 'react-native';

import { DAYS_OF_WEEK, DAY_LABELS, layoutOverlaps, toMinutes } from '@course-scheduler/shared-types';
import type { ConflictPair, Course, LayoutInput } from '@course-scheduler/shared-types';

import { EventBlock } from './EventBlock';

// Ported from the prototype's ScheduleGrid.tsx: absolute-positioned CSS grid
// -> absolute-positioned RN views inside fixed-height day columns, same
// pixel math (layoutOverlaps does the interval-graph column packing either
// way — see CLAUDE.md).
const START_HOUR = 8;
const END_HOUR = 17;
const GUTTER_WIDTH = 40;

interface ScheduleGridProps {
  courses: Course[];
  colorFor: (courseId: string) => string;
  conflicts?: ConflictPair[];
  compact?: boolean;
}

interface EventEntry {
  course: Course;
  slot: Course['schedule'][number];
}

export function ScheduleGrid({ courses, colorFor, conflicts = [], compact = false }: ScheduleGridProps) {
  if (courses.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          No courses selected — add courses to generate a schedule.
        </Text>
      </View>
    );
  }

  const hourPx = compact ? 28 : 48;
  const totalHours = END_HOUR - START_HOUR;
  const pxPerMin = hourPx / 60;
  const bodyHeight = totalHours * hourPx;

  const isConflicted = (slot: Course['schedule'][number]) =>
    conflicts.some((c) => c.slotA === slot || c.slotB === slot);

  return (
    <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <View className="flex-row border-b border-neutral-200 dark:border-neutral-800">
        <View style={{ width: GUTTER_WIDTH }} />
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} className="flex-1 items-center py-1.5">
            <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
              {compact ? day.slice(0, 3) : DAY_LABELS[day]}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row">
        <View style={{ width: GUTTER_WIDTH, height: bodyHeight }}>
          {Array.from({ length: totalHours + 1 }, (_, i) => START_HOUR + i).map((hour) => (
            <Text
              key={hour}
              className="absolute text-[9px] text-neutral-400 dark:text-neutral-500"
              style={{ top: (hour - START_HOUR) * hourPx - 5, left: 2 }}
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
              className="flex-1 border-l border-neutral-100 dark:border-neutral-900"
              style={{ height: bodyHeight }}
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
  );
}
