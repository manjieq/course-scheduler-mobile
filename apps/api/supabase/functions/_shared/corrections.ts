// Deno-local mirror of packages/shared-types/src/corrections.ts's
// diffCourseFields — same logic, hand-kept in sync, not imported directly
// for the same reason schema.ts/provider.ts aren't: that package's
// extension-less relative imports ('./models') aren't Deno-resolvable (see
// provider.ts's comment). The shared-types version stays the canonical,
// unit-tested reference; this is what confirm-course actually runs.

export interface CourseFieldSnapshot {
  name: string;
  credits: number;
  category: string;
  instructor?: string;
}

export interface CorrectionEntry {
  field: keyof CourseFieldSnapshot;
  oldValue: string;
  newValue: string;
}

function stringifyField(value: string | number | undefined): string {
  return value === undefined ? '' : String(value);
}

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
