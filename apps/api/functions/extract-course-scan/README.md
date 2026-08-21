# extract-course-scan (Phase 4)

Accepts a photo of a course listing, resolves `university_id` **server-side**
from the authenticated caller's `profiles` row (never a client-supplied
value — see CLAUDE.md's Gap 2 notes), calls the vision LLM via
`_shared`'s provider interface, validates the structured output, and
returns it unsaved for the mobile app's confirm/edit review screen.
Nothing here writes to `courses` — only the user's explicit Confirm does
that (Phase 5's cache-hit short-circuit also lands here).
