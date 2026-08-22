import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';

import type { ExtractedCourseDraft, CourseCategory } from '@course-scheduler/shared-types';

import { supabase } from './supabase';

// Phase 4: thin wrappers around the three AI-extraction Edge Functions,
// following the existing lib/catalog.ts / lib/schedule-data.ts style
// (react-query hooks, not raw fetch calls scattered through screens).
// supabase.functions.invoke attaches the caller's session Authorization
// header automatically — university/department are still resolved
// server-side from it, never sent by the client (see CLAUDE.md's Gap 2).

export interface ExtractionResult {
  universityId: string;
  departmentId: string;
  courses: ExtractedCourseDraft[];
}

export interface ConfirmCourseInput extends ExtractedCourseDraft {
  category: CourseCategory;
}

export interface ConfirmCourseResult {
  courseId: string;
  wasCorrection: boolean;
}

/**
 * Edge Functions return `{ error: string }` JSON on failure — surface that
 * message instead of supabase-js's generic "Edge Function returned a
 * non-2xx status code".
 */
async function unwrapFunctionError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    // Only the .json() parse should be guarded here — throwing the
    // unwrapped message from inside this try would just be swallowed by
    // its own catch below instead of propagating.
    let message: string | undefined;
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic error
    }
    if (message) throw new Error(message);
  }
  throw error instanceof Error ? error : new Error('Request failed');
}

export function useExtractCourseScan() {
  return useMutation({
    mutationFn: async (input: { imageBase64: string; mimeType: string }): Promise<ExtractionResult> => {
      const { data, error } = await supabase.functions.invoke('extract-course-scan', { body: input });
      if (error) return unwrapFunctionError(error);
      return data as ExtractionResult;
    },
  });
}

export function useExtractCourseChat() {
  return useMutation({
    mutationFn: async (input: { text: string }): Promise<ExtractionResult> => {
      const { data, error } = await supabase.functions.invoke('extract-course-chat', { body: input });
      if (error) return unwrapFunctionError(error);
      return data as ExtractionResult;
    },
  });
}

export function useConfirmCourse() {
  return useMutation({
    mutationFn: async (input: ConfirmCourseInput): Promise<ConfirmCourseResult> => {
      const { data, error } = await supabase.functions.invoke('confirm-course', { body: input });
      if (error) return unwrapFunctionError(error);
      return data as ConfirmCourseResult;
    },
  });
}
