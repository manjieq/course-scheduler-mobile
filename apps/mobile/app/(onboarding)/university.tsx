import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

interface UniversityRow {
  id: string;
  name: string;
  short_name: string;
  status: 'pending_review' | 'approved' | 'merged';
}

// Mandatory pre-app screen (see CLAUDE.md's Gap 2): search the shared
// `universities` table, or self-serve-add one that isn't listed yet (goes
// in as status='pending_review' per the RLS insert policy — usable by this
// user immediately, excluded from cross-user catalog reuse until approved).
// Confirm writes profiles.university_id + onboarding_completed_at, which is
// what the root layout's routing gate checks to let the user into (tabs).
export default function UniversityOnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Surfaced after a real case: a self-serve university silently kept the
  // `max_credits_per_semester` column default of 18, which was wrong for
  // that school. Optional here (defaults to 18 if left blank) since most
  // people won't know their cap off the top of their head at signup — it's
  // also editable later from the Cart sheet while the university is still
  // pending_review (see 0007_universities_credit_cap_self_edit.sql).
  const [creditsCap, setCreditsCap] = useState('');
  // Surfaced after a real case: "Hanyang ERICA University" naively sliced
  // to 12 chars landed mid-word at "Hanyang ERIC". shortName starts empty
  // so the TextInput below shows a *live* suggested default derived from
  // the query — the moment the user actually edits it, this state takes
  // over and stops following the query.
  const [shortName, setShortName] = useState('');

  const {
    data: universities,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['universities', query],
    queryFn: async (): Promise<UniversityRow[]> => {
      let request = supabase.from('universities').select('id, name, short_name, status').order('name').limit(25);
      if (query.trim()) {
        request = request.or(`name.ilike.%${query.trim()}%,short_name.ilike.%${query.trim()}%`);
      }
      const { data, error: queryError } = await request;
      if (queryError) throw queryError;
      return data ?? [];
    },
  });

  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(
    () => (universities ?? []).some((u) => u.name.toLowerCase() === trimmedQuery.toLowerCase()),
    [universities, trimmedQuery]
  );

  async function completeOnboarding(universityId: string) {
    if (!session) return;
    setIsSaving(true);
    setError(null);

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: session.user.id,
      university_id: universityId,
      onboarding_completed_at: new Date().toISOString(),
    });

    setIsSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    // No explicit navigation — the routing gate in app/_layout.tsx re-reads
    // the profile and redirects into (tabs) once onboarding_completed_at is set.
    await refreshProfile();
  }

  async function handleSelectExisting(university: UniversityRow) {
    setSelectedId(university.id);
    await completeOnboarding(university.id);
  }

  async function handleAddNew() {
    if (!session || !trimmedQuery) return;
    setIsSaving(true);
    setError(null);

    const parsedCap = Number(creditsCap);
    const maxCreditsPerSemester = creditsCap.trim() && Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : 18;

    const { data, error: insertError } = await supabase
      .from('universities')
      .insert({
        name: trimmedQuery,
        short_name: shortName.trim() || trimmedQuery.slice(0, 12),
        created_by: session.user.id,
        max_credits_per_semester: maxCreditsPerSemester,
      })
      .select('id')
      .single();

    if (insertError) {
      setIsSaving(false);
      setError(insertError.message);
      return;
    }

    setSelectedId(data.id);
    await completeOnboarding(data.id);
    refetch();
  }

  return (
    <View className="flex-1 gap-4 bg-white p-6 pt-16 dark:bg-neutral-950">
      <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Which university do you attend?
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        Search for your school, or add it if it&apos;s not listed yet.
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search universities…"
        placeholderTextColor="#9ca3af"
        autoCapitalize="words"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
      />

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={universities}
          keyExtractor={(item) => item.id}
          className="flex-1"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectExisting(item)}
              disabled={isSaving}
              className="flex-row items-center justify-between border-b border-neutral-200 py-3 disabled:opacity-50 dark:border-neutral-800"
            >
              <Text className="text-base text-neutral-900 dark:text-neutral-50">{item.name}</Text>
              {isSaving && selectedId === item.id ? <ActivityIndicator size="small" /> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            trimmedQuery ? (
              <Text className="py-3 text-sm text-neutral-500 dark:text-neutral-400">No matches.</Text>
            ) : null
          }
        />
      )}

      {trimmedQuery && !hasExactMatch ? (
        <View className="gap-2">
          <TextInput
            value={shortName || trimmedQuery.slice(0, 12)}
            onChangeText={setShortName}
            placeholder="Short name / abbreviation"
            placeholderTextColor="#9ca3af"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
          />
          <TextInput
            value={creditsCap}
            onChangeText={setCreditsCap}
            placeholder="Credits per semester cap (defaults to 18)"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
          />
          <Pressable
            onPress={handleAddNew}
            disabled={isSaving}
            className="w-full items-center rounded-xl bg-neutral-900 py-3 disabled:opacity-50 dark:bg-neutral-100"
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-medium text-white dark:text-neutral-900">
                Add &quot;{trimmedQuery}&quot; as a new university
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
