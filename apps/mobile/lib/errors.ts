/**
 * Single spot for "what do we show the user" on a thrown/rejected error —
 * previously duplicated inline as `err instanceof Error ? err.message :
 * 'Something went wrong.'` across scan.tsx/chat.tsx/confirm-courses.tsx.
 * Also used by lib-level mutation onError handlers (see schedule-data.ts,
 * loadouts.ts, catalog.ts) so a failed write surfaces something instead of
 * failing silently — see Phase 6 in CLAUDE.md.
 */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}
