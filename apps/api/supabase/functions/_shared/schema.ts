// Runtime validation of the provider's structured output before it ever
// reaches the client — an LLM's JSON, even schema-constrained, isn't
// trustworthy at compile time. Hand-kept in sync with
// packages/shared-types/src/extraction.ts's ExtractedCourseDraft/
// ExtractionResponse shape (same fields, same names) rather than imported
// from it: zod is an Edge-Function-only dependency resolved via Deno's
// npm: specifier at deploy time, and — separately — that package's
// extension-less internal imports aren't Deno-resolvable (see provider.ts's
// comment). ExtractionResponse below (derived via z.infer) is what the rest
// of _shared/ and both extract-course-* functions import as the canonical
// Deno-side type.

import { z } from 'npm:zod@3';

// Includes weekend days (see 0009_weekend_days.sql) — an uncommon but real
// case (weekend labs/electives) that used to be silently unsupported here:
// Gemini's structured output is constrained to whatever this enum allows,
// so a Saturday class in a real listing would have been forced into a
// weekday rather than rejected outright.
const DAY = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

// Accepts "9:00" as well as "09:00" — both the model and a manual edit on
// the confirm screen can produce an unpadded hour — but always normalizes
// to zero-padded 24h "HH:MM", since that's what the rest of the app
// (course_time_slots, packages/shared-types/src/time.ts) expects.
const TIME = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'expected 24h "HH:MM"')
  .transform((value) => {
    const [hour, minute] = value.split(':');
    return `${hour.padStart(2, '0')}:${minute}`;
  });

export const extractedTimeSlotSchema = z.object({
  day: DAY,
  start: TIME,
  end: TIME,
});

export const extractedCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  credits: z.number().positive(),
  instructor: z.string().min(1).optional(),
  // No .min(1) here: an async/self-paced/TBD-schedule course legitimately
  // has zero fixed weekly meeting times, and requiring at least one used to
  // fail validation for the *entire* batch over just one such course in it
  // — the confirm screen already lets the user add a slot manually if it
  // was actually just missed in the photo.
  timeSlots: z.array(extractedTimeSlotSchema),
});

export const extractionResponseSchema = z.object({
  courses: z.array(extractedCourseSchema).min(1),
});

export type ExtractedCourseDraft = z.infer<typeof extractedCourseSchema>;
export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

// confirm-course's request body: an extracted draft plus the one field the
// AI never fills in — category is a manual pick on the confirm screen (a
// listing photo doesn't reveal major-core vs. general-elective for a given
// student). Matches the `courses.category` check constraint in
// 0001_init.sql.
export const confirmCourseRequestSchema = extractedCourseSchema.extend({
  category: z.enum(['core', 'extended', 'compulsory', 'elective']),
});

export type ConfirmCourseRequest = z.infer<typeof confirmCourseRequestSchema>;
