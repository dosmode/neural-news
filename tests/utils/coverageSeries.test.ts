import { describe, it, expect } from 'vitest';
import { computeCoverageSeries } from '@/utils/coverageSeries';

const art = (title: string, seendate: string) => ({ title, seendate });
const range = {
  min: Date.UTC(2026, 7, 10),
  max: Date.UTC(2026, 7, 17),
};

describe('computeCoverageSeries', () => {
  const keywords = [
    { id: 'ai', label: 'AI' },
    { id: 'bitcoin', label: 'Bitcoin' },
    { id: 'quiet', label: 'Quietword' },
  ];

  it('buckets coverage over the range and ranks streams by total', () => {
    const articles = [
      art('AI early story', '20260810T120000Z'),
      art('AI mid story', '20260813T120000Z'),
      art('AI late story', '20260816T120000Z'),
      art('Bitcoin single story', '20260813T120000Z'),
    ];
    const streams = computeCoverageSeries(articles, keywords, range, 7);
    expect(streams[0].id).toBe('ai');
    expect(streams[0].total).toBe(3);
    expect(streams[1].id).toBe('bitcoin');
    expect(streams.find((s) => s.id === 'quiet')).toBeUndefined(); // zero coverage → no stream
    expect(streams[0].series).toHaveLength(7);
  });

  it('places articles into the correct buckets', () => {
    const articles = [art('AI at the very start', '20260810T000100Z'), art('AI at the very end', '20260816T235900Z')];
    const [ai] = computeCoverageSeries(articles, [{ id: 'ai', label: 'AI' }], range, 7);
    // smoothing spreads mass, but the endpoints must dominate their neighbors
    expect(ai.series[0]).toBeGreaterThan(ai.series[3]);
    expect(ai.series[6]).toBeGreaterThan(ai.series[3]);
  });

  it('caps the number of streams to maxStreams', () => {
    const kws = Array.from({ length: 10 }, (_, i) => ({ id: `k${i}`, label: `Keyword${i}` }));
    const articles = kws.map((k, i) => art(`${k.label} story`, `2026081${(i % 7) + 0}T120000Z`));
    const streams = computeCoverageSeries(articles, kws, range, 7, 4);
    expect(streams.length).toBeLessThanOrEqual(4);
  });

  it('returns empty for empty inputs or an inverted range', () => {
    expect(computeCoverageSeries([], keywords, range)).toHaveLength(0);
    expect(computeCoverageSeries([art('AI', '20260812T000000Z')], keywords, { min: 5, max: 1 })).toHaveLength(0);
  });
});
