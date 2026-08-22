import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';

import { useExtractionReview } from '../lib/extraction-review-context';
import { useExtractCourseScan } from '../lib/extraction';

// Phase 4: photo -> extract-course-scan -> apps/mobile's shared
// confirm/edit review screen (app/confirm-courses.tsx). Nothing here ever
// saves to the courses table — that only happens after the user confirms.
export default function ScanScreen() {
  const router = useRouter();
  const { setPending } = useExtractionReview();
  const extract = useExtractCourseScan();

  const [image, setImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);

  async function pickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', fromCamera ? 'Camera access is required to scan a course.' : 'Photo library access is required.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    setImage({ uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  async function handleExtract() {
    if (!image) return;
    try {
      const extraction = await extract.mutateAsync({ imageBase64: image.base64, mimeType: image.mimeType });
      setPending(extraction);
      router.replace('/confirm-courses');
    } catch (err) {
      Alert.alert('Extraction failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <View className="flex-1 gap-4 bg-white p-4 dark:bg-neutral-950">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        Take or choose a photo of your portal's course listing. Nothing is saved until you confirm it on the next
        screen.
      </Text>

      {image ? (
        <Image source={{ uri: image.uri }} className="h-64 w-full rounded-xl" resizeMode="contain" />
      ) : (
        <View className="h-64 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <Text className="text-sm text-neutral-400 dark:text-neutral-600">No photo selected</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => pickImage(true)}
          className="flex-1 items-center rounded-xl border border-neutral-300 py-3 dark:border-neutral-700"
        >
          <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Take Photo</Text>
        </Pressable>
        <Pressable
          onPress={() => pickImage(false)}
          className="flex-1 items-center rounded-xl border border-neutral-300 py-3 dark:border-neutral-700"
        >
          <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Choose Photo</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleExtract}
        disabled={!image || extract.isPending}
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
