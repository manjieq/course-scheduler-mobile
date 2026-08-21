import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildColorMap } from '@course-scheduler/shared-types';
import type { Course, DayOfWeek, Department, University } from '@course-scheduler/shared-types';

import { supabase } from './supabase';

// Read-side of the shared catalog (universities/departments/courses are
// public-read, Edge-Function-only write — see CLAUDE.md). These map DB rows
// (snake_case, time slots as a joined table) onto the shared-types shapes
// the rest of the app (and the ported color/time/layout logic) expects.

export function useUniversity(universityId: string | null | undefined) {
  return useQuery({
    queryKey: ['university', universityId],
    queryFn: async (): Promise<University> => {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, short_name, max_credits_per_semester')
        .eq('id', universityId as string)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        shortName: data.short_name,
        maxCreditsPerSemester: data.max_credits_per_semester,
      };
    },
    enabled: Boolean(universityId),
  });
}

export function useDepartments(universityId: string | null | undefined) {
  return useQuery({
    queryKey: ['departments', universityId],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, university_id, code, name')
        .eq('university_id', universityId as string)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((d) => ({ id: d.id, universityId: d.university_id, code: d.code, name: d.name }));
    },
    enabled: Boolean(universityId),
  });
}

interface CourseTimeSlotRow {
  day: DayOfWeek;
  start_time: string;
  end_time: string;
}

interface CourseRow {
  id: string;
  department_id: string;
  code: string;
  name: string;
  credits: number | string;
  category: Course['category'];
  instructor: string | null;
  course_time_slots: CourseTimeSlotRow[];
}

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    departmentId: row.department_id,
    code: row.code,
    name: row.name,
    credits: Number(row.credits),
    category: row.category,
    instructor: row.instructor ?? undefined,
    // Postgres `time` comes back as "HH:MM:SS" over PostgREST; TimeSlot
    // expects the prototype's "HH:MM" shape.
    schedule: (row.course_time_slots ?? []).map((s) => ({
      day: s.day,
      start: s.start_time.slice(0, 5),
      end: s.end_time.slice(0, 5),
    })),
  };
}

/**
 * Fetches every course in a department (unfiltered) and builds the shared
 * color map from it — see CLAUDE.md: colors must come from the full
 * department fetch, sorted by code, never a per-component filtered subset,
 * so a course renders the same color in the course list, cart, schedule
 * grid, and loadout comparison alike.
 */
export function useDepartmentCourses(departmentId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['courses', departmentId],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select(
          'id, department_id, code, name, credits, category, instructor, course_time_slots(day, start_time, end_time)'
        )
        .eq('department_id', departmentId as string)
        .order('code');
      if (error) throw error;
      return (data ?? []).map(toCourse);
    },
    enabled: Boolean(departmentId),
  });

  const courses = query.data ?? [];
  const colorMap = useMemo(() => buildColorMap(courses), [courses]);
  const coursesById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  return { ...query, courses, colorMap, coursesById };
}
