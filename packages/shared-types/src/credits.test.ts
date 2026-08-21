import { describe, expect, it } from 'vitest';
import { isOverLimit, sumCredits } from './credits';
import type { Course } from './models';

function course(credits: number): Course {
  return { id: crypto.randomUUID(), departmentId: 'dept-1', code: 'X', name: 'X', credits, category: 'core', schedule: [] };
}

describe('sumCredits / isOverLimit', () => {
  it('sums to zero for an empty list', () => {
    expect(sumCredits([])).toBe(0);
  });

  it('sums credits across courses', () => {
    expect(sumCredits([course(3), course(4), course(2)])).toBe(9);
  });

  it('is over limit only when the sum strictly exceeds the cap', () => {
    const courses = [course(3), course(4), course(2)]; // 9 total
    expect(isOverLimit(courses, 9)).toBe(false);
    expect(isOverLimit(courses, 8)).toBe(true);
  });
});
