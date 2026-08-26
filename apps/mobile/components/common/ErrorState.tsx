import { Pressable, Text, View } from 'react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * For a failed query, not a failed mutation (mutations get an Alert — see
 * lib/errors.ts) — dropped in place of whatever content a screen would
 * otherwise render, so a fetch failure never gets misread as "there's
 * legitimately nothing here" (e.g. courses.tsx's "No departments are set
 * up" empty state, which used to render the same way for a real network
 * error). Phase 6, CLAUDE.md.
 */
export function ErrorState({ message = "Couldn't load this — check your connection and try again.", onRetry }: ErrorStateProps) {
  return (
    <View className="items-center gap-2 rounded-xl border border-dashed border-red-300 p-6 dark:border-red-800">
      <Text className="text-center text-sm text-red-600 dark:text-red-400">{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={8} className="rounded-lg border border-red-300 px-3 py-1.5 dark:border-red-800">
          <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
