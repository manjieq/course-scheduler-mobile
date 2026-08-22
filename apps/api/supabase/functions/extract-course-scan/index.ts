// Photo -> structured course data, unsaved. See CLAUDE.md: university (and,
// extending that same rule, department) is resolved server-side from the
// caller's profile, never trusted from the client; nothing here writes to
// `courses` — that's confirm-course, only reachable after the user
// reviews/edits this response on the shared confirm screen.

import { getAuthedUser, UnauthenticatedError } from '../_shared/auth.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { geminiProvider } from '../_shared/gemini-provider.ts';
import { OnboardingIncompleteError, resolveUniversityAndDepartment } from '../_shared/university.ts';

interface ScanRequestBody {
  imageBase64?: unknown;
  mimeType?: unknown;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { client, user } = await getAuthedUser(req);
    const { universityId, departmentId } = await resolveUniversityAndDepartment(client, user.id);

    const body: ScanRequestBody = await req.json();
    if (typeof body.imageBase64 !== 'string' || typeof body.mimeType !== 'string') {
      return jsonResponse({ error: 'imageBase64 and mimeType are required' }, { status: 400 });
    }

    const extraction = await geminiProvider.extractFromImage({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
    });

    return jsonResponse({ universityId, departmentId, courses: extraction.courses });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return jsonResponse({ error: err.message }, { status: 401 });
    }
    if (err instanceof OnboardingIncompleteError) {
      return jsonResponse({ error: err.message }, { status: 400 });
    }
    console.error('extract-course-scan failed', err);
    // 422, not 500: this is most often the provider returning something
    // that failed schema validation, not a server bug — surface the raw
    // message so it's debuggable instead of a bare "Internal Server Error".
    return jsonResponse({ error: err instanceof Error ? err.message : 'Extraction failed' }, { status: 422 });
  }
});
