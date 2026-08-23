// First concrete implementation of VisionExtractionProvider (see
// provider.ts) — picked because Gemini's API has a genuinely free tier
// (Google AI Studio), unlike Anthropic/OpenAI, which only ever offer
// one-time trial credit. Calls the REST `generateContent` endpoint
// directly via fetch rather than pulling in Google's Node SDK — Deno/npm
// interop for a whole SDK is more moving parts than a single fetch call
// needs, and this keeps the provider swap trivial (implement the same
// interface, no SDK-specific bootstrapping to replicate).
//
// Model id: verified against Google's live docs when this was written
// (ai.google.dev/gemini-api/docs/models) — Gemini's lineup moves faster
// than most; if extraction requests start 404ing, that's the first thing
// to check, not a bug in this file.

import type { ChatInput, ScanInput, VisionExtractionProvider } from './provider.ts';
import { extractionResponseSchema, type ExtractionResponse } from './schema.ts';

const GEMINI_MODEL = 'gemini-3.7-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// OpenAPI-3.0-subset schema Gemini uses for responseSchema — lowercase
// `type` values, not JSON Schema's own draft. Mirrors schema.ts's zod
// shape field-for-field so a validation failure downstream means the model
// ignored the schema, not that the two drifted apart.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          credits: { type: 'number' },
          instructor: { type: 'string' },
          timeSlots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'string', enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
                start: { type: 'string' },
                end: { type: 'string' },
              },
              required: ['day', 'start', 'end'],
            },
          },
        },
        required: ['code', 'name', 'credits', 'timeSlots'],
      },
    },
  },
  required: ['courses'],
};

const EXTRACTION_PROMPT = `You are extracting a student's course schedule from a university course listing.
Return every course you can find with: its course code, its full name, its
credit value, its instructor if shown, and every weekly meeting time (day,
24-hour start time, 24-hour end time). A course can meet more than once a
week — include one timeSlots entry per meeting, not one course per meeting.
Most classes meet on weekdays, but some meet on Saturday or Sunday — read
the day exactly as shown rather than assuming it must be a weekday.
Do not guess a value you cannot actually see; omit optional fields (like
instructor) rather than inventing one.`;

// Supabase's own platform-level function timeout (~150s) kills a hung
// request with an empty-body 503 and no diagnostics — each attempt below
// fails well before that, so a slow/stuck call surfaces an actual message
// instead. 35s turned out to be needed: a first cut at 20s aborted a
// request that was still genuinely in progress (not stuck), not just
// erroring — this isn't only about catching a hang anymore, it's the real
// per-attempt budget.
const REQUEST_TIMEOUT_MS = 35_000;

// Gemini's free tier returns 503 ("model is overloaded") and occasionally
// 429 during demand spikes — both transient. A client-side timeout is
// treated the same way (status 0 below): the first 20s attempt showed a
// slow-but-working request looks identical to a stuck one from here, so it
// gets the same retry instead of failing hard. Two attempts at 35s each
// plus the delay stays well under Supabase's platform timeout.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2_000;
const TIMEOUT_STATUS = 0;
const RETRYABLE_STATUS = new Set([429, 503, TIMEOUT_STATUS]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiOnce(
  apiKey: string,
  parts: Array<Record<string, unknown>>
): Promise<{ ok: true; payload: unknown } | { ok: false; status: number; bodyText: string }> {
  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // Gemini 3.x models default to "medium" thinking, which adds real
          // latency this task doesn't need — it's a direct extraction, not
          // a reasoning problem. "low" cut a first observed request from
          // 160s+ (enough to hit Supabase's own platform timeout) down to
          // a few seconds most of the time.
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { ok: false, status: TIMEOUT_STATUS, bodyText: `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` };
    }
    throw err;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, bodyText: await res.text() };
  }
  return { ok: true, payload: await res.json() };
}

async function callGemini(parts: Array<Record<string, unknown>>): Promise<ExtractionResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY function secret');

  let lastFailure = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callGeminiOnce(apiKey, parts);

    if (!result.ok) {
      lastFailure =
        result.status === TIMEOUT_STATUS
          ? `Gemini request ${result.bodyText}`
          : `Gemini request failed (${result.status}): ${result.bodyText}`;
      if (RETRYABLE_STATUS.has(result.status) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw new Error(lastFailure);
    }

    const text = (result.payload as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error('Gemini response had no text part to parse as JSON');
    }

    // Schema-constrained output still isn't a compile-time guarantee —
    // parse and validate before trusting it (see schema.ts's comment).
    const parsed = JSON.parse(text);
    return extractionResponseSchema.parse(parsed);
  }

  // Unreachable given the loop above always returns or throws, but keeps
  // the function's return type honest without a non-null assertion.
  throw new Error(lastFailure || 'Gemini request failed');
}

export const geminiProvider: VisionExtractionProvider = {
  async extractFromImage({ imageBase64, mimeType }: ScanInput) {
    return callGemini([{ text: EXTRACTION_PROMPT }, { inlineData: { mimeType, data: imageBase64 } }]);
  },

  async extractFromText({ text }: ChatInput) {
    return callGemini([{ text: `${EXTRACTION_PROMPT}\n\nStudent's description:\n${text}` }]);
  },
};
