import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTrendingKeywords, TRENDING_POOL } from '@/services/trendingService';

function mockFetchTitles(titles: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ articles: titles.map((t) => ({ title: t })) }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getTrendingKeywords', () => {
  it('ranks the most-mentioned pool topics first', async () => {
    vi.stubGlobal('fetch', mockFetchTitles([
      'Bitcoin surges to new high',
      'Bitcoin and Tesla rally',
      'Tesla earnings beat expectations',
      'Apple unveils new product',
    ]));
    const result = await getTrendingKeywords(3);
    expect(result).toHaveLength(3);
    const labels = result.map((r) => r.label);
    // Bitcoin (2) and Tesla (2) outrank single/zero-mention topics
    expect(labels).toContain('Bitcoin');
    expect(labels).toContain('Tesla');
  });

  it('returns count pool items in order when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await getTrendingKeywords(5);
    expect(result).toHaveLength(5);
    expect(result).toEqual(TRENDING_POOL.slice(0, 5));
  });

  it('falls back when the response has no titles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ articles: [] }) }));
    const result = await getTrendingKeywords(5);
    expect(result).toHaveLength(5);
  });
});
