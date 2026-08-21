import { describe, expect, it } from 'vitest';
import { buildColorMap, getContrastText, PALETTE } from './color';
import type { Course } from './models';

function course(id: string, code: string): Course {
  return { id, departmentId: 'dept-1', code, name: code, credits: 3, category: 'core', schedule: [] };
}

describe('buildColorMap', () => {
  it('assigns colors deterministically by sorted course code, independent of input order', () => {
    const a = course('id-a', 'CS201');
    const b = course('id-b', 'CS101');
    const c = course('id-c', 'CS301');

    const mapInOrder = buildColorMap([a, b, c]);
    const mapShuffled = buildColorMap([c, a, b]);

    expect(mapInOrder.get('id-a')).toBe(mapShuffled.get('id-a'));
    expect(mapInOrder.get('id-b')).toBe(mapShuffled.get('id-b'));
    expect(mapInOrder.get('id-c')).toBe(mapShuffled.get('id-c'));

    // CS101 sorts first, so it gets PALETTE[0]; CS201 second; CS301 third.
    expect(mapInOrder.get('id-b')).toBe(PALETTE[0]);
    expect(mapInOrder.get('id-a')).toBe(PALETTE[1]);
    expect(mapInOrder.get('id-c')).toBe(PALETTE[2]);
  });

  it('wraps around the palette once course count exceeds its length', () => {
    const courses = Array.from({ length: PALETTE.length + 1 }, (_, i) =>
      course(`id-${i}`, `CS${String(i).padStart(3, '0')}`),
    );
    const map = buildColorMap(courses);
    expect(map.get('id-0')).toBe(map.get(`id-${PALETTE.length}`));
  });
});

describe('getContrastText', () => {
  it('picks white text on a dark background', () => {
    expect(getContrastText('#000000')).toBe('#ffffff');
  });

  it('picks black text on a light background', () => {
    expect(getContrastText('#ffffff')).toBe('#000000');
  });
});
