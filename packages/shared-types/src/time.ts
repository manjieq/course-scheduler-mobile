// Ported unchanged from the prototype's src/utils/time.ts. Conflict detection
// stays a pure, on-demand computation (never persisted) and is a warning
// only, never a block on adding/including a course.
import type { Course, ConflictPair, TimeSlot } from './models';

/** Converts a "HH:MM" 24h string into minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Formats "HH:MM" (24h) into a friendlier "h:MM AM/PM" label. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function slotLabel(slot: TimeSlot): string {
  return `${slot.day} ${formatTime(slot.start)}-${formatTime(slot.end)}`;
}

/** True if two time slots fall on the same day and their intervals overlap. */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.day !== b.day) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/**
 * Pairwise-checks every meeting time of every course against every other course
 * and returns each overlapping pair found. O(n^2) over slots, which is fine at
 * the scale of a single semester's course list.
 */
export function findConflicts(courses: Course[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const courseA = courses[i];
      const courseB = courses[j];
      for (const slotA of courseA.schedule) {
        for (const slotB of courseB.schedule) {
          if (slotsOverlap(slotA, slotB)) {
            conflicts.push({ courseA, courseB, slotA, slotB });
          }
        }
      }
    }
  }
  return conflicts;
}

/** True if the given course has at least one slot conflicting with another course in the list. */
export function courseHasConflict(course: Course, conflicts: ConflictPair[]): boolean {
  return conflicts.some((c) => c.courseA.id === course.id || c.courseB.id === course.id);
}

export interface ScheduleHourRange {
  startHour: number;
  endHour: number;
}

/**
 * Derives the hour range a weekly schedule grid should render, so a night
 * class isn't cut off at a fixed 5pm boundary. Stays at the given defaults
 * (8am-5pm) whenever every course fits inside them — the padding only
 * kicks in once something actually runs later, rather than always adding
 * dead space to the common case.
 */
export function computeScheduleHourRange(
  courses: Course[],
  options: { defaultStartHour?: number; defaultEndHour?: number; endPaddingHours?: number } = {}
): ScheduleHourRange {
  const { defaultStartHour = 8, defaultEndHour = 17, endPaddingHours = 1 } = options;

  let earliestStartMin = defaultStartHour * 60;
  let latestEndMin = defaultEndHour * 60;
  for (const course of courses) {
    for (const slot of course.schedule) {
      earliestStartMin = Math.min(earliestStartMin, toMinutes(slot.start));
      latestEndMin = Math.max(latestEndMin, toMinutes(slot.end));
    }
  }

  const startHour = Math.floor(earliestStartMin / 60);
  const rawEndHour = Math.ceil(latestEndMin / 60);
  const endHour = rawEndHour <= defaultEndHour ? defaultEndHour : rawEndHour + endPaddingHours;

  return { startHour, endHour };
}
