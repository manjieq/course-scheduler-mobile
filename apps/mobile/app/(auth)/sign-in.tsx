import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '../../lib/supabase';

// Entry point for signed-out users (see app/_layout.tsx's routing gate).
// Email + password rather than a magic-link/OTP email — that path needs
// Supabase's email sending configured (custom SMTP) just to test locally,
// which password auth sidesteps entirely. Requires "Confirm email" to be
// turned off in the Supabase dashboard (Authentication -> Providers ->
// Email), since that toggle would otherwise also try to send mail on sign-up.
export default function SignInScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({ email: trimmedEmail, password });

    setIsSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // No explicit navigation — the root layout's routing gate redirects
    // once the new session/profile state lands.
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white p-6 dark:bg-neutral-950">
      <Text className="text-center text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {mode === 'sign-in' ? 'Sign in to Course Scheduler' : 'Create your account'}
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@school.edu"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
      />

      {error ? <Text className="text-center text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="w-full items-center rounded-xl bg-neutral-900 py-3 disabled:opacity-50 dark:bg-neutral-100"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-medium text-white dark:text-neutral-900">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
        <Text className="text-sm text-neutral-500 underline dark:text-neutral-400">
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}
