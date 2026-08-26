import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { DAY_LABELS, findConflicts, layoutOverlaps, toMinutes } from '@course-scheduler/shared-types';
import type { Course, DayOfWeek, LayoutInput } from '@course-scheduler/shared-types';

import { EventBlock } from '../schedule/EventBlock';

const GUTTER_WIDTH = 26;
const DEFAULT_HOUR_PX = 26;
// Compact even at its default size compared to ScheduleGrid, so its floor
// is lower too (ScheduleGrid: 48 default / 28 min) — see the shrink math
// below, same idea as ScheduleGrid's MIN_HOUR_PX.
const MIN_HOUR_PX = 16;
// Rough height of the grid's own day-label row (py-1 padding + ~9px text)
// — subtracted from the available height below, same estimate-not-measure
// tradeoff as ScheduleGrid's HEADER_ROW_HEIGHT.
const DAY_HEADER_ROW_HEIGHT = 20;

interface ComparisonPanelProps {
  name: string;
  totalCredits: number;
  courses: Course[];
  maxCredits: number;
  colorFor: (courseId: string) => string;
  width: number;
  /** Shared across every panel being compared (see app/loadout-compare.tsx's computeScheduleHourRange/computeScheduleDays calls) so a night class or weekend meeting in one loadout doesn't leave the panels' axes misaligned with each other. */
  startHour: number;
  endHour: number;
  days: DayOfWeek[];
  /** This panel's total available height (name/credits block + grid), if known — see app/loadout-compare.tsx's measured panelsAreaHeight. Omit to always use DEFAULT_HOUR_PX. */
  maxHeight?: number;
  /** Course ids shared by every loadout in the current comparison (see packages/shared-types's sharedCourseIds) — anything in this panel's courses but not in this set gets EventBlock's dashed "differs" treatment. Omit (or pass an empty set) to skip highlighting entirely, e.g. when only one loadout is shown. */
  sharedCourseIds?: Set<string>;
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
//
// startHour/endHour/maxHeight follow the same fix ScheduleGrid got for the
// same underlying bug (see computeScheduleHourRange in
// packages/shared-types/src/time.ts): a fixed 8am-5pm/fixed-26px-per-hour
// grid cut off night classes and didn't shrink to fit, defeating the whole
// point of a side-by-side comparison if the user can't see a full schedule
// in either panel. Unlike ScheduleGrid, the hour range here comes from the
// parent rather than each panel computing its own — see loadout-compare.tsx
// — so two panels being compared share one time axis and a class at the
// same hour lines up vertically between them.
export function ComparisonPanel({
  name,
  totalCredits,
  courses,
  maxCredits,
  colorFor,
  width,
  startHour,
  endHour,
  days,
  maxHeight,
  sharedCourseIds,
}: ComparisonPanelProps) {
  const conflicts = findConflicts(courses);
  const overLimit = totalCredits > maxCredits;
  const dayWidth = Math.max((width - GUTTER_WIDTH) / days.length, 40);

  const [topHeight, setTopHeight] = useState(0);
  const handleTopLayout = (e: LayoutChangeEvent) => setTopHeight(e.nativeEvent.layout.height);

  const totalHours = endHour - startHour;
  const naturalBodyHeight = totalHours * DEFAULT_HOUR_PX;
  // Needs both the parent-measured maxHeight and this panel's own
  // self-measured header block before the shrink math means anything —
  // settles within a render or two, same two-stage measurement schedule.tsx
  // already does for the main Schedule tab's grid.
  const availableBodyHeight =
    maxHeight && topHeight ? Math.max(maxHeight - topHeight - DAY_HEADER_ROW_HEIGHT, 0) : undefined;
  const HOUR_PX =
    availableBodyHeight && naturalBodyHeight > availableBodyHeight
      ? Math.max(MIN_HOUR_PX, Math.floor(availableBodyHeight / totalHours))
      : DEFAULT_HOUR_PX;
  const pxPerMin = HOUR_PX / 60;
  const bodyHeight = totalHours * HOUR_PX;

  const isConflicted = (slot: Course['schedule'][number]) =>
    conflicts.some((c) => c.slotA === slot || c.slotB === slot);

  return (
    <View style={{ width }} className="gap-2">
      <View onLayout={handleTopLayout}>
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
          {days.map((day) => (
            <View key={day} style={{ width: dayWidth }} className="items-center py-1">
              <Text className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-400">
                {DAY_LABELS[day].slice(0, 3).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row">
          <View style={{ width: GUTTER_WIDTH, height: bodyHeight }}>
            {Array.from({ length: totalHours + 1 }, (_, i) => startHour + i).map((hour) => (
              <Text
                key={hour}
                className="absolute text-[8px] text-neutral-400 dark:text-neutral-500"
                style={{ top: (hour - startHour) * HOUR_PX - 4, left: 2 }}
              >
                {hour}
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
                style={{ width: dayWidth, height: bodyHeight }}
                className="border-l border-neutral-100 dark:border-neutral-900"
              >
                {positioned.map((item) => {
                  const top = (item.start - startHour * 60) * pxPerMin;
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
                      differs={sharedCourseIds ? !sharedCourseIds.has(item.data.course.id) : false}
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
