// Ported from the course-scheduler web prototype's src/types/index.ts.
// These are the shared domain shapes used by both the mobile app and the
// Edge Functions. DB rows get their own generated types via
// `supabase gen types typescript`; these are the app-level/logic shapes
// that mirror them (see CLAUDE.md's prototype -> new-stack mapping table).

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export const DAYS_OF_WEEK: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

/** A single weekly meeting time, e.g. Monday 09:00-10:30. */
export interface TimeSlot {
  day: DayOfWeek;
  /** 24h "HH:MM" */
  start: string;
  /** 24h "HH:MM" */
  end: string;
}

/**
 * core/extended -> major-specific courses, shown in the "Major Courses" list.
 * compulsory/elective -> general university-wide courses, shown in the "General Courses" list.
 */
export type CourseCategory = 'core' | 'extended' | 'compulsory' | 'elective';

export const CATEGORY_LABELS: Record<CourseCategory, string> = {
  core: 'Core Major',
  extended: 'Extended Major',
  compulsory: 'Compulsory',
  elective: 'Elective',
};

export interface University {
  id: string;
  name: string;
  shortName: string;
  /** Maximum total credits a student may schedule in one semester. */
  maxCreditsPerSemester: number;
}

export interface Department {
  id: string;
  universityId: string;
  code: string;
  name: string;
}

export interface Course {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  credits: number;
  category: CourseCategory;
  instructor?: string;
  schedule: TimeSlot[];
}

/** courseIds = everything added to the cart. includedIds = the ticked subset actually rendered in the schedule. */
export interface CartState {
  courseIds: string[];
  includedIds: string[];
}

/** A named, saved snapshot of a course combination the user can compare against others. */
export interface Loadout {
  id: string;
  name: string;
  universityId: string;
  departmentId: string;
  courseIds: string[];
  totalCredits: number;
  createdAt: string;
}

export interface ConflictPair {
  courseA: Course;
  courseB: Course;
  slotA: TimeSlot;
  slotB: TimeSlot;
}
