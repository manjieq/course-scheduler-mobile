import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme, useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';

// Phase 6: the theming toggle app/settings.tsx already had a spot marked
// for it. The app already styles everything with NativeWind's `dark:`
// variant (tailwind.config.js's `darkMode: 'media'`), driven purely by the
// OS scheme — this adds a per-user override on top, not a parallel styling
// system. NativeWind v4's colorScheme.set() calls React Native's own
// Appearance.setColorScheme() under the hood, which is what every existing
// `dark:` class already reacts to — no component needed a single class
// name changed for this to work.
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Persists and applies a theme choice — see app/settings.tsx. colorScheme.set
 * drives every `dark:` class in the app immediately, but is in-memory only;
 * the AsyncStorage write here is what makes the choice survive an app
 * restart, read back by useThemeRestore below.
 */
export async function setThemePreference(preference: ThemePreference): Promise<void> {
  colorScheme.set(preference);
  await AsyncStorage.setItem(STORAGE_KEY, preference);
}

/**
 * Reads back the last-saved preference, e.g. for the Settings screen to
 * highlight the active choice — NativeWind's own useColorScheme() only
 * exposes the *resolved* light/dark value, not whether the user actually
 * picked "system" or just happens to be on a system that resolves the
 * same way.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return isThemePreference(saved) ? saved : 'system';
}

/**
 * Restores and applies the saved preference on app startup, and reports
 * when that's done so app/_layout.tsx can hold the loading spinner already
 * shown there for auth restore until this finishes too — avoids a flash of
 * the wrong theme while AsyncStorage's read is still in flight. A first
 * launch with nothing ever saved just leaves NativeWind at its own
 * 'system' default, nothing to apply.
 */
export function useThemeRestore(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getThemePreference()
      .then((preference) => {
        if (preference !== 'system') colorScheme.set(preference);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return isReady;
}

export { useColorScheme };
