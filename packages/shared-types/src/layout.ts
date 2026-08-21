// Ported unchanged from the prototype's src/components/schedule/layout.ts.
// This is UI layout logic (interval-graph column packing for the schedule
// grid), separate from time.ts's conflict-warning logic even though both
// detect overlaps.
/**
 * Assigns a column + column-count to each item so mutually-overlapping items
 * in the same day render side by side instead of stacking on top of each
 * other. Items are grouped into maximal clusters of transitively-overlapping
 * intervals, then packed into the fewest columns via a greedy sweep — the
 * same approach common calendar UIs (e.g. Google Calendar) use.
 */
export interface LayoutInput<T> {
  key: string;
  start: number;
  end: number;
  data: T;
}

export interface LayoutResult<T> extends LayoutInput<T> {
  column: number;
  columnCount: number;
}

export function layoutOverlaps<T>(items: LayoutInput<T>[]): LayoutResult<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const results: LayoutResult<T>[] = [];

  let cluster: LayoutInput<T>[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = (clusterItems: LayoutInput<T>[]) => {
    const columnEnds: number[] = [];
    for (const item of clusterItems) {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      results.push({ ...item, column, columnCount: -1 });
    }
    const columnCount = columnEnds.length;
    for (let i = results.length - clusterItems.length; i < results.length; i++) {
      results[i].columnCount = columnCount;
    }
  };

  for (const item of sorted) {
    if (cluster.length === 0 || item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      flushCluster(cluster);
      cluster = [item];
      clusterEnd = item.end;
    }
  }
  if (cluster.length > 0) flushCluster(cluster);

  return results;
}
