import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';

// Immutable point-in-time snapshots (see CLAUDE.md): saving copies the
// included courses + a frozen total_credits into new loadouts/loadout_courses
// rows and never touches the live schedule; there's no update path for
// loadout_courses once written.

export interface LoadoutRow {
  id: string;
  name: string;
  universityId: string;
  departmentId: string;
  totalCredits: number;
  createdAt: string;
  courseIds: string[];
}

interface LoadoutQueryRow {
  id: string;
  name: string;
  university_id: string;
  department_id: string;
  total_credits: number | string;
  created_at: string;
  loadout_courses: { course_id: string }[];
}

export function useLoadouts(userId: string | undefined, departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['loadouts', userId, departmentId],
    queryFn: async (): Promise<LoadoutRow[]> => {
      const { data, error } = await supabase
        .from('loadouts')
        .select('id, name, university_id, department_id, total_credits, created_at, loadout_courses(course_id)')
        .eq('user_id', userId as string)
        .eq('department_id', departmentId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l: LoadoutQueryRow) => ({
        id: l.id,
        name: l.name,
        universityId: l.university_id,
        departmentId: l.department_id,
        totalCredits: Number(l.total_credits),
        createdAt: l.created_at,
        courseIds: (l.loadout_courses ?? []).map((lc) => lc.course_id),
      }));
    },
    enabled: Boolean(userId && departmentId),
  });
}

export function useLoadoutMutations(
  userId: string | undefined,
  universityId: string | null | undefined,
  departmentId: string | null | undefined,
  scheduleId: string | undefined
) {
  const queryClient = useQueryClient();
  const invalidateLoadouts = () => queryClient.invalidateQueries({ queryKey: ['loadouts', userId, departmentId] });

  // SAVE_LOADOUT: insert the loadout row, then its frozen course list.
  const saveLoadout = useMutation({
    mutationFn: async ({
      name,
      courseIds,
      totalCredits,
    }: {
      name: string;
      courseIds: string[];
      totalCredits: number;
    }) => {
      const { data: loadout, error: insertError } = await supabase
        .from('loadouts')
        .insert({
          user_id: userId,
          university_id: universityId,
          department_id: departmentId,
          name,
          total_credits: totalCredits,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      if (courseIds.length > 0) {
        const { error: coursesError } = await supabase
          .from('loadout_courses')
          .insert(courseIds.map((courseId) => ({ loadout_id: loadout.id, course_id: courseId })));
        if (coursesError) throw coursesError;
      }
    },
    onSuccess: invalidateLoadouts,
  });

  // DELETE_LOADOUT — cascades to loadout_courses via the FK.
  const deleteLoadout = useMutation({
    mutationFn: async (loadoutId: string) => {
      const { error } = await supabase.from('loadouts').delete().eq('id', loadoutId);
      if (error) throw error;
    },
    onSuccess: invalidateLoadouts,
  });

  // LOAD_LOADOUT: per CLAUDE.md, this *upserts* the loadout's courses back
  // into the live schedule rather than replacing it wholesale — a
  // deliberate deviation from the prototype's full-cart-replace, since the
  // schedule is now a persistent row other courses may already live in,
  // not ephemeral in-memory state reset on every selection change.
  const loadLoadout = useMutation({
    mutationFn: async (courseIds: string[]) => {
      if (!scheduleId || courseIds.length === 0) return;
      const { error } = await supabase
        .from('schedule_courses')
        .upsert(
          courseIds.map((courseId) => ({ schedule_id: scheduleId, course_id: courseId, included: true })),
          { onConflict: 'schedule_id,course_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-courses', scheduleId] }),
  });

  return { saveLoadout, deleteLoadout, loadLoadout };
}
