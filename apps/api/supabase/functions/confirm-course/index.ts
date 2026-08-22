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

    let courseId: string;
    let wasCorrection = false;

    if (existing) {
      courseId = existing.id;
      const oldSnapshot: CourseFieldSnapshot = {
        name: existing.name,
        credits: Number(existing.credits),
        category: existing.category,
        instructor: existing.instructor ?? undefined,
      };
      const corrections = diffCourseFields(oldSnapshot, newSnapshot);
      wasCorrection = corrections.length > 0;

      if (wasCorrection) {
        const { error: updateError } = await db
          .from('courses')
          .update({ ...rowPayload, updated_at: new Date().toISOString() })
          .eq('id', courseId);
        if (updateError) throw updateError;

        const { error: logError } = await db.from('course_corrections').insert(
          corrections.map((c) => ({
            course_id: courseId,
            corrected_by: user.id,
            field: c.field,
            old_value: c.oldValue,
            new_value: c.newValue,
          }))
        );
        if (logError) throw logError;
      }
    } else {
      const { data: inserted, error: insertError } = await db
        .from('courses')
        .insert({
          university_id: universityId,
          department_id: departmentId,
          code: draft.code,
          ...rowPayload,
          source: 'ai_extracted',
          confirmed_by: user.id,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      courseId = inserted.id;
    }

    // Replace this course's meeting times wholesale rather than diffing —
    // simpler and correct either way, since the confirm screen always
    // submits the full current set of slots, not a delta.
    const { error: deleteSlotsError } = await db.from('course_time_slots').delete().eq('course_id', courseId);
    if (deleteSlotsError) throw deleteSlotsError;

    const { error: insertSlotsError } = await db.from('course_time_slots').insert(
      draft.timeSlots.map((slot) => ({
        course_id: courseId,
        day: slot.day,
        start_time: slot.start,
        end_time: slot.end,
      }))
    );
    if (insertSlotsError) throw insertSlotsError;

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
