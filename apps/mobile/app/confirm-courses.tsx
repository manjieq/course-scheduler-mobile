import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { CourseDraftForm, draftFromExtracted, toConfirmInput } from '../components/extraction/CourseDraftForm';
import type { EditableCourseDraft } from '../components/extraction/CourseDraftForm';
import { useAuth } from '../lib/auth-context';
import { getErrorMessage } from '../lib/errors';
import { useConfirmCourse } from '../lib/extraction';
import { useExtractionReview } from '../lib/extraction-review-context';
import { useCartMutations, useSchedule } from '../lib/schedule-data';

// Phase 4: the one screen both scan.tsx and chat.tsx converge on (see
// CLAUDE.md — Scan and Chat "both converg[e] on the same review/edit
// confirmation screen before anything saves"). Confirming a draft writes it
// to the shared `courses` catalog via confirm-course, then adds it straight
// to the user's live schedule — the point of scanning/describing a class is
// to get it onto the schedule, not just into the catalog.
export default function ConfirmCoursesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pending, setPending } = useExtractionReview();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const universityId = profile?.university_id ?? null;
  const departmentId = profile?.department_id ?? null;

  const { data: scheduleId } = useSchedule(userId, universityId, departmentId);
  const { addToCart } = useCartMutations(scheduleId);
  const confirmCourse = useConfirmCourse();

  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<EditableCourseDraft[]>(() => pending?.courses.map(draftFromExtracted) ?? []);

  if (!pending || drafts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white p-4 dark:bg-neutral-950">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">Nothing to confirm right now.</Text>
        <Pressable onPress={() => router.back()} className="rounded-lg bg-neutral-900 px-4 py-2 dark:bg-neutral-100">
          <Text className="text-sm font-medium text-white dark:text-neutral-900">Close</Text>
        </Pressable>
      </View>
    );
  }

  const current = drafts[index];

  function updateCurrent(next: EditableCourseDraft) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? next : d)));
  }

  function finishReview() {
    setPending(null);
    router.back();
  }

  async function handleConfirm() {
    const input = toConfirmInput(current);
    if (!input) {
      Alert.alert('Missing info', 'Fill in code, name, credits, and category.');
      return;
    }

    try {
      const result = await confirmCourse.mutateAsync(input);
      // confirm-course writes with the service-role client, entirely
      // server-side — the mobile app's cached department course list has
      // no idea the new/corrected row exists until this fires. Without it,
      // the cart/schedule looked empty right after confirming (the cart
      // query itself was fresh, but it renders by looking courses up in
      // this now-stale list) until something unrelated happened to
      // refetch it.
      await queryClient.invalidateQueries({ queryKey: ['courses', departmentId] });
      if (scheduleId) addToCart.mutate(result.courseId);

      if (index + 1 < drafts.length) {
        setIndex(index + 1);
      } else {
        Alert.alert(
          result.wasCorrection ? 'Correction saved' : 'Course added',
          result.wasCorrection
            ? 'This updated an existing catalog course and logged the change.'
            : 'Added to the shared catalog and your schedule.',
          [{ text: 'Done', onPress: finishReview }]
        );
      }
    } catch (err) {
      Alert.alert('Confirm failed', getErrorMessage(err));
    }
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" contentContainerClassName="gap-4 p-4 pb-10">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
        Course {index + 1} of {drafts.length}
      </Text>

      <CourseDraftForm value={current} onChange={updateCurrent} />

      <Pressable
        onPress={handleConfirm}
        disabled={confirmCourse.isPending}
        className="items-center rounded-xl bg-neutral-900 py-3 disabled:opacity-50 dark:bg-neutral-100"
      >
        {confirmCourse.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-medium text-white dark:text-neutral-900">
            {index + 1 < drafts.length ? 'Confirm & Next' : 'Confirm'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
