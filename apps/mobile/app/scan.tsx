import { StyleSheet, Text, View } from 'react-native';

// Phase 1 placeholder. Phase 4 replaces this with: camera/photo picker ->
// upload -> apps/api's extract-course-scan Edge Function (which resolves
// university_id server-side from the caller's profile, never trusts a
// client-supplied value) -> the shared review/edit confirm screen. Nothing
// here ever auto-saves to the courses table.
export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.body}>Scan-to-extract lands in Phase 4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
});
