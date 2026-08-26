import { describe, expect, it } from 'vitest';
import { sharedCourseIds } from './compare';

describe('sharedCourseIds', () => {
  it('returns an empty set for fewer than two groups', () => {
    expect(sharedCourseIds([])).toEqual(new Set());
    expect(sharedCourseIds([['a', 'b']])).toEqual(new Set());
  });

  it('returns the intersection across all groups', () => {
    const result = sharedCourseIds([
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
      ['c', 'e'],
    ]);
    expect(result).toEqual(new Set(['c']));
  });

  it('returns an empty set when nothing is common to every group', () => {
    expect(sharedCourseIds([['a'], ['b']])).toEqual(new Set());
  });

  it('returns every id when all groups are identical', () => {
    expect(sharedCourseIds([['a', 'b'], ['a', 'b']])).toEqual(new Set(['a', 'b']));
  });
});
