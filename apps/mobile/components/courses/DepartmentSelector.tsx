import { Pressable, ScrollView, Text } from 'react-native';

import type { Department } from '@course-scheduler/shared-types';

interface DepartmentSelectorProps {
  departments: Department[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

// Ported from the prototype's DepartmentSelector.tsx (a vertical option
// list -> a horizontal chip row, better suited to a phone-width screen).
export function DepartmentSelector({ departments, selectedId, onSelect, disabled }: DepartmentSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
      {departments.map((d) => {
        const active = d.id === selectedId;
        return (
          <Pressable
            key={d.id}
            onPress={() => onSelect(d.id)}
            disabled={disabled}
            className={`rounded-full border px-4 py-2 disabled:opacity-50 ${
              active
                ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950'
            }`}
          >
            <Text
              className={
                active
                  ? 'text-sm font-medium text-white dark:text-neutral-900'
                  : 'text-sm text-neutral-700 dark:text-neutral-300'
              }
            >
              {d.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
