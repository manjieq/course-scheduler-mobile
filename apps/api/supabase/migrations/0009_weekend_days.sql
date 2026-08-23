-- Widens course_time_slots.day's check constraint to accept Saturday and
-- Sunday, alongside the app-level DayOfWeek/DAYS_OF_WEEK widening in
-- packages/shared-types/src/models.ts. Weekend meeting times were
-- previously unsupported end to end (rejected here, unrepresentable in the
-- shared type, constrained out of the AI extraction schema, and
-- unselectable in the confirm screen's day picker) — a real gap, since a
-- weekend lab/elective is uncommon but not actually invalid.
--
-- 0001_init.sql's `check (day in (...))` was unnamed, so Postgres assigned
-- it the default `<table>_<column>_check` name.
alter table course_time_slots drop constraint course_time_slots_day_check;
alter table course_time_slots add constraint course_time_slots_day_check
  check (day in ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'));
