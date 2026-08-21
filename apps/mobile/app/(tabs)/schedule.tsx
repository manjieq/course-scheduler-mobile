import { StyleSheet, Text, View } from 'react-native';

// Phase 1 placeholder. Phase 3 replaces this with the ported Schedule tab:
// weekly grid (using shared-types' layoutOverlaps), conflict warning banner
// (using findConflicts — warning only, never a block), loadout save/list/
// load/delete, multi-select comparison view.
export default function ScheduleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule</Text>
      <Text style={styles.body}>The weekly grid + loadouts land in Phase 3.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
});
