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
  `apps/api/functions/_shared` — never hardcode to one provider, and never
  bundle the API key client-side (it lives in Supabase project secrets,
  used only inside Edge Functions).
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
   university search/self-serve-add screen and its routing gate.
3. **Port Courses/Cart/Schedule/Loadouts** onto Postgres-backed data,
   using small hand-seeded dev fixture courses (incl. one deliberately
   overlapping pair, carrying forward the prototype's convention) since
   AI extraction doesn't exist yet.
4. **AI extraction pipeline** (Scan + Chat) — swappable provider
   interface, server-side university resolution, shared confirm/edit
   review screen.
5. **Shared catalog + caching** — write confirmed courses keyed by
   `(university_id, department_id, code)`; check cache before running
   full extraction where possible.
6. **Polish** — theming, empty/error states, comparison-view refinement.
7. **Testing hardening + EAS build prep**.

Each phase has a concrete checkpoint — see the approved plan this repo
was scaffolded from for the full detail if needed.
