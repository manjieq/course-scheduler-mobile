import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

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
  /** Only passed when the current university's cap is actually editable — see lib/catalog.ts's useUpdateCreditCap. */
  onEditCreditCap?: (nextCap: number) => void;
  isEditingCreditCap?: boolean;
  universityShortName?: string;
  /** Only passed when self-serve-editable — see lib/catalog.ts's useUpdateShortName. */
  onEditShortName?: (nextShortName: string) => void;
  isEditingShortName?: boolean;
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
  onEditCreditCap,
  isEditingCreditCap,
  universityShortName,
  onEditShortName,
  isEditingShortName,
}: CartSheetProps) {
  const includedCourses = cartCourses.filter((c) => includedIds.has(c.id));
  const cartTotal = sumCredits(cartCourses);
  const includedTotal = sumCredits(includedCourses);
  const cartOverLimit = cartTotal > maxCredits;
  const includedOverLimit = includedTotal > maxCredits;
  const pct = Math.min(100, (includedTotal / maxCredits) * 100);

  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(String(maxCredits));

  function handleSaveCap() {
    const next = Number(capInput);
    if (!Number.isFinite(next) || next <= 0) return;
    onEditCreditCap?.(next);
    setIsEditingCap(false);
  }

  const [isEditingName, setIsEditingName] = useState(false);
  const [shortNameInput, setShortNameInput] = useState(universityShortName ?? '');

  function handleSaveShortName() {
    const trimmed = shortNameInput.trim();
    if (!trimmed) return;
    onEditShortName?.(trimmed);
    setIsEditingName(false);
  }

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

          {/* Not really "cart" content, but this is the one screen every
              tab can reach — placed here so it's not tucked away
              somewhere separate. Only rendered when self-serve-editable
              (see useUniversity's `status` gate in
              app/(tabs)/_layout.tsx); fixes a naive short_name default
              like "Hanyang ERIC" (sliced from "Hanyang ERICA University")
              without needing a database console. */}
          {universityShortName && onEditShortName && (
            <View className="mb-3 flex-row items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">University short name</Text>
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={shortNameInput}
                    onChangeText={setShortNameInput}
                    autoFocus
                    className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                  />
                  <Pressable onPress={handleSaveShortName} disabled={isEditingShortName} hitSlop={8}>
                    {isEditingShortName ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-neutral-900 dark:text-neutral-50">Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setIsEditingName(true)} className="flex-row items-center gap-1">
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {universityShortName}
                  </Text>
                  <Text className="text-xs text-neutral-400 dark:text-neutral-600">(edit)</Text>
                </Pressable>
              )}
            </View>
          )}

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
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400">Included in schedule</Text>
                  {isEditingCap ? (
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={capInput}
                        onChangeText={setCapInput}
                        keyboardType="number-pad"
                        autoFocus
                        className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                      />
                      <Pressable onPress={handleSaveCap} disabled={isEditingCreditCap} hitSlop={8}>
                        {isEditingCreditCap ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Text className="text-xs font-semibold text-neutral-900 dark:text-neutral-50">Save</Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={onEditCreditCap ? () => setIsEditingCap(true) : undefined}
                      className="flex-row items-center gap-1"
                    >
                      <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {includedTotal} / {maxCredits} credits
                      </Text>
                      {/* Only offered when the current university's cap is
                          actually editable — see useUniversity's `status`
                          gate in app/(tabs)/_layout.tsx. A wrong cap on an
                          approved/curated university needs an admin, not a
                          per-user override. */}
                      {onEditCreditCap && (
                        <Text className="text-xs text-neutral-400 dark:text-neutral-600">(edit)</Text>
                      )}
                    </Pressable>
                  )}
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
