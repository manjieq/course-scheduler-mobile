-- Phase 3 dev fixture: a small hand-seeded catalog so Courses/Cart/
-- Schedule/Loadouts can be exercised against real Postgres-backed data
-- before AI extraction (Phase 4) exists. Mirrors the prototype's
-- src/data/seed.ts shape, scaled down (2 departments instead of 6), and
-- carries forward its convention of one deliberately overlapping course
-- pair per department so the conflict-warning UI has something to show.
--
-- This is throwaway dev data, not a real school. It's marked 'approved'
-- (rather than 'pending_review') so it behaves like an already-vetted
-- shared-catalog entry, and courses are tagged source='seed' to keep them
-- distinguishable from later ai_extracted/manual rows.
--
-- Apply this once, the same way 0001_init.sql and 0002_grants.sql were
-- applied (hand-run in the Supabase Studio SQL editor). During onboarding,
-- search for "Northgate State University" to land in this fixture.

do $$
declare
  v_university_id uuid;
  v_cs_id uuid;
  v_ba_id uuid;
  v_course_id uuid;
begin
  insert into universities (name, short_name, max_credits_per_semester, status)
  values ('Northgate State University', 'NSU', 20, 'approved')
  returning id into v_university_id;

  insert into departments (university_id, code, name)
  values (v_university_id, 'CS', 'Computer Science')
  returning id into v_cs_id;

  insert into departments (university_id, code, name)
  values (v_university_id, 'BA', 'Business Administration')
  returning id into v_ba_id;

  -- Computer Science ------------------------------------------------------

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CS101', 'Introduction to Programming', 4, 'core', 'Dr. Osei', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '09:00', '10:30'),
    (v_course_id, 'WED', '09:00', '10:30');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CS201', 'Data Structures', 4, 'core', 'Dr. Osei', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'TUE', '10:00', '11:30'),
    (v_course_id, 'THU', '10:00', '11:30');

  -- Deliberately overlaps CS101 on both MON and WED.
  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CS301', 'Algorithms', 4, 'core', 'Dr. Patel', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '10:00', '11:30'),
    (v_course_id, 'WED', '10:00', '11:30');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CS410', 'Machine Learning', 3, 'extended', 'Dr. Kim', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'FRI', '09:00', '12:00');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CSGE101', 'Academic Writing', 2, 'compulsory', 'Prof. Diallo', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '08:00', '09:00');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_cs_id, 'CSGE210', 'Philosophy', 2, 'elective', 'Prof. Reyes', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'FRI', '13:00', '14:30');

  -- Business Administration ------------------------------------------------

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BA101', 'Principles of Management', 4, 'core', 'Dr. Novak', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'TUE', '09:00', '10:30'),
    (v_course_id, 'THU', '09:00', '10:30');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BA201', 'Financial Accounting', 4, 'core', 'Dr. Novak', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '13:00', '14:30'),
    (v_course_id, 'WED', '13:00', '14:30');

  -- Deliberately overlaps BA201 on both MON and WED.
  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BA301', 'Marketing Strategy', 4, 'core', 'Dr. Ibrahim', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '14:00', '15:30'),
    (v_course_id, 'WED', '13:30', '15:00');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BA410', 'Corporate Finance', 3, 'extended', 'Dr. Ibrahim', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'FRI', '09:00', '12:00');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BAGE101', 'Academic Writing', 2, 'compulsory', 'Prof. Diallo', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'MON', '08:00', '09:00');

  insert into courses (university_id, department_id, code, name, credits, category, instructor, source)
  values (v_university_id, v_ba_id, 'BAGE220', 'World History', 2, 'elective', 'Prof. Reyes', 'seed')
  returning id into v_course_id;
  insert into course_time_slots (course_id, day, start_time, end_time) values
    (v_course_id, 'THU', '15:00', '16:30');
end $$;
