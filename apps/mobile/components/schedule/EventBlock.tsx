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
}

export function EventBlock({ course, slot, color, conflicted, position }: EventBlockProps) {
  const textColor = getContrastText(color);
  return (
    <View
      className={`absolute overflow-hidden rounded-md px-1.5 py-1 ${conflicted ? 'border-2 border-red-500' : ''}`}
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
