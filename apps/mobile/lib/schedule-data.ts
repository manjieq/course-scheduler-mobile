import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { getErrorMessage } from './errors';
import { supabase } from './supabase';

// Cart-equivalent: schedules/schedule_courses are the DB-backed replacement
// for the prototype's in-memory CartState (see CLAUDE.md). One schedule row
// per (user, university, department) — switching department in the Courses
// tab switches which schedule row is live, each with its own cart.

/**
 * Gets the schedule row for this (user, university, department), creating
 * it on first use. get-or-create inside a query function is unusual for
 * react-query (queries are normally pure reads) but is the simplest way to
 * guarantee exactly one row per context without a separate imperative setup
 * step before every screen that needs it.
 */
export function useSchedule(
  userId: string | undefined,
  universityId: string | null | undefined,
  departmentId: string | null | undefined
) {
  return useQuery({
    queryKey: ['schedule', userId, universityId, departmentId],
    queryFn: async (): Promise<string> => {
      const { data: existing, error: selectError } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_id', userId as string)
        .eq('university_id', universityId as string)
        .eq('department_id', departmentId as string)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing) return existing.id;

      const { data: created, error: insertError } = await supabase
        .from('schedules')
        .insert({ user_id: userId, university_id: universityId, department_id: departmentId })
        .select('id')
        .single();
      if (!insertError) return created.id;

      // Another mount (e.g. the Courses and Schedule tabs both resolving
      // this at once) may have inserted the row between our select and
      // insert — a unique-violation here just means we lost that race, not
      // a real failure, so re-select instead of surfacing an error.
      if (insertError.code === '23505') {
        const { data: raced, error: racedError } = await supabase
          .from('schedules')
          .select('id')
          .eq('user_id', userId as string)
          .eq('university_id', universityId as string)
          .eq('department_id', departmentId as string)
          .single();
        if (racedError) throw racedError;
        return raced.id;
      }
      throw insertError;
    },
    enabled: Boolean(userId && universityId && departmentId),
  });
}

export interface ScheduleCourseRow {
  course_id: string;
  included: boolean;
}

export function useScheduleCourses(scheduleId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-courses', scheduleId],
    queryFn: async (): Promise<ScheduleCourseRow[]> => {
      const { data, error } = await supabase
        .from('schedule_courses')
        .select('course_id, included')
        .eq('schedule_id', scheduleId as string);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(scheduleId),
  });
}

/**
 * ADD_TO_CART / REMOVE_FROM_CART / TOGGLE_INCLUDED, ported 1:1 (see
 * CLAUDE.md) onto `schedule_courses` writes instead of reducer actions.
 */
export function useCartMutations(scheduleId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedule-courses', scheduleId] });

  const addToCart = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('schedule_courses')
        .insert({ schedule_id: scheduleId, course_id: courseId, included: true });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not add course', getErrorMessage(err)),
  });

  const removeFromCart = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('schedule_courses')
        .delete()
        .eq('schedule_id', scheduleId as string)
        .eq('course_id', courseId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not remove course', getErrorMessage(err)),
  });

  const toggleIncluded = useMutation({
    mutationFn: async ({ courseId, included }: { courseId: string; included: boolean }) => {
      const { error } = await supabase
        .from('schedule_courses')
        .update({ included })
        .eq('schedule_id', scheduleId as string)
        .eq('course_id', courseId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not update course', getErrorMessage(err)),
  });

  return { addToCart, removeFromCart, toggleIncluded };
}
