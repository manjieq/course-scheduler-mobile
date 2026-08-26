import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { AddDepartmentForm } from '../../components/courses/AddDepartmentForm';
import { CategoryTabs } from '../../components/courses/CategoryTabs';
import type { CourseCategoryTab } from '../../components/courses/CategoryTabs';
import { CourseList } from '../../components/courses/CourseList';
import { ErrorState } from '../../components/common/ErrorState';
import { DepartmentSelector } from '../../components/courses/DepartmentSelector';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useDepartments } from '../../lib/catalog';
import { getErrorMessage } from '../../lib/errors';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';
import { supabase } from '../../lib/supabase';

// Phase 3/layout-redesign: Postgres-backed Courses tab, porting the
// prototype's CoursesView. The persistent header + cart sheet now live in
// app/(tabs)/_layout.tsx (reachable from every tab, not just this one) —
// this screen only owns department/category selection and the course list
// itself. Department is still picked here like the prototype's
// DepartmentSelector, but persisted to profiles.department_id so the choice
// survives reload and stays in sync with the other tabs.
export default function CoursesScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const [isSwitchingDepartment, setIsSwitchingDepartment] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CourseCategoryTab>('major');

  const {
    data: departments = [],
    isLoading: isLoadingDepartments,
    isError: isDepartmentsError,
    refetch: refetchDepartments,
  } = useDepartments(universityId);
  const {
    courses,
    colorMap,
    isLoading: isLoadingCourses,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { addToCart, removeFromCart } = useCartMutations(scheduleId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const cartCourseIds = useMemo(() => new Set(scheduleCourses.map((r) => r.course_id)), [scheduleCourses]);

  const majorCourses = courses.filter((c) => c.category === 'core' || c.category === 'extended');
  const generalCourses = courses.filter((c) => c.category === 'compulsory' || c.category === 'elective');

  async function handleSelectDepartment(id: string) {
    if (!userId || id === departmentId) return;
    setIsSwitchingDepartment(true);
    const { error } = await supabase.from('profiles').update({ department_id: id }).eq('id', userId);
    setIsSwitchingDepartment(false);
    if (error) {
      Alert.alert('Could not switch department', getErrorMessage(error));
      return;
    }
    await refreshProfile();
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-3 pb-10">
        {isLoadingDepartments ? (
          <ActivityIndicator />
        ) : isDepartmentsError ? (
          <ErrorState message="Couldn't load departments." onRetry={refetchDepartments} />
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

        {universityId && <AddDepartmentForm universityId={universityId} onAdded={handleSelectDepartment} />}

        {!departmentId ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            Pick a department to see available courses.
          </Text>
        ) : isLoadingCourses ? (
          <ActivityIndicator />
        ) : isCoursesError ? (
          <ErrorState message="Couldn't load courses." onRetry={refetchCourses} />
        ) : (
          <>
            <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
            {activeCategory === 'major' ? (
              <CourseList
                title="Major Courses (Core & Extended)"
                courses={majorCourses}
                cartCourseIds={cartCourseIds}
                colorFor={colorFor}
                onAdd={(id) => addToCart.mutate(id)}
                onRemove={(id) => removeFromCart.mutate(id)}
              />
            ) : (
              <CourseList
                title="General Courses (Compulsory & Elective)"
                courses={generalCourses}
                cartCourseIds={cartCourseIds}
                colorFor={colorFor}
                onAdd={(id) => addToCart.mutate(id)}
                onRemove={(id) => removeFromCart.mutate(id)}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
