import { useState } from 'react';
import { ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';

import { computeScheduleDays, computeScheduleHourRange, DAY_LABELS, layoutOverlaps, toMinutes } from '@course-scheduler/shared-types';
import type { ConflictPair, Course, LayoutInput } from '@course-scheduler/shared-types';

import { EventBlock } from './EventBlock';

// Ported from the prototype's ScheduleGrid.tsx. The original mobile port's
// first attempt at fitting all 5 days on screen used unbounded flex-1
// columns, which on a phone divided into unreadable ~60px slivers — the fix
// at the time was a fixed-width, horizontal-scroll-with-a-floor pattern
// instead (matching the web version's own `minmax(110px, 1fr)` + overflow
// approach). This version keeps that floor (MIN_DAY_COLUMN_WIDTH) but
// isn't fixed above it: the grid measures its own available width (see the
// onLayout below) and shrinks each day column — down to that floor, same
// idea as MIN_HOUR_PX — to try to fit all 5 days without scrolling, rather
// than always defaulting to the widest, safest size and letting the user
// scroll sideways even when there's room to fit.
const GUTTER_WIDTH = 48;
const DEFAULT_DAY_COLUMN_WIDTH = 104;
const MIN_DAY_COLUMN_WIDTH = 64;
// onLayout reports the root View's border-box width, but its own border
// (and the rounded corners clipped by overflow-hidden) eat a couple of
// pixels the raw measurement doesn't account for — without this, columns
// sized to exactly fill the measured width could end up a hair too wide
// and get visibly nicked at the edge.
const EDGE_SAFETY_MARGIN = 8;
const DEFAULT_HOUR_PX = 48;
const MIN_HOUR_PX = 28;
// Rough height of the day-label header row (py-1.5 padding + an 11px line
// + its border) — subtracted from maxBodyHeight below so the shrink math
// is against the whole grid's footprint, matching what the caller actually
// measured as available space for the ScheduleGrid component as a whole.
const HEADER_ROW_HEIGHT = 28;

interface ScheduleGridProps {
  courses: Course[];
  colorFor: (courseId: string) => string;
  conflicts?: ConflictPair[];
  /** Available vertical space for the whole grid component (header row included), if known — see app/(tabs)/schedule.tsx. Omit to always use DEFAULT_HOUR_PX. */
  maxBodyHeight?: number;
}

interface EventEntry {
  course: Course;
  slot: Course['schedule'][number];
}

export function ScheduleGrid({ courses, colorFor, conflicts = [], maxBodyHeight }: ScheduleGridProps) {
  // Hooks first, before the empty-state early return below — rules of hooks.
  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  if (courses.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          No courses selected — add courses to generate a schedule.
        </Text>
      </View>
    );
  }

  // Same "only show it if a course actually uses it" idea as the hour
  // range below, applied to days: Mon-Fri always render, Sat/Sun only join
  // when something actually meets then — see computeScheduleDays.
  const days = computeScheduleDays(courses);

  const { startHour: START_HOUR, endHour: END_HOUR } = computeScheduleHourRange(courses);
  const totalHours = END_HOUR - START_HOUR;
  const naturalBodyHeight = totalHours * DEFAULT_HOUR_PX;
  const availableBodyHeight = maxBodyHeight ? Math.max(maxBodyHeight - HEADER_ROW_HEIGHT, 0) : undefined;
  const HOUR_PX =
    availableBodyHeight && naturalBodyHeight > availableBodyHeight
      ? Math.max(MIN_HOUR_PX, Math.floor(availableBodyHeight / totalHours))
      : DEFAULT_HOUR_PX;
  const pxPerMin = HOUR_PX / 60;
  const bodyHeight = totalHours * HOUR_PX;

  // containerWidth is this component's own root View's measured width (not
  // the inner horizontal ScrollView's content width) — it reflects exactly
  // what the parent actually gives this component to work with, so no
  // padding/margin guesswork is needed the way maxBodyHeight's caller has
  // to do across sibling elements above it.
  const naturalColumnsWidth = DEFAULT_DAY_COLUMN_WIDTH * days.length;
  const availableColumnsWidth = containerWidth
    ? Math.max(containerWidth - GUTTER_WIDTH - EDGE_SAFETY_MARGIN, 0)
    : undefined;
  const DAY_COLUMN_WIDTH =
    availableColumnsWidth && naturalColumnsWidth > availableColumnsWidth
      ? Math.max(MIN_DAY_COLUMN_WIDTH, Math.floor(availableColumnsWidth / days.length))
      : DEFAULT_DAY_COLUMN_WIDTH;

  const isConflicted = (slot: Course['schedule'][number]) =>
    conflicts.some((c) => c.slotA === slot || c.slotB === slot);

  return (
    <View
      className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
      onLayout={handleContainerLayout}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View className="flex-row border-b border-neutral-200 dark:border-neutral-800">
            <View style={{ width: GUTTER_WIDTH }} />
            {days.map((day) => (
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

            {days.map((day) => {
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
                        // column/columnCount ride along in the key so
                        // removing an overlapping sibling forces a fresh
                        // mount of the surviving block instead of an
                        // in-place update — otherwise the absolutely
                        // positioned, percentage-width block can be left
                        // showing stale (blank) text after its width
                        // jumps from e.g. 50% to 100%.
                        key={`${item.key}-${item.column}-${item.columnCount}`}
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
