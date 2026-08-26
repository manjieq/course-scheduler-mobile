/**
 * Given each compared loadout's course ids, returns the set of course ids
 * present in every one of them — the mobile app's loadout comparison views
 * (portrait's LoadoutComparisonView and landscape's loadout-compare.tsx) use
 * this to highlight which courses actually differ between loadouts, rather
 * than making the reader eyeball two schedule grids or course lists
 * side by side to spot what's not shared.
 *
 * Fewer than two groups has nothing to diff against, so returns an empty
 * set — the comparison UI should read that as "no highlighting", not as
 * "everything is shared" (a lone loadout's own courses aren't "shared with
 * nothing").
 */
export function sharedCourseIds(courseIdGroups: string[][]): Set<string> {
  if (courseIdGroups.length < 2) return new Set();
  const [first, ...rest] = courseIdGroups;
  return new Set(first.filter((id) => rest.every((group) => group.includes(id))));
}
