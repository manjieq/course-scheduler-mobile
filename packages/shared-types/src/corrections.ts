// Phase 4: pure diffing logic behind confirm-course's audit trail (see
// CLAUDE.md's "Corrections propagate, with an audit trail" — editing a
// shared `courses` row updates it in place and logs to `course_corrections`,
// one row per changed field). Kept here, not in the Edge Function, because
// it's pure and framework-free like the rest of packages/shared-types.

import type { CourseCategory } from './models';

/** The subset of a `courses` row that can be corrected via re-confirmation. */
export interface CourseFieldSnapshot {
  name: string;
  credits: number;
  category: CourseCategory;
  instructor?: string;
}

export interface CorrectionEntry {
  field: keyof CourseFieldSnapshot;
  oldValue: string;
  newValue: string;
}

/** Stringifies a field value the way `course_corrections.old_value`/`new_value` (text columns) store it. */
function stringifyField(value: string | number | undefined): string {
  return value === undefined ? '' : String(value);
}

/**
 * Compares an existing shared course against a freshly confirmed draft and
 * returns one entry per field that actually changed. Empty array means the
 * confirm is a no-op correction (the row already matched).
 */
export function diffCourseFields(oldRow: CourseFieldSnapshot, newRow: CourseFieldSnapshot): CorrectionEntry[] {
  const fields: (keyof CourseFieldSnapshot)[] = ['name', 'credits', 'category', 'instructor'];
  const entries: CorrectionEntry[] = [];

  for (const field of fields) {
    const oldValue = stringifyField(oldRow[field]);
    const newValue = stringifyField(newRow[field]);
    if (oldValue !== newValue) {
      entries.push({ field, oldValue, newValue });
    }
  }

  return entries;
}
