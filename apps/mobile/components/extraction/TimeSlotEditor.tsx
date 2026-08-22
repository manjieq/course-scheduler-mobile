import { Pressable, Text, TextInput, View } from 'react-native';

import { DAYS_OF_WEEK } from '@course-scheduler/shared-types';
import type { ExtractedTimeSlotDraft } from '@course-scheduler/shared-types';

interface TimeSlotEditorProps {
  value: ExtractedTimeSlotDraft[];
  onChange: (slots: ExtractedTimeSlotDraft[]) => void;
}

const DEFAULT_SLOT: ExtractedTimeSlotDraft = { day: 'MON', start: '09:00', end: '10:00' };

// Lets the user correct whatever the AI got wrong about meeting times
// before confirming — a course can meet more than once a week, so this
// edits a list, not a single slot (add/remove rows, day chips per row,
// same filled/outline chip convention as IncludedCoursesStrip).
export function TimeSlotEditor({ value, onChange }: TimeSlotEditorProps) {
  function updateSlot(index: number, patch: Partial<ExtractedTimeSlotDraft>) {
    onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function removeSlot(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addSlot() {
    onChange([...value, DEFAULT_SLOT]);
  }

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Meeting times
      </Text>

      {value.map((slot, index) => (
        <View key={index} className="gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <View className="flex-row flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const active = day === slot.day;
              return (
                <Pressable
                  key={day}
                  onPress={() => updateSlot(index, { day })}
                  className={`rounded-full px-2.5 py-1 ${
                    active ? 'bg-neutral-900 dark:bg-neutral-100' : 'border border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row items-center gap-2">
            <TextInput
              value={slot.start}
              onChangeText={(start) => updateSlot(index, { start })}
              placeholder="09:00"
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
            />
            <Text className="text-neutral-400">–</Text>
            <TextInput
              value={slot.end}
              onChangeText={(end) => updateSlot(index, { end })}
              placeholder="10:00"
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
            />
            <Pressable onPress={() => removeSlot(index)} className="px-2 py-2">
              <Text className="text-sm text-red-600 dark:text-red-400">Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable onPress={addSlot} className="items-center rounded-lg border border-dashed border-neutral-300 py-2 dark:border-neutral-700">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">+ Add meeting time</Text>
      </Pressable>
    </View>
  );
}
