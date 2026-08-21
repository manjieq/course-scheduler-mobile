import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

interface LoadoutSaveFormProps {
  disabled: boolean;
  isSaving: boolean;
  existingCount: number;
  onSave: (name: string) => void;
}

export function LoadoutSaveForm({ disabled, isSaving, existingCount, onSave }: LoadoutSaveFormProps) {
  const [name, setName] = useState('');

  function handleSubmit() {
    const trimmed = name.trim() || `Loadout ${existingCount + 1}`;
    onSave(trimmed);
    setName('');
  }

  return (
    <View className="mb-4 gap-2">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={`Loadout ${existingCount + 1}`}
        placeholderTextColor="#9ca3af"
        editable={!disabled}
        className="rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
      />
      <Pressable
        onPress={handleSubmit}
        disabled={disabled || isSaving}
        className="items-center rounded-xl bg-neutral-900 py-3 disabled:opacity-50 dark:bg-neutral-100"
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-medium text-white dark:text-neutral-900">Save current schedule as loadout</Text>
        )}
      </Pressable>
    </View>
  );
}
