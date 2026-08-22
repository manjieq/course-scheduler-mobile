// Two distinct Supabase clients, deliberately not interchangeable:
//   - the user-scoped client carries the caller's own JWT, so every query
//     it makes is RLS-scoped to them (used to verify identity and read
//     their own `profiles` row).
//   - the service-role client bypasses RLS entirely and is the only thing
//     allowed to write to `courses`/`course_time_slots`/`course_corrections`
//     (see CLAUDE.md: those tables are public-read, Edge-Function-only
//     write). It's created lazily, only where an actual write happens
//     (confirm-course), never for extract-course-scan/chat, which read only.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export class UnauthenticatedError extends Error {
  constructor() {
    super('Missing or invalid Authorization header');
  }
}

/**
 * Builds a user-scoped client from the incoming request's Authorization
 * header and resolves the caller. Throws UnauthenticatedError if there is
 * no valid session — callers should turn that into a 401.
 */
export async function getAuthedUser(req: Request): Promise<{ client: SupabaseClient; user: User }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY function env vars');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new UnauthenticatedError();

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new UnauthenticatedError();

  return { client, user };
}

/** Privileged client for the catalog writes only confirm-course performs. */
export function getServiceRoleClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY function env vars');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
