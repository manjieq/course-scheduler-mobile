import { StyleSheet, Text, View } from 'react-native';

// Phase 1 placeholder. Phase 3 replaces this with the ported Courses tab:
// university/department context (from the profile, not a selector, since
// onboarding already resolved it), course list split Major/General, course
// cards with the shared color map, add/remove-from-cart.
export default function CoursesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>
      <Text style={styles.body}>Course browsing lands in Phase 3, once Postgres-backed data exists.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
});
