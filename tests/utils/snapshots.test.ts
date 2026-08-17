import { describe, it, expect } from 'vitest';
import { appendSnapshot, snapshotLabel, CoverageSnapshot } from '@/utils/snapshots';

const snap = (at: number, counts: Record<string, number> = {}): CoverageSnapshot => ({
  at,
  setKey: 'k',
  counts,
});

const MIN = 10 * 60 * 1000;

describe('appendSnapshot', () => {
  it('appends when the gap since the last snapshot is large enough', () => {
    const h = appendSnapshot([snap(0)], snap(MIN + 1));
    expect(h).toHaveLength(2);
  });

  it('replaces the last entry within the min gap (freshest wins)', () => {
    const h = appendSnapshot([snap(0), snap(MIN + 1, { ai: 1 })], snap(MIN + 2, { ai: 9 }));
    expect(h).toHaveLength(2);
    expect(h[1].counts.ai).toBe(9);
  });

  it('prunes entries older than maxAge', () => {
    const week = 7 * 24 * 3600 * 1000;
    const h = appendSnapshot([snap(0)], snap(week + MIN + 1));
    expect(h).toHaveLength(1);
    expect(h[0].at).toBe(week + MIN + 1);
  });

  it('caps the history length, keeping the newest', () => {
    let h: CoverageSnapshot[] = [];
    for (let i = 0; i < 150; i++) h = appendSnapshot(h, snap(i * (MIN + 1)));
    expect(h.length).toBeLessThanOrEqual(144);
    expect(h[h.length - 1].at).toBe(149 * (MIN + 1));
  });

  it('tolerates corrupt history input', () => {
    const h = appendSnapshot(null as never, snap(5));
    expect(h).toHaveLength(1);
  });
});

describe('snapshotLabel', () => {
  it('formats month/day hour:minute', () => {
    expect(snapshotLabel(new Date(2026, 7, 14, 21, 5).getTime())).toBe('8/14 21:05');
  });
});
