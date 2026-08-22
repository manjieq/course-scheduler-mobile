import { Pressable, Text, TextInput, View } from 'react-native';

import { CATEGORY_LABELS } from '@course-scheduler/shared-types';
import type { CourseCategory, ExtractedCourseDraft, ExtractedTimeSlotDraft } from '@course-scheduler/shared-types';

import { TimeSlotEditor } from './TimeSlotEditor';

// The AI never fills in `category` (see CLAUDE.md's Phase 4 notes — a
// listing photo doesn't reveal major-core vs. general-elective for a given
// student), so it starts unset here and Confirm is disabled until the user
// picks one. Credits is kept as a string while editing to avoid fighting
// TextInput over a numeric value mid-type; parsed back to a number only
// when building the confirm request (see toConfirmInput).
export interface EditableCourseDraft {
  code: string;
  name: string;
  credits: string;
  instructor: string;
  category: CourseCategory | '';
  timeSlots: ExtractedTimeSlotDraft[];
}

export function draftFromExtracted(draft: ExtractedCourseDraft): EditableCourseDraft {
  return {
    code: draft.code,
    name: draft.name,
    credits: String(draft.credits),
    instructor: draft.instructor ?? '',
    category: '',
    timeSlots: draft.timeSlots,
  };
}

/** Returns the confirm-course request body, or null if the form isn't valid yet. */
export function toConfirmInput(
  draft: EditableCourseDraft
): (ExtractedCourseDraft & { category: CourseCategory }) | null {
  const credits = Number(draft.credits);
  if (!draft.code.trim() || !draft.name.trim() || !draft.category || !Number.isFinite(credits) || credits <= 0) {
    return null;
  }
  // No meeting-time requirement here: an async/TBD-schedule course
  // legitimately has none, and the editor already lets the user add a slot
  // themselves if the photo actually had one that just wasn't extracted.

  return {
    code: draft.code.trim(),
    name: draft.name.trim(),
    credits,
    category: draft.category,
    instructor: draft.instructor.trim() || undefined,
    timeSlots: draft.timeSlots,
  };
}

const CATEGORIES: CourseCategory[] = ['core', 'extended', 'compulsory', 'elective'];

interface CourseDraftFormProps {
  value: EditableCourseDraft;
  onChange: (value: EditableCourseDraft) => void;
}

export function CourseDraftForm({ value, onChange }: CourseDraftFormProps) {
  function set<K extends keyof EditableCourseDraft>(key: K, next: EditableCourseDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Code
          </Text>
          <TextInput
            value={value.code}
            onChangeText={(code) => set('code', code)}
            autoCapitalize="characters"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
          />
        </View>
        <View className="w-24 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Credits
          </Text>
          <TextInput
            value={value.credits}
            onChangeText={(credits) => set('credits', credits)}
            keyboardType="decimal-pad"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
          />
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Name
        </Text>
        <TextInput
          value={value.name}
          onChangeText={(name) => set('name', name)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
        />
      </View>

      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Instructor (optional)
        </Text>
        <TextInput
          value={value.instructor}
          onChangeText={(instructor) => set('instructor', instructor)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
        />
      </View>

      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Category
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {CATEGORIES.map((category) => {
            const active = category === value.category;
            return (
              <Pressable
                key={category}
                onPress={() => set('category', category)}
                className={`rounded-full px-3 py-1.5 ${
                  active ? 'bg-neutral-900 dark:bg-neutral-100' : 'border border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!value.category && (
          <Text className="text-xs text-amber-600 dark:text-amber-400">Pick a category before confirming.</Text>
        )}
      </View>

      <TimeSlotEditor value={value.timeSlots} onChange={(timeSlots) => set('timeSlots', timeSlots)} />
    </View>
  );
}
