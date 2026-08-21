import { Pressable, Text, View } from 'react-native';

interface CartHeaderButtonProps {
  count: number;
  onPress: () => void;
}

// Pinned into the Courses screen's native header (see courses.tsx's
// navigation.setOptions) so it stays reachable regardless of scroll
// position, instead of scrolling away with the course list like the
// original in-content button did.
export function CartHeaderButton({ count, onPress }: CartHeaderButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="mr-2 flex-row items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 dark:bg-neutral-100"
    >
      <Text className="text-sm font-medium text-white dark:text-neutral-900">🛒</Text>
      {count > 0 && (
        <View className="h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-900">
          <Text className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">{count}</Text>
        </View>
      )}
    </Pressable>
  );
}
