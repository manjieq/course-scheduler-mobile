// Ported unchanged from the prototype's src/utils/credits.ts.
import type { Course } from './models';

export function sumCredits(courses: Course[]): number {
  return courses.reduce((total, c) => total + c.credits, 0);
}

export function isOverLimit(courses: Course[], maxCredits: number): boolean {
  return sumCredits(courses) > maxCredits;
}
