import { describe, expect, it } from 'vitest';
import { courseHasConflict, findConflicts, formatTime, slotsOverlap, toMinutes } from './time';
import type { Course } from './models';

function course(id: string, code: string, schedule: Course['schedule']): Course {
  return { id, departmentId: 'dept-1', code, name: code, credits: 3, category: 'core', schedule };
}

describe('toMinutes / formatTime', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('formats 24h time into 12h AM/PM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('13:05')).toBe('1:05 PM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });
});

describe('slotsOverlap', () => {
  it('is false for different days even with the same time range', () => {
    expect(
      slotsOverlap({ day: 'MON', start: '09:00', end: '10:00' }, { day: 'TUE', start: '09:00', end: '10:00' }),
    ).toBe(false);
  });

  it('is true for overlapping ranges on the same day', () => {
    expect(
      slotsOverlap({ day: 'MON', start: '09:00', end: '10:30' }, { day: 'MON', start: '10:00', end: '11:00' }),
    ).toBe(true);
  });

  it('is false for back-to-back (touching but not overlapping) ranges', () => {
    expect(
      slotsOverlap({ day: 'MON', start: '09:00', end: '10:00' }, { day: 'MON', start: '10:00', end: '11:00' }),
    ).toBe(false);
  });
});

describe('findConflicts / courseHasConflict', () => {
  it('finds no conflicts among non-overlapping courses', () => {
    const a = course('a', 'CS101', [{ day: 'MON', start: '09:00', end: '10:00' }]);
    const b = course('b', 'CS102', [{ day: 'MON', start: '10:00', end: '11:00' }]);
    const c = course('c', 'CS103', [{ day: 'TUE', start: '09:00', end: '10:00' }]);

    const conflicts = findConflicts([a, b, c]);
    expect(conflicts).toHaveLength(0);
    expect(courseHasConflict(a, conflicts)).toBe(false);
  });

  it('finds exactly the overlapping pair among mixed courses', () => {
    const a = course('a', 'CS101', [{ day: 'MON', start: '09:00', end: '10:30' }]);
    const b = course('b', 'CS102', [{ day: 'MON', start: '10:00', end: '11:00' }]); // overlaps a
    const c = course('c', 'CS103', [{ day: 'WED', start: '09:00', end: '10:00' }]); // no overlap

    const conflicts = findConflicts([a, b, c]);
    expect(conflicts).toHaveLength(1);
    expect(new Set([conflicts[0].courseA.id, conflicts[0].courseB.id])).toEqual(new Set(['a', 'b']));
    expect(courseHasConflict(a, conflicts)).toBe(true);
    expect(courseHasConflict(b, conflicts)).toBe(true);
    expect(courseHasConflict(c, conflicts)).toBe(false);
  });
});
