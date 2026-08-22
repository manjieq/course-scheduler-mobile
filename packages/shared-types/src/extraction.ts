// Phase 4: the AI extraction contract shared between the Edge Functions
// (extract-course-scan / extract-course-chat / confirm-course) and the
// mobile confirm/edit review screen. Deliberately close to `Course` in
// models.ts but not the same shape: a draft has no `id` yet (nothing is
// saved until the user confirms) and no `category` (the AI can't infer
// major-core vs. general-elective from a listing — the user picks that on
// the confirm screen, see CLAUDE.md's Phase 4 notes).

import type { DayOfWeek } from './models';

export interface ExtractedTimeSlotDraft {
  day: DayOfWeek;
  /** 24h "HH:MM" */
  start: string;
  /** 24h "HH:MM" */
  end: string;
}

export interface ExtractedCourseDraft {
  code: string;
  name: string;
  credits: number;
  instructor?: string;
  timeSlots: ExtractedTimeSlotDraft[];
}

/** What both extract-course-scan and extract-course-chat return, unsaved. */
export interface ExtractionResponse {
  courses: ExtractedCourseDraft[];
}
