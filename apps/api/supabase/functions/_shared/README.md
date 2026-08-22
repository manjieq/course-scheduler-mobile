# Shared Edge Function code

Common code for `extract-course-scan`, `extract-course-chat`, and
`confirm-course`:

- **`provider.ts`** — the swappable vision-LLM provider interface
  (`VisionExtractionProvider`). `gemini-provider.ts` is the first concrete
  implementation (see below); a future provider implements the same
  interface and gets swapped in at each extract-* function's call site —
  never hardcode a caller to one provider (see CLAUDE.md).
- **`gemini-provider.ts`** — calls Google Gemini's `generateContent` REST
  endpoint directly via `fetch`, using `responseSchema` to force structured
  JSON output. Picked as the first provider because Gemini has a genuine
  free API tier (unlike Anthropic/OpenAI, which only offer one-time trial
  credit) — useful while iterating against real portal screenshots at no
  cost. **Requires the `GEMINI_API_KEY` project secret** (see below).
- **`schema.ts`** — `zod` validators for the extraction/confirm request and
  response shapes. Deliberately *not* imported from
  `packages/shared-types/src/extraction.ts` even though the shapes match:
  that package's extension-less relative imports (`./models`) aren't
  Deno-resolvable, so this is a hand-kept-in-sync Deno-local mirror, same as
  `corrections.ts` below.
- **`auth.ts`** — `getAuthedUser` (user-scoped client + caller identity from
  the request's JWT) and `getServiceRoleClient` (privileged client, used
  only by `confirm-course`'s catalog writes).
- **`university.ts`** — `resolveUniversityAndDepartment`: reads the
  caller's own `profiles` row server-side. Every extraction and catalog
  write request resolves both ids this way — never from client input (Gap 2
  in CLAUDE.md, extended from university-only to department too, since
  `courses` is keyed by `(university_id, department_id, code)`).
- **`corrections.ts`** — Deno-local mirror of
  `packages/shared-types/src/corrections.ts`'s `diffCourseFields`, for the
  same reason as `schema.ts`. The shared-types version is the canonical,
  unit-tested one; this is what actually runs in `confirm-course`.
- **`cors.ts`** — preflight/response headers. Expo's native fetch isn't a
  browser, so this isn't load-bearing for the mobile app, but it keeps the
  functions testable from Supabase Studio / curl.

## Required secret

```
supabase secrets set GEMINI_API_KEY=<your Google AI Studio key>
```

Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey).
This is the user's own responsibility to provision (never bundled
client-side, never hardcoded) — see the original brief's "I'll supply the
API key."
