// Gap 2's server-side resolution rule (see CLAUDE.md), extended to
// department as well as university: courses are keyed by
// (university_id, department_id, code), so both must come from the
// caller's own `profiles` row — never a client-supplied value — for every
// extraction and catalog-write request.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export class OnboardingIncompleteError extends Error {
  constructor() {
    super('University/department not set — onboarding is incomplete');
  }
}

export interface ResolvedContext {
  universityId: string;
  departmentId: string;
}

/** Reads the caller's own profile via their user-scoped client (RLS-safe). */
export async function resolveUniversityAndDepartment(
  userScopedClient: SupabaseClient,
  userId: string
): Promise<ResolvedContext> {
  const { data, error } = await userScopedClient
    .from('profiles')
    .select('university_id, department_id')
    .eq('id', userId)
    .single();

  if (error) throw error;
  if (!data.university_id || !data.department_id) throw new OnboardingIncompleteError();

  return { universityId: data.university_id, departmentId: data.department_id };
}
