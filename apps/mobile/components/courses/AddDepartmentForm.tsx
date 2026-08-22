import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '../../lib/supabase';

interface AddDepartmentFormProps {
  universityId: string;
  /** Called with the new department's id so the caller can auto-select it. */
  onAdded: (departmentId: string) => void;
}

// Mirrors app/(onboarding)/university.tsx's self-serve-add pattern (direct
// table insert, gated by RLS rather than an Edge Function — see
// 0005_departments_self_serve_insert.sql's insert policy) — closes the gap
// where a self-serve-added university had no departments and no way to
// ever get one. Collapsed behind a toggle rather than always-open like
// LoadoutSaveForm: most users are on a seeded university that already has
// departments, so this should stay out of the way for them.
export function AddDepartmentForm({ universityId, onAdded }: AddDepartmentFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIsOpen(false);
    setCode('');
    setName('');
    setError(null);
  }

  async function handleSave() {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setError('Both a code and a name are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('departments')
      .insert({ university_id: universityId, code: trimmedCode, name: trimmedName })
      .select('id')
      .single();

    setIsSaving(false);
    if (insertError) {
      // 23505 = unique_violation on (university_id, code) — the one
      // conflict a user is actually likely to hit here.
      setError(insertError.code === '23505' ? 'A department with that code already exists.' : insertError.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['departments', universityId] });
    onAdded(data.id);
    reset();
  }

  if (!isOpen) {
    return (
      <Pressable onPress={() => setIsOpen(true)} className="self-start px-1 py-2">
        <Text className="text-sm font-medium text-neutral-500 underline dark:text-neutral-400">
          + Add a department
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <View className="flex-row gap-2">
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Code (e.g. CS)"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
        />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (e.g. Computer Science)"
          placeholderTextColor="#9ca3af"
          className="flex-[2] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
        />
      </View>

      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text> : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className="flex-1 items-center rounded-lg bg-neutral-900 py-2 disabled:opacity-50 dark:bg-neutral-100"
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-sm font-medium text-white dark:text-neutral-900">Save</Text>
          )}
        </Pressable>
        <Pressable onPress={reset} disabled={isSaving} className="flex-1 items-center rounded-lg border border-neutral-300 py-2 dark:border-neutral-700">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
