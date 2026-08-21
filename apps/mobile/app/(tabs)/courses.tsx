import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { CartSheet } from '../../components/cart/CartSheet';
import { CourseList } from '../../components/courses/CourseList';
import { DepartmentSelector } from '../../components/courses/DepartmentSelector';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useDepartments, useUniversity } from '../../lib/catalog';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';
import { supabase } from '../../lib/supabase';

// Phase 3: Postgres-backed Courses tab, porting the prototype's
// CoursesView + Header's cart toggle. University comes from the profile
// (server-resolved at onboarding — see CLAUDE.md's Gap 2), not a selector.
// Department is still picked here like the prototype's DepartmentSelector,
// but persisted to profiles.department_id so the choice survives reload and
// stays in sync with the Schedule tab, instead of living in session-only
// reducer state.
export default function CoursesScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const [isSwitchingDepartment, setIsSwitchingDepartment] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: university } = useUniversity(universityId);
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(universityId);
  const { courses, colorMap, isLoading: isLoadingCourses } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { addToCart, removeFromCart, toggleIncluded } = useCartMutations(scheduleId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const cartCourseIds = useMemo(() => new Set(scheduleCourses.map((r) => r.course_id)), [scheduleCourses]);
  const includedIds = useMemo(
    () => new Set(scheduleCourses.filter((r) => r.included).map((r) => r.course_id)),
    [scheduleCourses]
  );
  const cartCourses = useMemo(() => courses.filter((c) => cartCourseIds.has(c.id)), [courses, cartCourseIds]);

  const majorCourses = courses.filter((c) => c.category === 'core' || c.category === 'extended');
  const generalCourses = courses.filter((c) => c.category === 'compulsory' || c.category === 'elective');

  async function handleSelectDepartment(id: string) {
    if (!userId || id === departmentId) return;
    setIsSwitchingDepartment(true);
    const { error } = await supabase.from('profiles').update({ department_id: id }).eq('id', userId);
    setIsSwitchingDepartment(false);
    if (error) {
      console.error('Failed to switch department', error);
      return;
    }
    await refreshProfile();
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-3 pb-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {university?.shortName ?? 'Courses'}
          </Text>
          <Pressable
            onPress={() => setIsCartOpen(true)}
            className="flex-row items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 dark:bg-neutral-100"
          >
            <Text className="text-sm font-medium text-white dark:text-neutral-900">🛒 Cart</Text>
            {cartCourseIds.size > 0 && (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-900">
                <Text className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {cartCourseIds.size}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {isLoadingDepartments ? (
          <ActivityIndicator />
        ) : departments.length === 0 ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            No departments are set up for your university yet.
          </Text>
        ) : (
          <DepartmentSelector
            departments={departments}
            selectedId={departmentId}
            onSelect={handleSelectDepartment}
            disabled={isSwitchingDepartment}
          />
        )}

        {!departmentId ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            Pick a department to see available courses.
          </Text>
        ) : isLoadingCourses ? (
          <ActivityIndicator />
        ) : (
          <>
            <CourseList
              title="Major Courses (Core & Extended)"
              courses={majorCourses}
              cartCourseIds={cartCourseIds}
              colorFor={colorFor}
              onAdd={(id) => addToCart.mutate(id)}
              onRemove={(id) => removeFromCart.mutate(id)}
            />
            <CourseList
              title="General Courses (Compulsory & Elective)"
              courses={generalCourses}
              cartCourseIds={cartCourseIds}
              colorFor={colorFor}
              onAdd={(id) => addToCart.mutate(id)}
              onRemove={(id) => removeFromCart.mutate(id)}
            />
          </>
        )}

        {/* Temporary Phase 2 testing affordance, carried forward — moves
            once Phase 6 adds a real settings screen. */}
        <Pressable onPress={signOut} className="mt-2 self-center">
          <Text className="text-xs text-neutral-400 underline dark:text-neutral-600">Sign out</Text>
        </Pressable>
      </ScrollView>

      {university && (
        <CartSheet
          visible={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartCourses={cartCourses}
          includedIds={includedIds}
          maxCredits={university.maxCreditsPerSemester}
          colorFor={colorFor}
          onRemove={(id) => removeFromCart.mutate(id)}
          onToggleIncluded={(id, included) => toggleIncluded.mutate({ courseId: id, included })}
        />
      )}
    </View>
  );
}
