import { Pressable, Text, View } from 'react-native';

export type CourseCategoryTab = 'major' | 'general';

interface CategoryTabsProps {
  active: CourseCategoryTab;
  onChange: (tab: CourseCategoryTab) => void;
}

const TABS: { id: CourseCategoryTab; label: string }[] = [
  { id: 'major', label: 'Major' },
  { id: 'general', label: 'General' },
];

// Splits the Courses tab's two full lists (previously stacked on one long
// scroll) into a segmented toggle, so each screenful is focused on one
// category at a time — more comfortable than scrolling past a whole major
// list to reach the general one.
export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <View className="flex-row rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className={`flex-1 items-center rounded-full py-2 ${isActive ? 'bg-white dark:bg-neutral-700' : ''}`}
          >
            <Text
              className={
                isActive
                  ? 'text-sm font-semibold text-neutral-900 dark:text-neutral-50'
                  : 'text-sm text-neutral-500 dark:text-neutral-400'
              }
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
