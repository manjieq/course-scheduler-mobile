import type { DimensionValue } from 'react-native';
import { Text, View } from 'react-native';

import { formatTime, getContrastText } from '@course-scheduler/shared-types';
import type { Course, TimeSlot } from '@course-scheduler/shared-types';

interface EventBlockPosition {
  top: number;
  height: number;
  left: DimensionValue;
  width: DimensionValue;
}

interface EventBlockProps {
  course: Course;
  slot: TimeSlot;
  color: string;
  conflicted: boolean;
  position: EventBlockPosition;
  /**
   * True when this course isn't shared by every loadout in the current
   * comparison (see packages/shared-types's sharedCourseIds) — drawn with a
   * dashed instead of solid border so a reader scanning ComparisonPanel's
   * grids can immediately spot what differs, without having to line up two
   * course lists by eye. Ignored outside a comparison context (ScheduleGrid
   * never passes it). conflicted still wins if a block is somehow both —
   * a real time clash is the more urgent thing to flag.
   */
  differs?: boolean;
}

export function EventBlock({ course, slot, color, conflicted, position, differs = false }: EventBlockProps) {
  const textColor = getContrastText(color);
  const borderClass = conflicted
    ? 'border-2 border-red-500'
    : differs
      ? 'border-2 border-dashed border-neutral-900 dark:border-neutral-50'
      : '';
  return (
    <View
      className={`absolute overflow-hidden rounded-md px-1.5 py-1 ${borderClass}`}
      style={{ ...position, backgroundColor: color }}
    >
      <Text style={{ color: textColor }} className="text-[11px] font-semibold" numberOfLines={1}>
        {course.code}
      </Text>
      <Text style={{ color: textColor }} className="text-[10px]" numberOfLines={1}>
        {formatTime(slot.start)}-{formatTime(slot.end)}
      </Text>
    </View>
  );
}
