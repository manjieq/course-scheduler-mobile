# confirm-course

The only function that writes to the shared `courses` catalog. Called by
`app/confirm-courses.tsx` after the user reviews/edits an extracted draft
and taps Confirm — not part of the original Phase 1 scaffold's two named
functions, added in Phase 4 because `courses`/`course_time_slots` are
public-read, Edge-Function-only write (RLS in `0001_init.sql`), so the
confirm step needs a server endpoint to actually perform.

Accepts one `{ code, name, credits, category, instructor?, timeSlots }`
draft (`category` is the one field the AI never fills in — see
`_shared/README.md`). Re-resolves university/department server-side, same
as the extract-* functions, even though the client just received them a
moment ago.

Upserts on `(university_id, department_id, code)`:
- New code → insert, `source: 'ai_extracted'`, `confirmed_by` set to the
  caller.
- Existing code → update in place and log one `course_corrections` row per
  changed field (see CLAUDE.md: "Corrections propagate, with an audit
  trail" — no per-user forking/versioning in v1).

Then replaces that course's `course_time_slots` wholesale (the confirm
screen always submits the full current set, not a delta).

Returns `{ courseId, wasCorrection }` so the client can toast accordingly,
then adds `courseId` to the user's live schedule via the existing
`useCartMutations(scheduleId).addToCart` — confirming an extracted course
is supposed to land it on your schedule, not just in the catalog.
