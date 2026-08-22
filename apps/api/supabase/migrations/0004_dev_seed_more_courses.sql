-- Phase 3 dev fixture follow-up: two more courses per department so the
-- credit-overcap warning (CartSheet's "cart exceeds the N-credit limit",
-- LoadoutCard/ComparisonPanel's over-limit credit styling) has something
-- realistic to trigger. 0003's original per-department major+general total
-- (CS: 4+4+4+3+2+2 = 19) sat just under Northgate's 20-credit cap, so
-- selecting nearly everything still fit.
--
-- Looks up the existing Northgate State University fixture by short_name
-- rather than re-inserting universities/departments, so this is safe to
-- run once against a database that already has 0003 applied — re-running
-- 0003 itself would duplicate the whole fixture, which this avoids.

do $$
declare
  v_university_id uuid;
  v_cs_id uuid;
  v_ba_id uuid;
  v_course_id uuid;
begin
  select id into v_university_id from universities where short_name = 'NSU';
  select id into v_cs_id from departments where university_id = v_university_id and code = 'CS';
  select id into v_ba_id from departments where university_id = v_university_id and code = 'BA';

  -- Computer Science: pushes major total to 4+4+4+3+3 = 18, general to
  -- 2+2+3 = 7 — everything together is 25, comfortably over the 20 cap.

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CS420', 'Computer Networks', 3, 'extended', 'Dr. Kim', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'FRI', '13:00', '14:30');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CSGE310', 'Introduction to Statistics', 3, 'elective', 'Prof. Reyes', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'TUE', '13:00', '14:30');

  -- Business Administration: same shape, kept in sync with CS per 0003's
  -- parallel-department convention.

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BA420', 'Operations Management', 3, 'extended', 'Dr. Novak', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'FRI', '13:00', '14:30');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BAGE310', 'Macroeconomics', 3, 'elective', 'Prof. Reyes', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'TUE', '13:00', '14:30');
end $$;
