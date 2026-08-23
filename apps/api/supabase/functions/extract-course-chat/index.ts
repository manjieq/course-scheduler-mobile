// Free text -> structured course data, unsaved. Same pipeline as
// extract-course-scan (server-side university/department resolution,
// shared provider interface, schema validation) but takes a typed
// description instead of a photo — see that function's index.ts for the
// fuller explanation, not repeated here.

import { getAuthedUser, UnauthenticatedError } from '../_shared/auth.ts';
import { findCachedCoursesFromText } from '../_shared/catalog-cache.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { geminiProvider } from '../_shared/gemini-provider.ts';
import { OnboardingIncompleteError, resolveUniversityAndDepartment } from '../_shared/university.ts';

interface ChatRequestBody {
  text?: unknown;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { client, user } = await getAuthedUser(req);
    const { universityId, departmentId } = await resolveUniversityAndDepartment(client, user.id);

    const body: ChatRequestBody = await req.json();
    if (typeof body.text !== 'string' || body.text.trim().length === 0) {
      return jsonResponse({ error: 'text is required' }, { status: 400 });
    }

    // Phase 5 catalog cache: an obvious course code already legible in the
    // caller's own text (e.g. "CS 301") skips Gemini entirely on a hit —
    // see _shared/catalog-cache.ts for the matching heuristic and its
    // documented limitation.
    const cached = await findCachedCoursesFromText(client, universityId, departmentId, body.text);
    if (cached) {
      return jsonResponse({ universityId, departmentId, courses: cached });
    }

    const extraction = await geminiProvider.extractFromText({ text: body.text });

    return jsonResponse({ universityId, departmentId, courses: extraction.courses });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return jsonResponse({ error: err.message }, { status: 401 });
    }
    if (err instanceof OnboardingIncompleteError) {
      return jsonResponse({ error: err.message }, { status: 400 });
    }
    console.error('extract-course-chat failed', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Extraction failed' }, { status: 422 });
  }
});
