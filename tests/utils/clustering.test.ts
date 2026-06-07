import { describe, it, expect } from 'vitest';
import { calculateClustering, dominantTopic } from '@/utils/clustering';
import { Article } from '@/types';

function makeArticle(url: string, overrides: Partial<Article> = {}): Article {
  return {
    id: url,
    url,
    title: `Article ${url}`,
    summary: 'Test summary',
    sentiment: 'neutral',
    relevanceMap: { nvda: 0.8 },
    type: 'breaking',
    domain: 'test.com',
    seendate: '20260530T120000Z',
    ...overrides,
  };
}

const KEYWORDS = new Set(['nvda']);
const WEIGHTS = { nvda: 0.5 };
const W = 800;
const H = 600;

describe('calculateClustering', () => {
  it('returns exactly one MappedPoint per input article', () => {
    const articles = [makeArticle('url1'), makeArticle('url2'), makeArticle('url3')];
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    expect(result.points).toHaveLength(3);
  });

  it('does not mutate the input article objects', () => {
    const article = makeArticle('url1');
    const before = { ...(article as any) };
    calculateClustering([article], KEYWORDS, WEIGHTS, W, H);
    expect((article as any).x).toBe(before.x);
    expect((article as any).y).toBe(before.y);
    expect((article as any).vx).toBe(before.vx);
    expect((article as any).vy).toBe(before.vy);
  });

  it('deduplicates articles that share the same url', () => {
    const articles = [
      makeArticle('same-url'),
      makeArticle('same-url'),
      makeArticle('other-url'),
    ];
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    expect(result.points).toHaveLength(2);
  });

  it('returns empty points and clusters for empty input', () => {
    const result = calculateClustering([], KEYWORDS, WEIGHTS, W, H);
    expect(result.points).toHaveLength(0);
    expect(result.clusters).toHaveLength(0);
  });

  it('all returned points have finite, non-NaN x and y within bounds', () => {
    const articles = Array.from({ length: 10 }, (_, i) => makeArticle(`url${i}`));
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    result.points.forEach(point => {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(W);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(H);
    });
  });

  it('separates sentiments into distinct horizontal clusters', () => {
    // negative anchored left, positive anchored right (CLUSTER_ORDER = [negative, neutral, positive])
    const articles = [
      ...Array.from({ length: 7 }, (_, i) => makeArticle(`pos${i}`, { sentiment: 'positive' })),
      ...Array.from({ length: 3 }, (_, i) => makeArticle(`neg${i}`, { sentiment: 'negative' })),
    ];
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    const posXs = result.points.filter(p => p.sentiment === 'positive').map(p => p.x);
    const negXs = result.points.filter(p => p.sentiment === 'negative').map(p => p.x);
    // every negative dot sits left of every positive dot — clusters are separated
    expect(Math.max(...negXs)).toBeLessThan(Math.min(...posXs));
  });

  it('cluster counts sum to point count and percents sum to ~100', () => {
    const articles = [
      ...Array.from({ length: 7 }, (_, i) => makeArticle(`pos${i}`, { sentiment: 'positive' })),
      ...Array.from({ length: 3 }, (_, i) => makeArticle(`neg${i}`, { sentiment: 'negative' })),
    ];
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    const countSum = result.clusters.reduce((s, c) => s + c.count, 0);
    const pctSum = result.clusters.reduce((s, c) => s + c.percent, 0);
    expect(countSum).toBe(result.points.length);
    expect(pctSum).toBeGreaterThanOrEqual(99);
    expect(pctSum).toBeLessThanOrEqual(101);
  });

  it('produces a single 100% cluster for a single-sentiment set', () => {
    const articles = Array.from({ length: 5 }, (_, i) => makeArticle(`pos${i}`, { sentiment: 'positive' }));
    const result = calculateClustering(articles, KEYWORDS, WEIGHTS, W, H);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].sentiment).toBe('positive');
    expect(result.clusters[0].percent).toBe(100);
  });
});

describe('dominantTopic', () => {
  const order = ['nvda', 'ai'];

  it('picks the highest-relevance active id', () => {
    const a = makeArticle('u', { relevanceMap: { nvda: 0.9, ai: 0.2 } });
    expect(dominantTopic(a, ['nvda', 'ai'], order)).toBe('nvda');
  });

  it('breaks ties by keyword order', () => {
    const a = makeArticle('u', { relevanceMap: { nvda: 0.5, ai: 0.5 } });
    expect(dominantTopic(a, ['nvda', 'ai'], order)).toBe('nvda');
  });

  it('returns __other__ when no active topic is present', () => {
    const a = makeArticle('u', { relevanceMap: { tsmc: 0.7 } });
    expect(dominantTopic(a, ['nvda', 'ai'], order)).toBe('__other__');
  });
});

describe('calculateClustering — topic mode', () => {
  const TOPIC_KEYWORDS = new Set(['nvda', 'ai']);
  const KW_DEFS = [{ id: 'nvda', label: 'Nvidia' }, { id: 'ai', label: 'AI' }];
  const WEIGHTS2 = { nvda: 0.5, ai: 0.5 };

  function topicArticles() {
    const nvda = Array.from({ length: 4 }, (_, i) =>
      makeArticle(`n${i}`, { relevanceMap: { nvda: 0.9, ai: 0.1 } }));
    const ai = Array.from({ length: 2 }, (_, i) =>
      makeArticle(`a${i}`, { relevanceMap: { nvda: 0.1, ai: 0.9 } }));
    return [...nvda, ...ai];
  }

  it('groups dots by dominant topic into separated clusters with topic labels', () => {
    const result = calculateClustering(topicArticles(), TOPIC_KEYWORDS, WEIGHTS2, W, H, 'topic', KW_DEFS);
    expect(result.clusters).toHaveLength(2);
    expect(result.clusters.every(c => c.kind === 'topic')).toBe(true);
    const labels = result.clusters.map(c => c.label).sort();
    expect(labels).toEqual(['AI', 'Nvidia']);
    // counts sum to points length
    expect(result.clusters.reduce((s, c) => s + c.count, 0)).toBe(result.points.length);
    // Nvidia cluster (4) is bigger than AI cluster (2)
    const nvdaCluster = result.clusters.find(c => c.label === 'Nvidia')!;
    const aiCluster = result.clusters.find(c => c.label === 'AI')!;
    expect(nvdaCluster.count).toBeGreaterThan(aiCluster.count);
  });

  it('keeps dot sentiment (and thus color) identical across modes', () => {
    const articles = [
      makeArticle('n0', { sentiment: 'positive', relevanceMap: { nvda: 0.9, ai: 0.1 } }),
      makeArticle('a0', { sentiment: 'negative', relevanceMap: { nvda: 0.1, ai: 0.9 } }),
    ];
    const byId = (arr: any[]) => Object.fromEntries(arr.map(p => [p.id, p.sentiment]));
    const sentimentMode = calculateClustering(articles, TOPIC_KEYWORDS, WEIGHTS2, W, H, 'sentiment', KW_DEFS);
    const topicMode = calculateClustering(articles, TOPIC_KEYWORDS, WEIGHTS2, W, H, 'topic', KW_DEFS);
    expect(byId(topicMode.points)).toEqual(byId(sentimentMode.points));
  });
});
