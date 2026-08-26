# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

A full-stack, cross-platform mobile rebuild of `course-scheduler` (the
`ClaudeCodeTest` web prototype: React + Vite + localStorage, no backend).
This is a genuine rewrite, not a reskin — see `schedule-app-rebuild-brief.md`
in the old repo for the original request. **The old repo is untouched and
still runnable** (`npm run dev` in `ClaudeCodeTest`) — nothing here ever
deletes or restructures it; this is a brand-new, separate project by design
(the user asked to keep the web demo usable indefinitely).

## Tech stack (decided)

- **Language**: TypeScript everywhere — mobile app, Edge Functions, shared types.
- **Mobile**: Expo (React Native) + Expo Router, targeting iOS + Android.
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).
- **AI**: a vision-capable LLM with structured/JSON output for course
  extraction, behind a swappable provider interface in
  `apps/api/supabase/functions/_shared` — never hardcode to one provider,
  and never bundle the API key client-side (it lives in Supabase project
  secrets, used only inside Edge Functions). Functions live under
  `apps/api/supabase/functions/`, not `apps/api/functions/` — the Supabase
  CLI's `functions deploy` has a fixed convention (source must sit under
  `supabase/functions/` next to `supabase/config.toml`), so that's not
  optional the way most of this repo's layout is.
- **Monorepo**: pnpm workspaces + Turborepo.
- **Mobile styling**: NativeWind (Tailwind-style utility classes) — chosen
  as the closest mental model to the old repo's CSS Modules authoring
  style, without imposing a component-library design system on the
  custom schedule-grid layout.
- **State management**: `useReducer` + Context for the reducer/action
  semantics (ported from the prototype), paired with TanStack Query (or
  Supabase's hooks) for server sync — the prototype never had network
  calls, so this half is new, not a like-for-like port.

## Key mechanics ported from the prototype (preserve this behavior)

- **Cart vs. included, not the same thing.** `schedule_courses.included`
  is the DB equivalent of the prototype's `CartState.courseIds` (all rows)
  vs. `includedIds` (rows where `included = true`). Only an explicit
  toggle action lets them diverge — new adds default to included.
  `ScheduleGrid` and conflict detection always read the included subset.
- **Loadouts are immutable, point-in-time snapshots.** Saving copies the
  current included courses + a frozen `total_credits` into new
  `loadouts`/`loadout_courses` rows and never touches the live `schedules`
  row — no update path exists for `loadout_courses` once written. Loading
  a loadout upserts its courses back into the user's live `schedules` row.
- **Colors are assigned once, globally, per unfiltered working set.**
  `packages/shared-types/src/color.ts`'s `buildColorMap` must be built
  from the full department fetch (sorted by course code), not a filtered
  subset — look up by id everywhere (card, cart, grid, comparison). Don't
  build per-component color maps.
- **Conflict detection is a warning, not a block.** `findConflicts()` in
  `packages/shared-types/src/time.ts` is pairwise, on-demand, never
  persisted — there's no "resolve conflict" flow, just visual warnings.
- **Same-time overlaps still render side by side.**
  `packages/shared-types/src/layout.ts`'s `layoutOverlaps` does interval-
  graph column packing — separate from `findConflicts()`'s warning logic
  even though both detect overlaps.
- **University must be resolved before any AI extraction or catalog
  write (Gap 2).** Every Scan/Chat request and every `courses` write
  resolves `university_id` **server-side** from the authenticated
  caller's `profiles` row inside the Edge Function — never trust a
  client-supplied value. This is what makes the shared catalog's
  `(university_id, department_id, code)` uniqueness key safe. Onboarding
  (picking or self-serve-adding a university, written to
  `profiles.university_id`) is mandatory and gates every other screen
  until `onboarding_completed_at` is set.
- **New universities are pending_review until approved.** Self-serve-added
  universities are usable immediately by their creator but excluded from
  cross-user shared-catalog reuse until an admin approves them — avoids
  duplicate/typo schools polluting the catalog.
- **AI output never auto-saves.** Both Scan and Chat converge on one
  shared review/edit confirm screen; only an explicit user Confirm writes
  to `courses`. This holds even on a shared-catalog cache hit — the
  user's own record of taking the course still needs their confirmation.
- **Corrections propagate, with an audit trail.** Editing a shared
  `courses` row updates it in place (affecting everyone referencing it)
  and logs to `course_corrections` — no per-user forking/versioning in v1.

## Coding conventions

- Reuse `packages/shared-types` for any logic that's pure and
  framework-free (color, time/conflict, layout, credits) — these ported
  near-verbatim from the prototype and are the one place both
  `apps/mobile` and `apps/api` should share code, not reimplement it.
- Keep the reducer/action-semantics shape (`ADD_TO_CART`,
  `TOGGLE_INCLUDED`, `SAVE_LOADOUT`, `LOAD_LOADOUT`, etc.) 1:1 with the
  prototype's `appReducer.ts` where the brief doesn't require a change —
  only the persistence layer underneath changes (Postgres write-through
  instead of memory + localStorage).
- RLS policies are the enforcement boundary for ownership
  (`profiles`/`schedules`/`loadouts` scoped to `auth.uid()`) and for
  catalog integrity (`courses` is public-read, Edge-Function-only write)
  — don't add client-side-only checks as a substitute for RLS.
- Single-purpose commits, pushed after meaningful changes, same as the
  old repo's workflow — this repo has its own GitHub remote, separate
  from `ClaudeCodeTest`'s.

## Phase plan (agreed)

1. **Scaffold** — monorepo, Expo Router shell (incl. onboarding route),
   port `packages/shared-types` with unit tests. ✅ done.
2. **Supabase schema + Auth + onboarding** — provision
   `apps/api/supabase/migrations/0001_init.sql`, wire Auth, build the
   university search/self-serve-add screen and its routing gate. ✅ done
   (email + password auth rather than magic-link/OTP — sidesteps needing
   custom SMTP configured just to test locally; `0002_grants.sql` adds
   base table grants this Supabase project didn't come with by default;
   see git history for both if either needs revisiting).
3. **Port Courses/Cart/Schedule/Loadouts** onto Postgres-backed data,
   using small hand-seeded dev fixture courses (incl. one deliberately
   overlapping pair, carrying forward the prototype's convention) since
   AI extraction doesn't exist yet. ✅ done (the initial port landed the
   four screens on Postgres-backed data; a follow-up layout-redesign
   pass then reworked the navigation based on user feedback that the
   original layout made toggling a course's included state — needed to
   build a new loadout — require switching to the Courses tab to reach
   the Cart sheet, the only place that write existed. Fix: a persistent
   header with the cart reachable from every tab instead of only
   Courses; Loadouts split into its own tab instead of living at the
   bottom of Schedule, with its save form moved to the Schedule tab
   next to the schedule it saves; and a tap-to-toggle included-courses
   chip strip on Schedule so a course can be unticked without switching
   tabs or opening the cart at all. Also added a landscape side-by-side
   loadout-comparison view. Designed first as a Claude Design canvas
   mockup, iterated on with the user, then implemented; see git history
   around the "layout redesign" commits for the mockup link and the
   device-testing fixups that followed — a stale-EventBlock-text bug on
   the schedule grid, and extra dev-seed courses to exercise the
   credit-overcap warning).
4. **AI extraction pipeline** (Scan + Chat) — swappable provider
   interface, server-side university resolution, shared confirm/edit
   review screen. ✅ done (provider interface + a Gemini implementation as
   the first concrete provider — picked for its genuine free tier, unlike
   Anthropic/OpenAI's one-time trial credit only; `extract-course-scan` and
   `extract-course-chat` return unsaved drafts, `confirm-course` — added
   beyond the Phase 1 scaffold's two named functions — is the only thing
   that writes to `courses`, upserting on `(university_id, department_id,
   code)` with a `course_corrections` audit trail on edits to an existing
   row. `app/confirm-courses.tsx` is the shared review/edit screen both
   input paths land on; category is always a manual pick there since a
   listing photo doesn't reveal major-core vs. general-elective for a given
   student. Edge Functions live under `apps/api/supabase/functions/`, not
   the scaffold's original `apps/api/functions/` — moved to match the
   Supabase CLI's fixed `functions deploy` convention; see this tech
   stack's AI bullet. Real-device testing surfaced and fixed several
   things beyond the core pipeline: Gemini 3.x's default "medium" thinking
   added latency this task doesn't need (`thinkingLevel: 'low'` + a 35s
   per-attempt timeout + one retry on 429/503 in `_shared/gemini-provider.ts`);
   a course with no extractable meeting time (async/TBD) used to fail
   *the entire batch's* validation over just itself (`timeSlots` is no
   longer `.min(1)`); and two gaps that predate Phase 4 but only bite a
   self-serve (non-seeded) university — no way to ever add a department
   (`0005`/`0006` add a self-serve insert policy + grant, `courses.tsx`'s
   "+ Add a department" form), and `universities.max_credits_per_semester`
   silently defaulting to 18 with no way to correct it (`0007`/`0008` let
   the university's own user edit its cap and short name while still
   `pending_review`, surfaced in the Cart sheet — see the note under Phase
   5 about that not really being the right long-term home for it). Also
   fixed while testing on a real device, unrelated to AI extraction itself:
   `ScheduleGrid`'s hour range and day-column width are now both computed
   from actual available space (see `computeScheduleHourRange` in
   `packages/shared-types/src/time.ts`) instead of a fixed 8am-5pm /
   fixed-width layout, so a night class isn't cut off and all 5 days fit
   without scrolling sideways on a typical phone. See git history for the
   fuller debugging trail — a Gemini "model overloaded" 503 and a genuine
   160s+ platform-timeout hang look identical from the client's error
   message alone if you're not also checking the Edge Function's own logs).
5. **Shared catalog + caching** — write confirmed courses keyed by
   `(university_id, department_id, code)`; check cache before running
   full extraction where possible. Also now scoped to include: a **Settings
   screen** (a header icon button opening a modal, like Scan/Chat) — Sign
   out (currently sitting in `courses.tsx` as an explicitly-labeled
   temporary Phase 2 affordance), the university credit-cap/short-name
   self-serve edits (moved out of the Cart sheet, which should stay
   focused on the actual course selection), and a spot for Phase 6's
   theming toggle once that exists. ✅ done (the catalog-write half landed
   as a side effect of Phase 4's `confirm-course` upsert; this phase added
   the actual cache check, in `_shared/catalog-cache.ts` — Chat's regex
   pre-filter can skip the Gemini call entirely on an obvious course-code
   match in the caller's own text, while Scan can't skip the vision pass
   but overlays a code match's already-confirmed catalog fields over the
   AI's fresh per-photo guess. `app/settings.tsx` is the promised Settings
   modal, moving Sign out and the university self-serve edit fields out of
   Courses/CartSheet. Testing this surfaced two more real gaps, fixed
   alongside it: the landscape loadout-comparison grid
   (`ComparisonPanel.tsx`) had the same fixed-hour-range/fixed-row-height
   bug `ScheduleGrid` was fixed for in Phase 4 — ported the same
   `computeScheduleHourRange` + measured-shrink-to-fit approach, plus a
   comparison-specific addition (one shared hour range *and* day-column
   set computed across all compared loadouts at once, not per panel, so
   two panels' axes stay aligned rather than drifting independently); and
   weekend meeting times turned out to be silently unsupported everywhere
   — rejected by `course_time_slots.day`'s DB check constraint,
   unrepresentable in the shared `DayOfWeek` type, constrained out of
   Gemini's extraction schema, and unselectable in the confirm screen's
   day picker. `0009_weekend_days.sql` plus a widened
   `DayOfWeek`/`DAYS_OF_WEEK` and a new `computeScheduleDays()` — mirroring
   `computeScheduleHourRange`'s "only render what's actually used"
   pattern, so a Mon-Fri-only schedule keeps its narrower layout — close
   that gap end to end. See git history around the Phase 5 commits for the
   fuller detail.)
6. **Polish** — theming, empty/error states, comparison-view refinement.
   ✅ done (theming landed first as a per-user override on top of
   NativeWind's OS-driven `dark:` classes — see `lib/theme.ts`. Empty
   states turned out to already be in decent shape everywhere; the real
   gap was error states — Scan/Chat/Confirm already `Alert.alert`'d on
   failure, but every other query and mutation in the app failed silently
   (a failed add-to-cart or loadout save just did nothing; a failed
   departments/courses/loadouts fetch rendered indistinguishably from a
   real empty state). `lib/errors.ts`'s `getErrorMessage()` and
   `components/common/ErrorState.tsx` close that gap consistently across
   Courses/Schedule/Loadouts and the Settings edits. Comparison-view
   refinement was scoped with the user into three things:
   `packages/shared-types/src/compare.ts`'s `sharedCourseIds()` now drives
   a dashed-outline "differs from the rest" treatment in both comparison
   views; the portrait Loadouts tab's `LoadoutComparisonView` switched from
   stacking full `ScheduleGrid`s vertically (never actually side by side)
   to reusing landscape's compact `ComparisonPanel` in a horizontal row, so
   portrait gets a real side-by-side without rotating; and comparison is
   now capped at 4 loadouts at once (`MAX_COMPARE`), since panels stop
   being readable past that regardless of orientation. See git history
   around the Phase 6 commits for the fuller detail.)
7. **Testing hardening + EAS build prep**. ✅ config/coverage work done;
   the actual EAS account link is the one piece left, and it's the user's
   to do (scoped together, see below for why). `apps/mobile` had zero
   automated tests and no framework at all — `jest-expo` +
   `@testing-library/react-native` are now wired up via `package.json`'s
   own `"jest"` block, with four representative tests (a pure lib
   function, a simple component, one with conditional styling, one with
   a real empty-state branch) establishing the pattern rather than
   chasing full coverage. `apps/api/tests/rls.test.ts` (the ownership-
   boundary suite from Phase 6) had known gaps — `departments`' self-serve
   insert policy, `course_time_slots`/`course_corrections`' public-read-
   no-direct-write boundary, and several untested delete/update paths
   (`schedule_courses`, `loadouts`, `loadout_courses`, `schedules`) — all
   closed. EAS build prep: `app.json` had Expo's scaffold defaults (name/
   slug `"mobile"`, no bundle identifier) — renamed to "Course Scheduler"
   with a placeholder `com.coursescheduler.app` bundle id/package (a real
   reverse-DNS identifier is a domain decision, not something to invent —
   replace before any real store submission), plus `expo-image-picker`
   permission strings and an `expo-splash-screen` config wiring up the
   already-on-disk-but-previously-unreferenced splash asset (still stock
   template artwork — real branded icon/splash is a separate design task).
   `eas.json` is new, with per-profile `environment` fields pointing at
   EAS-dashboard-managed Environments rather than committing real
   `EXPO_PUBLIC_*` values to a file that ships in git. Running
   `npx expo-doctor` as part of verifying this also surfaced two real
   peer-dependency gaps (`expo-constants`, `react-native-worklets`) that
   would have crashed the app outside Expo Go — fixed alongside the config
   work since they're exactly what EAS build prep exists to catch. Linking
   an actual EAS project (`eas login` / `eas init`, which populates
   `extra.eas.projectId`) needs the user's own interactive Expo account
   login — left as a documented handoff rather than attempted. Verifying
   the RLS additions surfaced two pre-existing, unrelated CI breaks (both
   predating this phase, from a pnpm version bump): `.github/workflows/
   ci.yml` had `node-version: 20` while `pnpm@11.22.0` requires Node
   ≥22.13 — every job failed before `pnpm install` could even run — and
   separately, `supabase status -o env`'s quoted output was landing in
   `$GITHUB_ENV` with the literal quote characters still attached
   (`$GITHUB_ENV` doesn't strip them the way a sourcing shell would),
   making `API_URL` an invalid URL to `@supabase/supabase-js`. Both fixed;
   see git history around the Phase 7 commits for the fuller trail — this
   is also why the RLS additions above could only be verified via CI
   rather than locally (no Docker in this environment, and the local
   Supabase stack needs it).

Each phase has a concrete checkpoint — see the approved plan this repo
was scaffolded from for the full detail if needed.
