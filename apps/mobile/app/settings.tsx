import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../lib/auth-context';
import { useUniversity, useUpdateCreditCap, useUpdateShortName } from '../lib/catalog';

// Phase 5: the real settings screen the Phase 4 note promised — a header
// icon button opening a modal, same pattern as scan/chat (see
// app/_layout.tsx's Stack.Screen registration and AppHeader's ⚙️ button).
// Takes over two things that were living somewhere else out of necessity:
//   - Sign out, previously a "temporary Phase 2" link at the bottom of
//     courses.tsx.
//   - The university short-name/credit-cap self-serve edit fields,
//     previously stuffed into CartSheet with a comment admitting they
//     weren't really "cart" content — CartSheet is back to just being
//     about course selection now.
// Phase 6's theming toggle has a marked spot below to land in once it
// exists.
export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const universityId = profile?.university_id ?? null;

  const { data: university } = useUniversity(universityId);
  const updateCreditCap = useUpdateCreditCap(universityId);
  const updateShortName = useUpdateShortName(universityId);

  const isEditable = university?.status === 'pending_review';

  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(String(university?.maxCreditsPerSemester ?? ''));

  function handleSaveCap() {
    const next = Number(capInput);
    if (!Number.isFinite(next) || next <= 0) return;
    updateCreditCap.mutate(next);
    setIsEditingCap(false);
  }

  const [isEditingName, setIsEditingName] = useState(false);
  const [shortNameInput, setShortNameInput] = useState(university?.shortName ?? '');

  function handleSaveShortName() {
    const trimmed = shortNameInput.trim();
    if (!trimmed) return;
    updateShortName.mutate(trimmed);
    setIsEditingName(false);
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-10">
        <View className="gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
            University
          </Text>
          <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
            {university?.name ?? '—'}
          </Text>
        </View>

        {/* Only offered while the university is still pending_review — a
            wrong value on an approved/curated university needs an admin,
            not a per-user override. See 0007/0008 migrations' RLS. */}
        {isEditable && (
          <View className="gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">Short name</Text>
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={shortNameInput}
                    onChangeText={setShortNameInput}
                    autoFocus
                    className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                  />
                  <Pressable onPress={handleSaveShortName} disabled={updateShortName.isPending} hitSlop={8}>
                    {updateShortName.isPending ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-neutral-900 dark:text-neutral-50">Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setShortNameInput(university?.shortName ?? '');
                    setIsEditingName(true);
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {university?.shortName}
                  </Text>
                  <Text className="text-xs text-neutral-400 dark:text-neutral-600">(edit)</Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">Credits per semester cap</Text>
              {isEditingCap ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={capInput}
                    onChangeText={setCapInput}
                    keyboardType="number-pad"
                    autoFocus
                    className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                  />
                  <Pressable onPress={handleSaveCap} disabled={updateCreditCap.isPending} hitSlop={8}>
                    {updateCreditCap.isPending ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-neutral-900 dark:text-neutral-50">Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setCapInput(String(university?.maxCreditsPerSemester ?? ''));
                    setIsEditingCap(true);
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {university?.maxCreditsPerSemester}
                  </Text>
                  <Text className="text-xs text-neutral-400 dark:text-neutral-600">(edit)</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Phase 6 spot: theming toggle goes here once it exists. */}

        <Pressable
          onPress={signOut}
          className="mt-4 items-center rounded-xl border border-neutral-200 py-3 dark:border-neutral-800"
        >
          <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
