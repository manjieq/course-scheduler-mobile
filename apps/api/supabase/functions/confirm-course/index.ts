// The only thing that actually writes to the shared `courses` catalog (see
// CLAUDE.md: "AI output never auto-saves... only an explicit user Confirm
// writes to courses"). Not part of the Phase 1 scaffold's two named
// functions — extract-course-scan/chat only ever return unsaved drafts, so
// this function is what the confirm/edit review screen's Confirm button
// actually calls.
//
// University/department are re-resolved server-side here too, even though
// the client just got them from the extract-* response a moment ago —
// never trust a client-supplied id for the write path (Gap 2, extended to
// department — see CLAUDE.md).
//
// The actual commit (course upsert + correction log + time-slot replace)
// happens in one call to the confirm_course_write() Postgres function
// (0010_confirm_course_atomic.sql), not as separate PostgREST calls —
// those used to be independent writes, so a failure partway through
// (e.g. the time-slot insert failing right after the old slots had
// already been deleted) could leave a course with zero meeting times.
// The function makes the whole thing one transaction: all of it lands or
// none of it does. The correction diff itself is still computed here in
// TS (see corrections.ts's comment on why) and passed in pre-computed.

import { diffCourseFields, type CourseFieldSnapshot } from '../_shared/corrections.ts';
import { getAuthedUser, getServiceRoleClient, UnauthenticatedError } from '../_shared/auth.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { confirmCourseRequestSchema } from '../_shared/schema.ts';
import { OnboardingIncompleteError, resolveUniversityAndDepartment } from '../_shared/university.ts';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { client, user } = await getAuthedUser(req);
    const { universityId, departmentId } = await resolveUniversityAndDepartment(client, user.id);

    const parseResult = confirmCourseRequestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return jsonResponse({ error: 'Invalid course draft', issues: parseResult.error.issues }, { status: 400 });
    }
    const draft = parseResult.data;

    const db = getServiceRoleClient();

    const { data: existing, error: selectError } = await db
      .from('courses')
      .select('id, name, credits, category, instructor')
      .eq('university_id', universityId)
      .eq('department_id', departmentId)
      .eq('code', draft.code)
      .maybeSingle();
    if (selectError) throw selectError;

    const newSnapshot: CourseFieldSnapshot = {
      name: draft.name,
      credits: draft.credits,
      category: draft.category,
      instructor: draft.instructor,
    };
    // A JS `undefined` gets silently dropped by JSON.stringify — fine for
    // diffCourseFields (it treats missing as "" either way), but wrong for
    // an actual insert/update payload: an omitted key leaves the existing
    // column untouched instead of clearing it. Row writes always send an
    // explicit `null` for "no instructor", never rely on key-dropping.
    const rowPayload = { ...newSnapshot, instructor: newSnapshot.instructor ?? null };

    const corrections = existing
      ? diffCourseFields(
          {
            name: existing.name,
            credits: Number(existing.credits),
            category: existing.category,
            instructor: existing.instructor ?? undefined,
          },
          newSnapshot
        )
      : [];
    const wasCorrection = corrections.length > 0;

    // Single atomic write — see confirm_course_write() in
    // 0010_confirm_course_atomic.sql for why this is one RPC call instead
    // of the four separate PostgREST calls (upsert course, log
    // corrections, delete old slots, insert new slots) this used to be.
    const { data: result, error: writeError } = await db
      .rpc('confirm_course_write', {
        p_university_id: universityId,
        p_department_id: departmentId,
        p_code: draft.code,
        p_name: rowPayload.name,
        p_credits: rowPayload.credits,
        p_category: rowPayload.category,
        p_instructor: rowPayload.instructor,
        p_confirmed_by: user.id,
        p_corrections: corrections.map((c) => ({ field: c.field, old_value: c.oldValue, new_value: c.newValue })),
        p_time_slots: draft.timeSlots.map((slot) => ({ day: slot.day, start: slot.start, end: slot.end })),
      })
      .single();
    if (writeError) throw writeError;

    const courseId = (result as { course_id: string }).course_id;

    return jsonResponse({ courseId, wasCorrection });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return jsonResponse({ error: err.message }, { status: 401 });
    }
    if (err instanceof OnboardingIncompleteError) {
      return jsonResponse({ error: err.message }, { status: 400 });
    }
    console.error('confirm-course failed', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Confirm failed' }, { status: 500 });
  }
});
