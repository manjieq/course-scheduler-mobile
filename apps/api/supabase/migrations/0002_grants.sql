-- Base table grants for PostgREST's API roles.
--
-- This project's public schema didn't come with Supabase's usual default
-- grants to anon/authenticated/service_role, so every table from
-- 0001_init.sql returned "permission denied" (Postgres error 42501) even for
-- service_role, which should have full access. This is a plain GRANT
-- problem, distinct from Row Level Security: RLS only filters rows on top
-- of a base table privilege that must already exist — an RLS policy can't
-- unlock access the underlying role was never granted at all.
--
-- Every table below still relies on the RLS policies in 0001_init.sql for
-- row-level scoping; these grants only unlock the table-level access those
-- policies are meant to filter.

grant usage on schema public to anon, authenticated, service_role;

-- Public read-only / shared-catalog tables (see CLAUDE.md: courses etc. are
-- public-read, Edge-Function-only write).
grant select on universities, departments, courses, course_time_slots, course_corrections
  to anon, authenticated;

-- Self-serve university add: RLS still restricts inserted rows to
-- status = 'pending_review' and created_by = auth.uid().
grant insert on universities to authenticated;

-- Client-writable, RLS-owner-scoped tables (profiles/schedules/loadouts).
grant select, insert, update, delete on profiles, schedules, schedule_courses, loadouts, loadout_courses
  to authenticated;

-- service_role (Edge Functions) needs full write access to everything it
-- manages server-side; the role's BYPASSRLS attribute skips policies, but
-- the base grant is still required for that access to exist at all.
grant select, insert, update, delete on
  universities, departments, courses, course_time_slots, course_corrections,
  profiles, schedules, schedule_courses, loadouts, loadout_courses
  to service_role;

-- Carry the same baseline forward automatically for tables added in later
-- migrations, so this doesn't need repeating per-phase.
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
