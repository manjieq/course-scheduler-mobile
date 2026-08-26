// Proves the ownership boundary CLAUDE.md describes ("RLS policies are
// the enforcement boundary for ownership ... don't add client-side-only
// checks as a substitute for RLS") actually holds, by exercising it the
// same way a real client would: two genuinely signed-up users, each with
// their own session, making requests through the anon-key PostgREST API —
// never a service-role client, which would bypass RLS entirely and prove
// nothing here.
//
// This only runs against a real local Supabase stack (Postgres + GoTrue +
// PostgREST), not as part of the fast `pnpm test` used elsewhere in the
// repo — see package.json's `test:rls` script and the repo root's
// `.github/workflows/ci.yml` `rls-tests` job, which starts that stack
// with Docker before running this file. There is no local teardown of the
// rows these tests create: the whole database is thrown away with the
// ephemeral Supabase instance at the end of that CI job.
import { beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.API_URL;
const SUPABASE_ANON_KEY = process.env.ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing API_URL / ANON_KEY — this suite needs a running local Supabase stack. ' +
      "Run `supabase start` under apps/api, then `supabase status -o env` to get these " +
      '(see the rls-tests job in .github/workflows/ci.yml for the exact sequence).'
  );
}

function freshClient(): SupabaseClient {
  return createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
}

/** Signs up a brand-new user and returns their id. Local auth has email
 * confirmation disabled (config.toml's `auth.email.enable_confirmations
 * = false`), so signUp returns an active session immediately — no
 * separate sign-in step needed. */
async function signUpNewUser(client: SupabaseClient, label: string): Promise<string> {
  const email = `rls-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: 'rls-test-password' });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error(`signUp for ${label} did not return an active session — is enable_confirmations really off?`);
  }
  return data.user.id;
}

describe('Row Level Security', () => {
  // Two independent, genuinely-authenticated users sharing the seeded
  // Northgate State University fixture (0003_dev_seed.sql) — everything
  // in the top-level describes below asks "can B see/touch what A owns?"
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let userAId: string;
  let userBId: string;
  let universityId: string;
  let departmentId: string;
  let seededCourseId: string;
  // A second real course, distinct from seededCourseId — the loadout_courses
  // impersonation test below needs an (loadout_id, course_id) pair that
  // doesn't already exist, so a blocked insert is provably an RLS block and
  // not just a primary-key conflict on a pair the top-level beforeAll
  // already inserted.
  let secondCourseId: string;

  beforeAll(async () => {
    userA = freshClient();
    userB = freshClient();
    userAId = await signUpNewUser(userA, 'a');
    userBId = await signUpNewUser(userB, 'b');

    // Public-read catalog — any authenticated client can look this up
    // (courses_public_read / departments_public_read / universities_
    // public_read in 0001_init.sql).
    const { data: university, error: universityError } = await userA
      .from('universities')
      .select('id')
      .eq('short_name', 'NSU')
      .single();
    if (universityError) throw universityError;
    universityId = university.id;

    const { data: department, error: departmentError } = await userA
      .from('departments')
      .select('id')
      .eq('university_id', universityId)
      .eq('code', 'CS')
      .single();
    if (departmentError) throw departmentError;
    departmentId = department.id;

    const { data: course, error: courseError } = await userA
      .from('courses')
      .select('id')
      .eq('department_id', departmentId)
      .limit(1)
      .single();
    if (courseError) throw courseError;
    seededCourseId = course.id;

    const { data: secondCourse, error: secondCourseError } = await userA
      .from('courses')
      .select('id')
      .eq('department_id', departmentId)
      .neq('id', seededCourseId)
      .limit(1)
      .single();
    if (secondCourseError) throw secondCourseError;
    secondCourseId = secondCourse.id;

    // Mirrors what apps/mobile/app/(onboarding)/university.tsx does on
    // real onboarding — an authenticated user upserting their own
    // profiles row is allowed by profiles_owner_all.
    for (const [client, id] of [
      [userA, userAId],
      [userB, userBId],
    ] as const) {
      const { error } = await client
        .from('profiles')
        .upsert({ id, university_id: universityId, department_id: departmentId, onboarding_completed_at: new Date().toISOString() });
      if (error) throw error;
    }
  });

  describe('profiles', () => {
    it("hides another user's profile from select", async () => {
      const { data, error } = await userB.from('profiles').select('id').eq('id', userAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("blocks updating another user's profile", async () => {
      const { data, error } = await userB.from('profiles').update({ department_id: null }).eq('id', userAId).select();
      // RLS filters the target row out of the update's match entirely —
      // this comes back as zero affected rows, not a thrown error.
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillIntact } = await userA.from('profiles').select('department_id').eq('id', userAId).single();
      expect(stillIntact?.department_id).toBe(departmentId);
    });
  });

  describe('schedules (owner-only, CartState.courseIds equivalent)', () => {
    let scheduleAId: string;

    beforeAll(async () => {
      const { data, error } = await userA
        .from('schedules')
        .insert({ user_id: userAId, university_id: universityId, department_id: departmentId })
        .select('id')
        .single();
      if (error) throw error;
      scheduleAId = data.id;
    });

    it("hides another user's schedule from select", async () => {
      const { data, error } = await userB.from('schedules').select('id').eq('id', scheduleAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("blocks updating another user's schedule", async () => {
      const { data, error } = await userB
        .from('schedules')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', scheduleAId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('blocks inserting a schedule that impersonates another user', async () => {
      const { error } = await userB
        .from('schedules')
        .insert({ user_id: userAId, university_id: universityId, department_id: departmentId });
      expect(error).not.toBeNull();
    });

    it("scopes schedule_courses through its parent schedule's ownership", async () => {
      const { error: insertError } = await userA
        .from('schedule_courses')
        .insert({ schedule_id: scheduleAId, course_id: seededCourseId });
      expect(insertError).toBeNull();

      const { data: seenByOwner } = await userA
        .from('schedule_courses')
        .select('course_id')
        .eq('schedule_id', scheduleAId);
      expect(seenByOwner).toEqual([{ course_id: seededCourseId }]);

      const { data: seenByOther, error: selectError } = await userB
        .from('schedule_courses')
        .select('course_id')
        .eq('schedule_id', scheduleAId);
      expect(selectError).toBeNull();
      expect(seenByOther).toEqual([]);

      const { error: impersonatedInsertError } = await userB
        .from('schedule_courses')
        .insert({ schedule_id: scheduleAId, course_id: seededCourseId });
      expect(impersonatedInsertError).not.toBeNull();
    });

    it('lets the owner update schedule_courses (TOGGLE_INCLUDED)', async () => {
      const { error } = await userA
        .from('schedule_courses')
        .update({ included: false })
        .eq('schedule_id', scheduleAId)
        .eq('course_id', seededCourseId);
      expect(error).toBeNull();

      const { data } = await userA
        .from('schedule_courses')
        .select('included')
        .eq('schedule_id', scheduleAId)
        .eq('course_id', seededCourseId)
        .single();
      expect(data?.included).toBe(false);
    });

    it("blocks a non-owner from deleting another user's schedule_courses row", async () => {
      const { data, error } = await userB
        .from('schedule_courses')
        .delete()
        .eq('schedule_id', scheduleAId)
        .eq('course_id', seededCourseId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await userA
        .from('schedule_courses')
        .select('course_id')
        .eq('schedule_id', scheduleAId)
        .eq('course_id', seededCourseId);
      expect(stillThere).toEqual([{ course_id: seededCourseId }]);
    });

    // Last in this describe, after the schedule_courses tests above that
    // still need scheduleAId to exist — a blocked delete doesn't actually
    // remove the row, but this stays last regardless so nothing downstream
    // could ever depend on a deleted schedule by accident.
    it("blocks deleting another user's schedule", async () => {
      const { data, error } = await userB.from('schedules').delete().eq('id', scheduleAId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await userA.from('schedules').select('id').eq('id', scheduleAId).single();
      expect(stillThere?.id).toBe(scheduleAId);
    });
  });

  describe('loadouts (immutable snapshots) and loadout_courses', () => {
    let loadoutAId: string;

    beforeAll(async () => {
      const { data, error } = await userA
        .from('loadouts')
        .insert({
          user_id: userAId,
          name: 'RLS test loadout',
          university_id: universityId,
          department_id: departmentId,
          total_credits: 4,
        })
        .select('id')
        .single();
      if (error) throw error;
      loadoutAId = data.id;

      const { error: coursesError } = await userA
        .from('loadout_courses')
        .insert({ loadout_id: loadoutAId, course_id: seededCourseId });
      if (coursesError) throw coursesError;
    });

    it("hides another user's loadout and its courses from select", async () => {
      const { data: loadout, error: loadoutError } = await userB.from('loadouts').select('id').eq('id', loadoutAId);
      expect(loadoutError).toBeNull();
      expect(loadout).toEqual([]);

      const { data: courses, error: coursesError } = await userB
        .from('loadout_courses')
        .select('course_id')
        .eq('loadout_id', loadoutAId);
      expect(coursesError).toBeNull();
      expect(courses).toEqual([]);
    });

    it('blocks inserting a loadout that impersonates another user', async () => {
      const { error } = await userB.from('loadouts').insert({
        user_id: userAId,
        name: 'Impersonated loadout',
        university_id: universityId,
        department_id: departmentId,
        total_credits: 0,
      });
      expect(error).not.toBeNull();
    });

    it('blocks inserting into loadout_courses via impersonation of the parent loadout', async () => {
      // secondCourseId, not seededCourseId — this pair doesn't already
      // exist, so a block here can only be the ownership policy, not a
      // primary-key conflict on the pair the beforeAll above inserted.
      const { error } = await userB.from('loadout_courses').insert({ loadout_id: loadoutAId, course_id: secondCourseId });
      expect(error).not.toBeNull();
    });

    it("blocks a non-owner from deleting another user's loadout_courses row", async () => {
      const { data, error } = await userB
        .from('loadout_courses')
        .delete()
        .eq('loadout_id', loadoutAId)
        .eq('course_id', seededCourseId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await userA.from('loadout_courses').select('course_id').eq('loadout_id', loadoutAId);
      expect(stillThere).toEqual([{ course_id: seededCourseId }]);
    });

    it("blocks deleting another user's loadout", async () => {
      const { data, error } = await userB.from('loadouts').delete().eq('id', loadoutAId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await userA.from('loadouts').select('id').eq('id', loadoutAId).single();
      expect(stillThere?.id).toBe(loadoutAId);
    });
  });

  describe('shared catalog (courses/departments/universities)', () => {
    it('is readable by any authenticated user, not just the one who confirmed it', async () => {
      const { data, error } = await userB.from('courses').select('id').eq('department_id', departmentId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('cannot be written to directly by a client — only confirm-course (service role) may', async () => {
      const { error } = await userA.from('courses').insert({
        university_id: universityId,
        department_id: departmentId,
        code: `RLS-DIRECT-${Date.now()}`,
        name: 'Should never land via a direct client insert',
        credits: 3,
        category: 'elective',
      });
      expect(error).not.toBeNull();
    });
  });

  describe('course_time_slots and course_corrections (public read, no direct write — 0001_init.sql)', () => {
    it('course_time_slots is readable by any authenticated user', async () => {
      const { data, error } = await userB.from('course_time_slots').select('id').eq('course_id', seededCourseId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('cannot be written to directly by a client', async () => {
      const { error } = await userA.from('course_time_slots').insert({
        course_id: seededCourseId,
        day: 'MON',
        start_time: '09:00',
        end_time: '10:00',
      });
      expect(error).not.toBeNull();
    });

    it('course_corrections is readable by any authenticated user, even with no rows yet', async () => {
      const { error } = await userB.from('course_corrections').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('cannot be written to directly by a client — only confirm-course (service role) logs a correction', async () => {
      const { error } = await userA.from('course_corrections').insert({
        course_id: seededCourseId,
        field: 'name',
        old_value: 'Old Name',
        new_value: 'New Name',
      });
      expect(error).not.toBeNull();
    });
  });

  describe("departments self-serve insert (0005/0006), scoped to the caller's own university", () => {
    // A second university, unrelated to userA/userB's shared NSU fixture —
    // any authenticated user can self-serve one (see the describe below),
    // so this just needs *a* university userA doesn't belong to, to prove
    // 0005's policy reads university_id from the caller's own profile
    // server-side rather than trusting whatever the client sends.
    let otherUniversityId: string;

    beforeAll(async () => {
      const { data, error } = await userB
        .from('universities')
        .insert({ name: `RLS Departments Other Univ ${Date.now()}`, short_name: 'OTH', status: 'pending_review', created_by: userBId })
        .select('id')
        .single();
      if (error) throw error;
      otherUniversityId = data.id;
    });

    it('lets a user add a department to their own university', async () => {
      const { error } = await userA.from('departments').insert({
        university_id: universityId,
        code: `RLS-${Date.now()}`,
        name: 'RLS Test Department',
      });
      expect(error).toBeNull();
    });

    it("blocks adding a department to a university that isn't theirs", async () => {
      const { error } = await userA.from('departments').insert({
        university_id: otherUniversityId,
        code: `RLS-FOREIGN-${Date.now()}`,
        name: 'Should never land via a foreign university_id',
      });
      expect(error).not.toBeNull();
    });
  });

  describe('universities self-serve add (Gap 2: pending_review, not admin-approved)', () => {
    it('lets a user add a university tagged as themselves and pending_review', async () => {
      const { error } = await userA.from('universities').insert({
        name: `RLS Self-Serve Univ ${Date.now()}`,
        short_name: 'RLS',
        status: 'pending_review',
        created_by: userAId,
      });
      expect(error).toBeNull();
    });

    it('blocks tagging a self-serve university as a different user', async () => {
      const { error } = await userB.from('universities').insert({
        name: `RLS Impersonated Univ ${Date.now()}`,
        short_name: 'IMP',
        status: 'pending_review',
        created_by: userAId,
      });
      expect(error).not.toBeNull();
    });

    it('blocks self-serve-inserting a university as already approved', async () => {
      const { error } = await userA.from('universities').insert({
        name: `RLS Escalation Univ ${Date.now()}`,
        short_name: 'ESC',
        status: 'approved',
        created_by: userAId,
      });
      expect(error).not.toBeNull();
    });
  });

  // A dedicated third user, isolated from userA/userB above, so re-pointing
  // its own profile at a fresh self-serve university (required for the
  // owner-update policy's `id = (select university_id from profiles ...)`
  // check to ever match) can't affect any other describe block's state.
  describe("universities self-serve owner edit is column-scoped (0007/0008)", () => {
    let userC: SupabaseClient;
    let userCId: string;
    let ownUniversityId: string;

    beforeAll(async () => {
      userC = freshClient();
      userCId = await signUpNewUser(userC, 'c');

      const { data: university, error: universityError } = await userC
        .from('universities')
        .insert({ name: `RLS Column Scope Univ ${Date.now()}`, short_name: 'OLD', status: 'pending_review', created_by: userCId })
        .select('id')
        .single();
      if (universityError) throw universityError;
      ownUniversityId = university.id;

      const { error: profileError } = await userC
        .from('profiles')
        .upsert({ id: userCId, university_id: ownUniversityId, department_id: null });
      if (profileError) throw profileError;
    });

    it('lets the owner update the two columns the self-serve edit flow needs', async () => {
      const { error } = await userC
        .from('universities')
        .update({ max_credits_per_semester: 21, short_name: 'NEW' })
        .eq('id', ownUniversityId);
      expect(error).toBeNull();
    });

    it('blocks the same owner from renaming or approving their own university via that column grant', async () => {
      // The row-level policy (status = 'pending_review' and id = their own
      // university) would allow this update to *match* the row; only the
      // column-level grant (0007/0008 only grant update on
      // max_credits_per_semester/short_name) stops it from actually
      // writing name/status. If this ever starts passing, the column
      // scoping was accidentally widened to a whole-row grant.
      const { error: renameError } = await userC.from('universities').update({ name: 'Renamed Without Permission' }).eq('id', ownUniversityId);
      expect(renameError).not.toBeNull();

      const { error: approveError } = await userC.from('universities').update({ status: 'approved' }).eq('id', ownUniversityId);
      expect(approveError).not.toBeNull();
    });
  });
});
