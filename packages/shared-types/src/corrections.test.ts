import { describe, expect, it } from 'vitest';
import { diffCourseFields } from './corrections';
import type { CourseFieldSnapshot } from './corrections';

function snapshot(overrides: Partial<CourseFieldSnapshot> = {}): CourseFieldSnapshot {
  return { name: 'Intro to Algorithms', credits: 3, category: 'core', instructor: 'Dr. Lee', ...overrides };
}

describe('diffCourseFields', () => {
  it('returns nothing when the rows match', () => {
    expect(diffCourseFields(snapshot(), snapshot())).toEqual([]);
  });

  it('reports one entry per changed field', () => {
    const entries = diffCourseFields(snapshot(), snapshot({ credits: 4, instructor: 'Dr. Patel' }));
    expect(entries).toEqual([
      { field: 'credits', oldValue: '3', newValue: '4' },
      { field: 'instructor', oldValue: 'Dr. Lee', newValue: 'Dr. Patel' },
    ]);
  });

  it('treats a cleared optional field as a change to empty string', () => {
    const entries = diffCourseFields(snapshot(), snapshot({ instructor: undefined }));
    expect(entries).toEqual([{ field: 'instructor', oldValue: 'Dr. Lee', newValue: '' }]);
  });

  it('detects a category correction', () => {
    const entries = diffCourseFields(snapshot(), snapshot({ category: 'elective' }));
    expect(entries).toEqual([{ field: 'category', oldValue: 'core', newValue: 'elective' }]);
  });
});
