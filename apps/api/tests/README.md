# RLS test suite

`rls.test.ts` proves the ownership boundary CLAUDE.md describes ("RLS
policies are the enforcement boundary for ownership ... don't add
client-side-only checks as a substitute for RLS") actually holds — by
signing up two real users and, using each one's own anon-key session
(never a service-role client, which would bypass RLS and prove nothing),
asserting that user B can't read, write, or impersonate anything user A
owns: `profiles`, `schedules`, `schedule_courses`, `loadouts`,
`loadout_courses`, the public-read-only shared catalog, and the
self-serve university add/edit flow's row- and column-level scoping
(0005–0008's migrations).

This is a separate `test:rls` script/task, not part of the repo's regular
`test` — it needs a real local Postgres + GoTrue + PostgREST stack
(Docker, via the Supabase CLI), not just a `vitest run` on pure
functions. See the `rls-tests` job in `.github/workflows/ci.yml` for how
CI runs it, or reproduce that locally:

```sh
cd apps/api
supabase start        # requires Docker Desktop (or another Docker engine) running
supabase db reset      # applies every migration, including the dev-seed fixture
supabase status -o env # copy API_URL and ANON_KEY from the output
API_URL=<...> ANON_KEY=<...> pnpm test:rls
supabase stop
```
