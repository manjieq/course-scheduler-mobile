import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../lib/auth-context';

// Phase 1 placeholder. Phase 3 replaces this with the ported Courses tab:
// university/department context (from the profile, not a selector, since
// onboarding already resolved it), course list split Major/General, course
// cards with the shared color map, add/remove-from-cart.
//
// The sign-out button is a temporary Phase 2 testing affordance (no
// settings screen exists yet) — it'll move once Phase 6 adds real
// theming/empty-state polish.
export default function CoursesScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>
      <Text style={styles.body}>Course browsing lands in Phase 3, once Postgres-backed data exists.</Text>
      <Pressable onPress={signOut}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  signOut: { fontSize: 14, textDecorationLine: 'underline', opacity: 0.6, marginTop: 12 },
});
