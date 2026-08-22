-- Lets a self-serve university's own user correct its credits-per-semester
-- cap (surfaced after a real case: a self-serve-added university silently
-- kept the `universities.max_credits_per_semester` column default of 18,
-- which was wrong for that school). Scoped like
-- 0005_departments_self_serve_insert.sql: only the caller's own university
-- (read from their own `profiles` row, never client-supplied), and only
-- while it's still `pending_review` — an approved/curated university's cap
-- shouldn't be editable by an arbitrary one of its users.
--
-- Column-level grant, not a whole-row one: RLS restricts which *rows* this
-- policy applies to, not which *columns* — without scoping the grant too,
-- a self-serve university's own user could otherwise rename their school
-- or flip its status via the same policy. See 0002_grants.sql's note that
-- RLS and base grants are two separate layers.
create policy "universities_owner_update_credit_cap" on universities
  for update using (
    status = 'pending_review'
    and id = (select university_id from profiles where id = auth.uid())
  )
  with check (
    status = 'pending_review'
    and id = (select university_id from profiles where id = auth.uid())
  );

grant update (max_credits_per_semester) on universities to authenticated;
