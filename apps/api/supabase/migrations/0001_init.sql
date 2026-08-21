-- Initial schema for course-scheduler-mobile.
-- Applied in Phase 2 once a Supabase project exists (the user provisions
-- this and supplies the project keys - see CLAUDE.md's "What I'll handle
-- myself" section). Written now so the schema is version-controlled from
-- the start rather than hand-applied through the Studio UI.

create extension if not exists pgcrypto;

-- Universities: curated + self-serve hybrid (see CLAUDE.md's Gap 2 notes).
-- New signups can add a university that isn't in the table yet; it's usable
-- immediately by them but excluded from cross-user shared-catalog reuse
-- until an admin flips status to 'approved' (avoids duplicate/typo schools
-- polluting the shared catalog).
create table universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  max_credits_per_semester int not null default 18,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'merged')),
  merged_into_id uuid references universities(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (lower(name))
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities(id),
  code text not null,
  name text not null,
  unique (university_id, code)
);

-- The shared catalog (Phase 5): one row per real-world course offering per
-- school. v1 treats "course" and "section" as the same thing (one course =
-- one fixed weekly schedule), matching the prototype's model - see
-- CLAUDE.md's open-defaults note if that ever needs revisiting.
create table courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities(id),
  department_id uuid not null references departments(id),
  code text not null,
  name text not null,
  credits numeric not null,
  category text not null check (category in ('core', 'extended', 'compulsory', 'elective')),
  instructor text,
  source text not null default 'ai_extracted' check (source in ('ai_extracted', 'manual', 'seed')),
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, department_id, code)
);

-- A course can meet multiple times/days; one row per weekly meeting time.
create table course_time_slots (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  day text not null check (day in ('MON', 'TUE', 'WED', 'THU', 'FRI')),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

-- Corrections audit trail (see CLAUDE.md's AI-correction-policy default):
-- corrections apply in place to the shared `courses` row and propagate to
-- everyone referencing it, but are logged here for traceability.
create table course_corrections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  corrected_by uuid references auth.users(id),
  field text not null,
  old_value text,
  new_value text,
  corrected_at timestamptz not null default now()
);

-- One row per authenticated user. university_id/department_id are nullable
-- only transiently during signup - every AI/catalog endpoint rejects
-- requests where university_id is null (Gap 2's server-side enforcement).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid references universities(id),
  department_id uuid references departments(id),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Cart-equivalent: the live, editable working set (replaces CartState).
-- One per user per university+department context, mirroring the
-- prototype's SELECT_UNIVERSITY/SELECT_DEPARTMENT resetting the cart.
create table schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  university_id uuid not null references universities(id),
  department_id uuid references departments(id),
  updated_at timestamptz not null default now(),
  unique (user_id, university_id, department_id)
);

-- CartState.courseIds vs includedIds: courseIds = all rows for a
-- schedule_id; includedIds = rows where included = true. ADD_TO_CART =
-- insert with included=true; TOGGLE_INCLUDED = flip the boolean;
-- REMOVE_FROM_CART = delete the row.
create table schedule_courses (
  schedule_id uuid not null references schedules(id) on delete cascade,
  course_id uuid not null references courses(id),
  included boolean not null default true,
  added_at timestamptz not null default now(),
  primary key (schedule_id, course_id)
);

-- Immutable point-in-time snapshots (SAVE_LOADOUT semantics): written once
-- at insert time and never updated afterward, mirroring the prototype
-- copying includedIds into a new object rather than referencing the live
-- cart. LOAD_LOADOUT = read loadout_courses, upsert into schedule_courses.
create table loadouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  university_id uuid not null references universities(id),
  department_id uuid not null references departments(id),
  total_credits numeric not null,
  created_at timestamptz not null default now()
);

create table loadout_courses (
  loadout_id uuid not null references loadouts(id) on delete cascade,
  course_id uuid not null references courses(id),
  primary key (loadout_id, course_id)
);

-- Row Level Security ---------------------------------------------------

alter table profiles enable row level security;
alter table schedules enable row level security;
alter table schedule_courses enable row level security;
alter table loadouts enable row level security;
alter table loadout_courses enable row level security;
alter table universities enable row level security;
alter table departments enable row level security;
alter table courses enable row level security;
alter table course_time_slots enable row level security;
alter table course_corrections enable row level security;

create policy "profiles_owner_all" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "schedules_owner_all" on schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "schedule_courses_owner_all" on schedule_courses
  for all using (
    exists (select 1 from schedules s where s.id = schedule_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );

create policy "loadouts_owner_all" on loadouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "loadout_courses_owner_all" on loadout_courses
  for all using (
    exists (select 1 from loadouts l where l.id = loadout_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from loadouts l where l.id = loadout_id and l.user_id = auth.uid())
  );

-- universities/departments: public read; insert only via the self-serve
-- add flow, always forced to pending_review and tagged with the creator.
create policy "universities_public_read" on universities
  for select using (true);

create policy "universities_self_serve_insert" on universities
  for insert with check (status = 'pending_review' and created_by = auth.uid());

create policy "departments_public_read" on departments
  for select using (true);

-- courses/course_time_slots/course_corrections: public read, no direct
-- client writes - only Edge Functions (service role) write here, so
-- catalog integrity and Gap 2's university enforcement stay server-side.
create policy "courses_public_read" on courses
  for select using (true);

create policy "course_time_slots_public_read" on course_time_slots
  for select using (true);

create policy "course_corrections_public_read" on course_corrections
  for select using (true);
