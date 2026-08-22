import { Text, View } from 'react-native';

import { DAYS_OF_WEEK, DAY_LABELS, findConflicts, layoutOverlaps, toMinutes } from '@course-scheduler/shared-types';
import type { Course, LayoutInput } from '@course-scheduler/shared-types';

import { EventBlock } from '../schedule/EventBlock';

const START_HOUR = 8;
const END_HOUR = 17;
const GUTTER_WIDTH = 26;
const HOUR_PX = 26;

interface ComparisonPanelProps {
  name: string;
  totalCredits: number;
  courses: Course[];
  maxCredits: number;
  colorFor: (courseId: string) => string;
  width: number;
}

interface EventEntry {
  course: Course;
  slot: Course['schedule'][number];
}

// A loadout's compact Mon-Fri grid for the landscape side-by-side compare
// (see app/loadout-compare.tsx). Deliberately NOT a reuse of ScheduleGrid:
// ScheduleGrid packs fixed 104px day columns inside its own horizontal
// ScrollView, which — as LoadoutComparisonView.tsx's comment on the
// previous side-by-side attempt explains — creates a gesture conflict once
// nested inside another horizontally-scrollable row of panels. This instead
// sizes its day columns to the panel's actual available width and never
// scrolls itself, so the panel row (which may itself scroll when more
// loadouts are compared than fit at a readable width) is the only
// horizontal scroll on screen at a time. EventBlock is still reused as-is —
// it takes its position as props rather than assuming ScheduleGrid's fixed
// geometry, so this is a real reuse, not a fork.
export function ComparisonPanel({ name, totalCredits, courses, maxCredits, colorFor, width }: ComparisonPanelProps) {
  const conflicts = findConflicts(courses);
  const overLimit = totalCredits > maxCredits;
  const dayWidth = Math.max((width - GUTTER_WIDTH) / DAYS_OF_WEEK.length, 40);
  const bodyHeight = (END_HOUR - START_HOUR) * HOUR_PX;
  const pxPerMin = HOUR_PX / 60;

  const isConflicted = (slot: Course['schedule'][number]) =>
    conflicts.some((c) => c.slotA === slot || c.slotB === slot);

  return (
    <View style={{ width }} className="gap-2">
      <View>
        <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {name}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Text
            className={`text-xs ${
              overLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {totalCredits} / {maxCredits} credits
          </Text>
          {conflicts.length > 0 && (
            <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <View className="flex-row border-b border-neutral-200 dark:border-neutral-800">
          <View style={{ width: GUTTER_WIDTH }} />
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={{ width: dayWidth }} className="items-center py-1">
              <Text className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-400">
                {DAY_LABELS[day].slice(0, 3).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row">
          <View style={{ width: GUTTER_WIDTH, height: bodyHeight }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((hour) => (
              <Text
                key={hour}
                className="absolute text-[8px] text-neutral-400 dark:text-neutral-500"
                style={{ top: (hour - START_HOUR) * HOUR_PX - 4, left: 2 }}
              >
                {hour}
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
                style={{ width: dayWidth, height: bodyHeight }}
                className="border-l border-neutral-100 dark:border-neutral-900"
              >
                {positioned.map((item) => {
                  const top = (item.start - START_HOUR * 60) * pxPerMin;
                  const height = Math.max((item.end - item.start) * pxPerMin - 1, 12);
                  const widthPct = 100 / item.columnCount;
                  const leftPct = item.column * widthPct;
                  return (
                    <EventBlock
                      // See ScheduleGrid.tsx's identical key — forces a
                      // fresh mount when column/columnCount changes so a
                      // surviving overlapping block never shows stale text.
                      key={`${item.key}-${item.column}-${item.columnCount}`}
                      course={item.data.course}
                      slot={item.data.slot}
                      color={colorFor(item.data.course.id)}
                      conflicted={isConflicted(item.data.slot)}
                      position={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
