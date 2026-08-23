// Phase 5 (see CLAUDE.md): "check cache before running full extraction
// where possible." Scan and Chat aren't symmetric here — Chat gets raw
// text where a course code is often already legible without any AI call at
// all, while Scan only has a photo, so at least one vision pass is
// unavoidable just to find out what course it might be. Two helpers,
// matched to what's actually possible on each path:
//   - findCachedCoursesFromText (Chat): try to skip the Gemini call
//     entirely on an obvious code match.
//   - overlayCachedFields (Scan): can't skip the vision pass, but a code
//     Gemini proposes that matches an already-confirmed catalog row is
//     more trustworthy than a fresh guess from a photo — overlay it.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { ExtractedCourseDraft } from './schema.ts';

interface CachedCourseTimeSlotRow {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  start_time: string;
  end_time: string;
}

interface CachedCourseRow {
  code: string;
  name: string;
  credits: number | string;
  instructor: string | null;
  course_time_slots: CachedCourseTimeSlotRow[];
}

function toDraft(row: CachedCourseRow): ExtractedCourseDraft {
  return {
    code: row.code, // the catalog's own casing/format, not whatever the caller typed — matters for confirm-course's exact-match upsert key
    name: row.name,
    credits: Number(row.credits),
    instructor: row.instructor ?? undefined,
    timeSlots: (row.course_time_slots ?? []).map((s) => ({
      day: s.day,
      start: s.start_time.slice(0, 5),
      end: s.end_time.slice(0, 5),
    })),
  };
}

// "LETTERS then DIGITS" is the seeded/confirmed convention for `courses.code`
// (e.g. "CS101" — see 0003_dev_seed.sql), so this looks for that shape
// loosely enough to catch "CS 101" / "cs-101" / "CS101" alike and
// normalizes every match to the no-space, upper-case form. Purely a
// heuristic pre-filter: a false-positive candidate (e.g. an unrelated
// "AT 3" fragment) just won't match any row and falls through to full
// extraction, so a bad guess here costs one wasted lookup, never a wrong
// result.
const COURSE_CODE_PATTERN = /\b([A-Za-z]{2,6})[\s-]?(\d{2,4}[A-Za-z]?)\b/g;

function extractCandidateCodes(text: string): string[] {
  const codes = new Set<string>();
  for (const match of text.matchAll(COURSE_CODE_PATTERN)) {
    codes.add(`${match[1].toUpperCase()}${match[2].toUpperCase()}`);
  }
  return [...codes];
}

async function fetchCachedRows(
  client: SupabaseClient,
  universityId: string,
  departmentId: string,
  codes: string[]
): Promise<CachedCourseRow[]> {
  if (codes.length === 0) return [];
  const { data, error } = await client
    .from('courses')
    .select('code, name, credits, instructor, course_time_slots(day, start_time, end_time)')
    .eq('university_id', universityId)
    .eq('department_id', departmentId)
    .in('code', codes);
  if (error) throw error;
  return data ?? [];
}

/**
 * Chat-path cache check, run before ever calling Gemini. Returns every
 * candidate code in the message that matches an existing catalog row for
 * the caller's resolved department, or `null` if none do (the caller
 * should fall through to full extraction in that case).
 *
 * Known limitation: this assumes one course per chat message, matching the
 * screen's own placeholder example — if a message names one already-cached
 * course *and* describes a second, brand-new one in the same breath, only
 * the cached course comes back and the new one is silently missed, since
 * finding a hit here skips the extraction pass that would have caught it.
 */
export async function findCachedCoursesFromText(
  client: SupabaseClient,
  universityId: string,
  departmentId: string,
  text: string
): Promise<ExtractedCourseDraft[] | null> {
  const candidates = extractCandidateCodes(text);
  const rows = await fetchCachedRows(client, universityId, departmentId, candidates);
  return rows.length > 0 ? rows.map(toDraft) : null;
}

/**
 * Scan-path overlay, run after Gemini's vision extraction. For each
 * extracted draft whose code matches an existing, previously-confirmed
 * catalog row, replaces the AI's guessed fields with the catalog's — a
 * human already confirmed those once, which beats a fresh per-photo guess.
 * Drafts with no cache hit pass through unchanged.
 */
export async function overlayCachedFields(
  client: SupabaseClient,
  universityId: string,
  departmentId: string,
  drafts: ExtractedCourseDraft[]
): Promise<ExtractedCourseDraft[]> {
  const codes = [...new Set(drafts.map((d) => d.code.toUpperCase()))];
  const rows = await fetchCachedRows(client, universityId, departmentId, codes);
  const cachedByCode = new Map(rows.map((row) => [row.code.toUpperCase(), toDraft(row)]));
  return drafts.map((draft) => cachedByCode.get(draft.code.toUpperCase()) ?? draft);
}
