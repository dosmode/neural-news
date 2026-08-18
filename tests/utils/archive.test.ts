import { describe, it, expect } from 'vitest';
import { timeTravelPool, archiveUnion } from '@/utils/archive';
import { computeTimeRange } from '@/utils/timeline';
import { Article } from '@/types';

const art = (id: string, title: string, seendate: string): Article => ({
  id,
  title,
  summary: '',
  sentiment: 'neutral',
  relevanceMap: { old: 0.9 },
  type: 'deep-dive',
  url: id,
  domain: 'x.com',
  seendate,
});

describe('archiveUnion', () => {
  it('merges current + archive, deduped by id with current winning', () => {
    const current = [art('a', 'A now', '20260814T120000Z')];
    const archive = [art('a', 'A old copy', '20260813T120000Z'), art('b', 'B', '20260812T120000Z')];
    const u = archiveUnion(current, archive);
    expect(u).toHaveLength(2);
    expect(u.find((x) => x.id === 'a')!.title).toBe('A now');
  });
});

describe('timeTravelPool', () => {
  const keywords = [{ id: 'ai', label: 'AI' }];
  const current = [art('c1', 'AI current', '20260814T120000Z')];
  const archive = [art('h1', 'AI history piece', '20260810T120000Z'), art('h2', 'Unrelated', '20260810T130000Z')];

  it('returns just the current feed when live', () => {
    expect(timeTravelPool(current, null, keywords, archive)).toHaveLength(1);
  });

  it('adds archived articles while traveling', () => {
    const pool = timeTravelPool(current, Date.UTC(2026, 7, 11), keywords, archive);
    expect(pool.map((a) => a.id).sort()).toEqual(['c1', 'h1', 'h2']);
  });

  it('refreshes archived relevance against the CURRENT keyword set', () => {
    const pool = timeTravelPool(current, Date.UTC(2026, 7, 11), keywords, archive);
    const h1 = pool.find((a) => a.id === 'h1')!;
    expect(h1.relevanceMap['ai']).toBeGreaterThan(0.8); // matches current keyword
    const h2 = pool.find((a) => a.id === 'h2')!;
    expect(h2.relevanceMap['ai']).toBeUndefined(); // keeps original map (no match)
  });
});

describe('computeTimeRange', () => {
  const mk = (n: number, dayOffset: number) =>
    Array.from({ length: n }, (_, i) =>
      art(`r${dayOffset}-${i}`, 't', `202608${String(10 + dayOffset).padStart(2, '0')}T${String(i).padStart(2, '0')}0000Z`)
    );

  it('spans the articles and survives a lone ancient outlier', () => {
    const recent = [...mk(10, 3), ...mk(10, 4)];
    const outlier = art('old', 'ancient', '20260101T000000Z');
    const range = computeTimeRange([...recent, outlier])!;
    // 10th percentile floor: the January outlier must not drag min to January
    expect(new Date(range.min).getUTCMonth()).toBe(7); // August
  });

  it('returns null with too few dated articles', () => {
    expect(computeTimeRange(mk(3, 1))).toBeNull();
  });
});
