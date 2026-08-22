-- Self-serve department creation. Fixes a gap that predates Phase 4: a
-- self-serve-added university (see 0001_init.sql's universities_self_serve_
-- insert) starts with zero departments and, until now, had no way to ever
-- get one — `departments` was public-read with no insert policy at all, so
-- a user on a non-seeded university was permanently stuck with an empty
-- department list (which also blocks Courses/Cart/Schedule, not just the
-- Phase 4 AI extraction flow that surfaced it).
--
-- Mirrors universities_self_serve_insert's shape: open to any authenticated
-- user, but scoped so they can only add a department to their own
-- university (read from their own `profiles` row, not a client-supplied
-- id) — can't seed departments into a school they don't belong to. No
-- pending_review/approval step like universities get, since a department
-- is just a (code, name) pair with no shared-catalog trust implications the
-- way `courses` has.
create policy "departments_self_serve_insert" on departments
  for insert with check (
    university_id = (select university_id from profiles where id = auth.uid())
  );
