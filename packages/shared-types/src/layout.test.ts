import { describe, expect, it } from 'vitest';
import { layoutOverlaps, type LayoutInput } from './layout';

describe('layoutOverlaps', () => {
  it('gives non-overlapping items their own single-column cluster', () => {
    const items: LayoutInput<string>[] = [
      { key: 'a', start: 0, end: 60, data: 'a' },
      { key: 'b', start: 60, end: 120, data: 'b' }, // touches but doesn't overlap
    ];
    const result = layoutOverlaps(items);
    expect(result.find((r) => r.key === 'a')?.columnCount).toBe(1);
    expect(result.find((r) => r.key === 'b')?.columnCount).toBe(1);
  });

  it('packs a 3-way overlapping cluster into 3 side-by-side columns', () => {
    const items: LayoutInput<string>[] = [
      { key: 'a', start: 0, end: 90, data: 'a' },
      { key: 'b', start: 0, end: 90, data: 'b' },
      { key: 'c', start: 0, end: 90, data: 'c' },
    ];
    const result = layoutOverlaps(items);
    const columns = result.map((r) => r.column).sort();
    expect(columns).toEqual([0, 1, 2]);
    expect(result.every((r) => r.columnCount === 3)).toBe(true);
  });

  it('reuses a freed column once an earlier item in the cluster ends', () => {
    // a: 0-30, b: 10-40 (overlaps both a and c -> keeps the cluster connected),
    // c: 35-60 (starts after a ends at 30, so it can reuse a's column instead
    // of needing a 3rd column even though it overlaps b).
    const items: LayoutInput<string>[] = [
      { key: 'a', start: 0, end: 30, data: 'a' },
      { key: 'b', start: 10, end: 40, data: 'b' },
      { key: 'c', start: 35, end: 60, data: 'c' },
    ];
    const result = layoutOverlaps(items);
    expect(result.every((r) => r.columnCount === 2)).toBe(true);
    expect(result.find((r) => r.key === 'a')?.column).toBe(0);
    expect(result.find((r) => r.key === 'b')?.column).toBe(1);
    expect(result.find((r) => r.key === 'c')?.column).toBe(0);
  });
});
