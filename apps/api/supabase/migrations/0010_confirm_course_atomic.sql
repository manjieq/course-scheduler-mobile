-- Fixes a data-integrity gap in confirm-course/index.ts: it used to write
-- a course row, then (on a correction) log to course_corrections, then
-- delete all of that course's existing time slots and insert the new set
-- - four separate PostgREST calls from the Edge Function, none of them
-- transactional with each other. If the time-slot insert failed after the
-- delete had already succeeded (a validation error, a dropped connection,
-- a Supabase hiccup), the course silently ended up with zero meeting
-- times - worse than before Confirm was pressed, with no way to recover
-- short of re-running the whole flow. Wrapping the write in one plpgsql
-- function makes it atomic: a single function invocation is a single
-- transaction, so either the course row, its correction log entries, and
-- its full set of time slots all land together, or (on any error) none of
-- them do and the course is left exactly as it was.
--
-- The correction diff itself deliberately stays out of this function -
-- packages/shared-types's diffCourseFields (mirrored for Deno in
-- apps/api/supabase/functions/_shared/corrections.ts) is unit-tested and
-- also drives the confirm-courses.tsx review screen, so it isn't worth
-- reimplementing in SQL. This function only takes the already-computed
-- correction entries and commits everything else atomically.
create or replace function confirm_course_write(
  p_university_id uuid,
  p_department_id uuid,
  p_code text,
  p_name text,
  p_credits numeric,
  p_category text,
  p_instructor text,
  p_confirmed_by uuid,
  p_corrections jsonb, -- [{ "field", "old_value", "new_value" }, ...]
  p_time_slots jsonb   -- [{ "day", "start", "end" }, ...] ("HH:MM" strings)
)
returns table (course_id uuid, was_insert boolean)
language plpgsql
as $$
declare
  v_course_id uuid;
  v_was_insert boolean;
begin
  select id into v_course_id
  from courses
  where university_id = p_university_id
    and department_id = p_department_id
    and code = p_code;

  if v_course_id is null then
    insert into courses (
      university_id, department_id, code, name, credits, category, instructor, source, confirmed_by
    )
    values (
      p_university_id, p_department_id, p_code, p_name, p_credits, p_category, p_instructor,
      'ai_extracted', p_confirmed_by
    )
    returning id into v_course_id;
    v_was_insert := true;
  else
    v_was_insert := false;
    -- Only touch the row (and bump updated_at) when the caller's diff
    -- actually found a change — matches the pre-atomic behavior, where a
    -- no-op re-confirm of an already-matching course never wrote to
    -- `courses` at all. p_corrections is the source of truth for "did
    -- anything change", computed once by diffCourseFields in TS.
    if jsonb_array_length(p_corrections) > 0 then
      update courses
      set name = p_name,
          credits = p_credits,
          category = p_category,
          instructor = p_instructor,
          updated_at = now()
      where id = v_course_id;
    end if;
  end if;

  if jsonb_array_length(p_corrections) > 0 then
    insert into course_corrections (course_id, corrected_by, field, old_value, new_value)
    select v_course_id, p_confirmed_by, entry->>'field', entry->>'old_value', entry->>'new_value'
    from jsonb_array_elements(p_corrections) as entry;
  end if;

  -- Replace this course's meeting times wholesale rather than diffing -
  -- the confirm screen always submits the full current set of slots, not
  -- a delta. Both statements below now run inside the same transaction as
  -- the course write above, which is the actual fix: previously this
  -- delete and insert were two separate calls from the Edge Function.
  delete from course_time_slots where course_id = v_course_id;

  insert into course_time_slots (course_id, day, start_time, end_time)
  select v_course_id, entry->>'day', (entry->>'start')::time, (entry->>'end')::time
  from jsonb_array_elements(p_time_slots) as entry;

  return query select v_course_id, v_was_insert;
end;
$$;

-- Only confirm-course's service-role client calls this (see
-- _shared/auth.ts's getServiceRoleClient) - revoke the default PUBLIC
-- execute grant Postgres adds on function creation and grant explicitly to
-- service_role only, mirroring courses' own Edge-Function-only write
-- policy rather than leaving this callable by anon/authenticated.
revoke all on function confirm_course_write from public;
grant execute on function confirm_course_write to service_role;
