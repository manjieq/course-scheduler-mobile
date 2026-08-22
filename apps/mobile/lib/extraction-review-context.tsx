import { createContext, useContext, useState, type ReactNode } from 'react';

import type { ExtractionResult } from './extraction';

// Hands off the just-extracted drafts from scan.tsx/chat.tsx to
// confirm-courses.tsx without stuffing a JSON blob into an Expo Router URL
// param. This is transient in-session state only — never persisted, and
// cleared once the confirm screen is done with it.

interface ExtractionReviewContextValue {
  pending: ExtractionResult | null;
  setPending: (result: ExtractionResult | null) => void;
}

const ExtractionReviewContext = createContext<ExtractionReviewContextValue | undefined>(undefined);

export function ExtractionReviewProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ExtractionResult | null>(null);
  return (
    <ExtractionReviewContext.Provider value={{ pending, setPending }}>{children}</ExtractionReviewContext.Provider>
  );
}

export function useExtractionReview() {
  const ctx = useContext(ExtractionReviewContext);
  if (!ctx) throw new Error('useExtractionReview must be used within an ExtractionReviewProvider');
  return ctx;
}
