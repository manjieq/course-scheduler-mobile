import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { useExtractionReview } from '../lib/extraction-review-context';
import { useExtractCourseChat } from '../lib/extraction';

// Phase 4: free-text description -> extract-course-chat -> the same
// confirm/edit review screen scan.tsx lands on (app/confirm-courses.tsx).
export default function ChatScreen() {
  const router = useRouter();
  const { setPending } = useExtractionReview();
  const extract = useExtractCourseChat();

  const [text, setText] = useState('');

  async function handleExtract() {
    if (!text.trim()) return;
    try {
      const extraction = await extract.mutateAsync({ text: text.trim() });
      setPending(extraction);
      router.replace('/confirm-courses');
    } catch (err) {
      Alert.alert('Extraction failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <View className="flex-1 gap-4 bg-white p-4 dark:bg-neutral-950">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        Describe a class — code, name, days/times, credits, instructor if you know it. Nothing is saved until you
        confirm it on the next screen.
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={'e.g. "CS201 Data Structures, Mon/Wed 10-11:30am, 4 credits, taught by Dr. Lee"'}
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        className="min-h-32 rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
      />

      <Pressable
        onPress={handleExtract}
        disabled={!text.trim() || extract.isPending}
        className="items-center rounded-xl bg-neutral-900 py-3 disabled:opacity-50 dark:bg-neutral-100"
      >
        {extract.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-medium text-white dark:text-neutral-900">Extract Course</Text>
        )}
      </Pressable>
    </View>
  );
}
