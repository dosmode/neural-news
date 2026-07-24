import { describe, it, expect } from 'vitest';
import { computeEmphasisMap } from '@/utils/emphasis';
import { Article } from '@/types';

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    url: id,
    title: `Article ${id}`,
    summary: 'Test summary',
    sentiment: 'neutral',
    relevanceMap: { nvda: 0.5 },
    type: 'breaking',
    domain: 'test.com',
    seendate: '20260530T120000Z',
    ...overrides,
  };
}

const KEYWORDS = [{ id: 'nvda', label: 'Nvidia' }];
const ACTIVE = new Set(['nvda']);
const NEUTRAL = { sentiment: 0.5, recency: 0.5, relevance: 0.5, nvda: 0.5 };

describe('computeEmphasisMap', () => {
  it('returns an empty map for empty input', () => {
    expect(computeEmphasisMap([], ACTIVE, NEUTRAL, KEYWORDS).size).toBe(0);
  });

  it('produces neutral {scale:1, opacity:1} when all weights are 0.5', () => {
    const arts = [
      makeArticle('a', { seendate: '20260530T090000Z' }),
      makeArticle('b', { seendate: '20260530T180000Z' }),
    ];
    const map = computeEmphasisMap(arts, ACTIVE, NEUTRAL, KEYWORDS);
    for (const e of map.values()) {
      expect(e.scale).toBeCloseTo(1);
      expect(e.opacity).toBeCloseTo(1);
    }
  });

  it('raising recency weight makes the newest article larger than the oldest', () => {
    const oldA = makeArticle('old', { seendate: '20260530T090000Z' });
    const newA = makeArticle('new', { seendate: '20260530T180000Z' });
    const map = computeEmphasisMap([oldA, newA], ACTIVE, { ...NEUTRAL, recency: 1.0 }, KEYWORDS);
    expect(map.get('new')!.scale).toBeGreaterThan(map.get('old')!.scale);
  });

  it('raising relevance weight makes a high-relevance article larger than a low-relevance one', () => {
    const lo = makeArticle('lo', { relevanceMap: { nvda: 0.1 } });
    const hi = makeArticle('hi', { relevanceMap: { nvda: 0.95 } });
    const map = computeEmphasisMap([lo, hi], ACTIVE, { ...NEUTRAL, relevance: 1.0 }, KEYWORDS);
    expect(map.get('hi')!.scale).toBeGreaterThan(map.get('lo')!.scale);
  });

  it('lowering a weight below neutral shrinks AND dims affected dots', () => {
    const hi = makeArticle('hi', { relevanceMap: { nvda: 0.95 } });
    const map = computeEmphasisMap([hi], ACTIVE, { ...NEUTRAL, relevance: 0.0 }, KEYWORDS);
    expect(map.get('hi')!.scale).toBeLessThan(1);
    expect(map.get('hi')!.opacity).toBeLessThan(1);
  });

  it('keeps scale within [0.55, 1.45] and opacity within [0.45, 1]', () => {
    const arts = [
      makeArticle('p', { sentiment: 'positive', relevanceMap: { nvda: 1 }, seendate: '20260530T180000Z' }),
      makeArticle('n', { sentiment: 'negative', relevanceMap: { nvda: 0 }, seendate: '20260530T010000Z' }),
    ];
    const boosted = computeEmphasisMap(arts, ACTIVE, { sentiment: 1, recency: 1, relevance: 1, nvda: 1 }, KEYWORDS);
    const reduced = computeEmphasisMap(arts, ACTIVE, { sentiment: 0, recency: 0, relevance: 0, nvda: 0 }, KEYWORDS);
    for (const m of [boosted, reduced]) {
      for (const e of m.values()) {
        expect(e.scale).toBeGreaterThanOrEqual(0.55);
        expect(e.scale).toBeLessThanOrEqual(1.45);
        expect(e.opacity).toBeGreaterThanOrEqual(0.45);
        expect(e.opacity).toBeLessThanOrEqual(1);
      }
    }
  });
});
