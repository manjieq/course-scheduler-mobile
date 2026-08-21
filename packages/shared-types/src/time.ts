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
