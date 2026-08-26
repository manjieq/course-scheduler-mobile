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

Computes the correction diff in TS (`_shared/corrections.ts`), then commits
everything in one call to the `confirm_course_write()` Postgres function
(`0010_confirm_course_atomic.sql`) so the upsert, the correction log, and
the full `course_time_slots` replace all happen in a single transaction —
either all of it lands or none of it does:
- New code → insert, `source: 'ai_extracted'`, `confirmed_by` set to the
  caller.
- Existing code → update in place and log one `course_corrections` row per
  changed field (see CLAUDE.md: "Corrections propagate, with an audit
  trail" — no per-user forking/versioning in v1).
- Either way, that course's `course_time_slots` are replaced wholesale (the
  confirm screen always submits the full current set, not a delta) — this
  used to be a separate delete-then-insert pair of calls from the function
  itself, which could leave a course with zero meeting times if the insert
  failed right after the delete succeeded; now it's atomic with the rest of
  the write.

Returns `{ courseId, wasCorrection }` so the client can toast accordingly,
then adds `courseId` to the user's live schedule via the existing
`useCartMutations(scheduleId).addToCart` — confirming an extracted course
is supposed to land it on your schedule, not just in the catalog.
