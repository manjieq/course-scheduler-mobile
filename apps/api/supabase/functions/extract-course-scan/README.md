# extract-course-scan

Accepts `{ imageBase64, mimeType }` (a photo of a course listing, base64
inline in the JSON body — no Supabase Storage involved, since nothing needs
the photo after extraction), resolves `university_id`/`department_id`
**server-side** from the authenticated caller's `profiles` row (never a
client-supplied value — see CLAUDE.md's Gap 2 notes), calls the vision LLM
via `_shared`'s provider interface, validates the structured output, and
returns `{ universityId, departmentId, courses }` unsaved for the mobile
app's confirm/edit review screen (`app/confirm-courses.tsx`).

Nothing here writes to `courses` — only `confirm-course`, called after the
user's explicit Confirm, does that. Phase 5's shared-catalog cache-hit
short-circuit (checking the catalog before calling the LLM at all) is not
built yet — every scan currently calls the provider.

Errors: 401 unauthenticated, 400 onboarding incomplete, 422 for anything
else (most often the provider's output failing schema validation) with the
underlying message included for debugging.
