import { Tabs } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartSheet } from '../../components/cart/CartSheet';
import { AppHeader } from '../../components/layout/AppHeader';
import { useAuth } from '../../lib/auth-context';
import { useDepartmentCourses, useUniversity, useUpdateCreditCap, useUpdateShortName } from '../../lib/catalog';
import { useCartMutations, useSchedule, useScheduleCourses } from '../../lib/schedule-data';

// Three tabs (Courses/Schedule/Loadouts — see app/(tabs)/loadouts.tsx) under
// one persistent header + cart sheet, so the cart is reachable no matter
// which tab is active. Previously it only opened from a button in the
// Courses screen's own native header, so Schedule/Loadouts had no cart
// access at all — this is the layout-redesign fix for that gap.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: university } = useUniversity(universityId);
  const { courses, colorMap } = useDepartmentCourses(departmentId);
  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { data: scheduleCourses = [] } = useScheduleCourses(scheduleId);
  const { removeFromCart, toggleIncluded } = useCartMutations(scheduleId);
  const updateCreditCap = useUpdateCreditCap(universityId);
  const updateShortName = useUpdateShortName(universityId);

  const colorFor = (courseId: string) => colorMap.get(courseId) ?? '#999999';

  const cartCourseIds = useMemo(() => new Set(scheduleCourses.map((r) => r.course_id)), [scheduleCourses]);
  const includedIds = useMemo(
    () => new Set(scheduleCourses.filter((r) => r.included).map((r) => r.course_id)),
    [scheduleCourses]
  );
  const cartCourses = useMemo(() => courses.filter((c) => cartCourseIds.has(c.id)), [courses, cartCourseIds]);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View style={{ paddingTop: insets.top }} className="bg-white dark:bg-neutral-950">
        <AppHeader
          universityShortName={university?.shortName}
          cartCount={cartCourseIds.size}
          onOpenCart={() => setIsCartOpen(true)}
        />
      </View>

      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
        <Tabs.Screen name="loadouts" options={{ title: 'Loadouts' }} />
      </Tabs>

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
          onEditCreditCap={
            university.status === 'pending_review' ? (next) => updateCreditCap.mutate(next) : undefined
          }
          isEditingCreditCap={updateCreditCap.isPending}
          universityShortName={university.shortName}
          onEditShortName={
            university.status === 'pending_review' ? (next) => updateShortName.mutate(next) : undefined
          }
          isEditingShortName={updateShortName.isPending}
        />
      )}
    </View>
  );
}
