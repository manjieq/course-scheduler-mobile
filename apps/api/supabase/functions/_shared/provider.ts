// The swappable vision-LLM provider interface (see CLAUDE.md: never
// hardcode extract-course-scan/chat to one provider). gemini-provider.ts is
// the first concrete implementation; a future provider just implements this
// same interface and gets swapped in at the call site in
// extract-course-scan/chat's index.ts.
//
// ExtractionResponse is imported from schema.ts (derived via z.infer), not
// from packages/shared-types directly: that package's internal files use
// extension-less relative imports ('./models'), which is fine for
// tsc/Vite/vitest but Deno's strict ESM resolution requires an explicit
// .ts extension on every relative specifier — importing the package as-is
// would resolve here but fail inside it. schema.ts's zod shape is already
// hand-kept in sync with packages/shared-types/src/extraction.ts's
// ExtractedCourseDraft/ExtractionResponse (see its own comment); this just
// reuses that single Deno-safe source of truth instead of adding a second,
// looser one.

import type { ExtractionResponse } from './schema.ts';

export interface ScanInput {
  imageBase64: string;
  /** e.g. "image/jpeg" — sent to the provider as-is, not sniffed server-side. */
  mimeType: string;
}

export interface ChatInput {
  text: string;
}

export interface VisionExtractionProvider {
  extractFromImage(input: ScanInput): Promise<ExtractionResponse>;
  extractFromText(input: ChatInput): Promise<ExtractionResponse>;
}
