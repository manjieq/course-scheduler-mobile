import { StyleSheet, Text, View } from 'react-native';

// Phase 1 placeholder. Phase 4 replaces this with: a free-text input ->
// apps/api's extract-course-chat Edge Function (same server-side
// university resolution + validation as scan) -> the same shared
// review/edit confirm screen used by the scan path.
export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.body}>Describe-a-class-in-text extraction lands in Phase 4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
});
