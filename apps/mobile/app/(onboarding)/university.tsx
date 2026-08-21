import { StyleSheet, Text, View } from 'react-native';

// Phase 1 placeholder. Phase 2 replaces this with: a searchable list of
// existing `universities` rows, a self-serve "add my university" path
// (inserted as status='pending_review'), and a submit that writes
// profiles.university_id + profiles.onboarding_completed_at before
// redirecting into (tabs). See CLAUDE.md's Gap 2 section — this screen is
// mandatory and blocks every other screen until it completes.
export default function UniversityOnboardingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which university do you attend?</Text>
      <Text style={styles.body}>
        University search/add UI lands in Phase 2, alongside Supabase Auth.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
});
