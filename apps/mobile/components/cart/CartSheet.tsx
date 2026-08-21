import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { sumCredits } from '@course-scheduler/shared-types';
import type { Course } from '@course-scheduler/shared-types';

interface CartSheetProps {
  visible: boolean;
  onClose: () => void;
  cartCourses: Course[];
  includedIds: Set<string>;
  maxCredits: number;
  colorFor: (courseId: string) => string;
  onRemove: (courseId: string) => void;
  onToggleIncluded: (courseId: string, nextIncluded: boolean) => void;
}

// Ported from the prototype's CartPopout/Cart/CreditSummary/
// CreditLimitSelector, merged into one bottom sheet. One deliberate
// simplification for the smaller screen: every row's checkbox is always
// tappable to include/exclude it, rather than only appearing once the cart
// goes over the credit limit — a strict superset of the prototype's
// behavior, not a loss of it.
export function CartSheet({
  visible,
  onClose,
  cartCourses,
  includedIds,
  maxCredits,
  colorFor,
  onRemove,
  onToggleIncluded,
}: CartSheetProps) {
  const includedCourses = cartCourses.filter((c) => includedIds.has(c.id));
  const cartTotal = sumCredits(cartCourses);
  const includedTotal = sumCredits(includedCourses);
  const cartOverLimit = cartTotal > maxCredits;
  const includedOverLimit = includedTotal > maxCredits;
  const pct = Math.min(100, (includedTotal / maxCredits) * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="max-h-[80%] rounded-t-2xl bg-white p-5 dark:bg-neutral-950"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Cart</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">Close</Text>
            </Pressable>
          </View>

          {cartCourses.length === 0 ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              No courses added yet. Add some from the lists behind this sheet.
            </Text>
          ) : (
            <ScrollView>
              <View
                className={`mb-3 gap-2 rounded-xl border p-3 ${
                  includedOverLimit
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400">Cart total</Text>
                  <Text className="text-sm text-neutral-900 dark:text-neutral-50">{cartTotal} credits</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400">Included in schedule</Text>
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {includedTotal} / {maxCredits} credits
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <View
                    className={`h-full rounded-full ${includedOverLimit ? 'bg-red-500' : 'bg-neutral-900 dark:bg-neutral-100'}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
                {cartOverLimit && (
                  <Text className="text-xs text-red-600 dark:text-red-400">
                    Cart exceeds the {maxCredits}-credit limit — tick which courses to include below.
                  </Text>
                )}
              </View>

              {cartCourses.map((course) => {
                const included = includedIds.has(course.id);
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => onToggleIncluded(course.id, !included)}
                    className="mb-2 flex-row items-center gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-900"
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded border ${
                        included
                          ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                          : 'border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      {included && <Text className="text-xs text-white dark:text-neutral-900">✓</Text>}
                    </View>
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: colorFor(course.id) }} />
                    <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{course.code}</Text>
                    <Text className="flex-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
                      {course.name}
                      {!included && ' (excluded)'}
                    </Text>
                    <Pressable
                      onPress={() => onRemove(course.id)}
                      hitSlop={8}
                      className="h-6 w-6 items-center justify-center rounded-full bg-red-50 dark:bg-red-950"
                    >
                      <Text className="text-xs font-semibold text-red-600 dark:text-red-400">✕</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
