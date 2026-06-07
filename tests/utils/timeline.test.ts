import { describe, it, expect } from 'vitest';
import { parseSeendate, calculateTimeline } from '@/utils/timeline';
import { Article } from '@/types';

function makeArticle(url: string, seendate: string): Article {
  return {
    id: url,
    url,
    title: `Article ${url}`,
    summary: 'Test summary',
    sentiment: 'neutral',
    relevanceMap: { nvda: 0.8 },
    type: 'breaking',
    domain: 'test.com',
    seendate,
  };
}

const W = 800;
const H = 600;

describe('parseSeendate', () => {
  it('parses a valid compact ISO timestamp to finite ms', () => {
    const t = parseSeendate('20260530T120000Z');
    expect(typeof t).toBe('number');
    expect(Number.isFinite(t as number)).toBe(true);
  });

  it('returns null for malformed or empty input', () => {
    expect(parseSeendate('not-a-date')).toBeNull();
    expect(parseSeendate('')).toBeNull();
    expect(parseSeendate(undefined as any)).toBeNull();
  });
});

describe('calculateTimeline', () => {
  it('returns empty points and ticks for empty input', () => {
    const result = calculateTimeline([], W, H);
    expect(result.points).toHaveLength(0);
    expect(result.ticks).toHaveLength(0);
  });

  it('positions articles in chronological order (increasing x)', () => {
    const articles = [
      makeArticle('a', '20260530T090000Z'),
      makeArticle('b', '20260530T120000Z'),
      makeArticle('c', '20260530T150000Z'),
    ];
    const result = calculateTimeline(articles, W, H);
    const xs = result.points.map(p => p.x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    }
    expect(xs[0]).toBeLessThan(xs[xs.length - 1]);
  });

  it('excludes articles with an unparseable publication time', () => {
    const articles = [
      makeArticle('good', '20260530T120000Z'),
      makeArticle('bad', 'garbage'),
    ];
    const result = calculateTimeline(articles, W, H);
    expect(result.points).toHaveLength(1);
    expect(result.points[0].id).toBe('good');
  });

  it('keeps all points within bounds and renders 5 ticks', () => {
    const hours = ['09', '10', '11', '12', '13', '14', '15', '16'];
    const articles = hours.map((h, i) => makeArticle(`u${i}`, `20260530T${h}0000Z`));
    const result = calculateTimeline(articles, W, H);
    result.points.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(H);
    });
    expect(result.ticks).toHaveLength(5);
  });

  it('stacks a same-time burst vertically (denser column)', () => {
    const burst = Array.from({ length: 5 }, (_, i) => makeArticle(`burst${i}`, '20260530T120000Z'));
    const lone = makeArticle('lone', '20260530T130000Z');
    const result = calculateTimeline([...burst, lone], W, H);
    const burstPoints = result.points.filter(p => p.id.startsWith('burst'));
    const lonePoint = result.points.find(p => p.id === 'lone')!;
    // burst shares (nearly) one x column
    const burstXs = burstPoints.map(p => p.x);
    expect(Math.max(...burstXs) - Math.min(...burstXs)).toBeLessThan(2);
    // burst occupies multiple distinct y (a tall stack)
    const uniqueYs = new Set(burstPoints.map(p => Math.round(p.y)));
    expect(uniqueYs.size).toBeGreaterThan(1);
    // lone article sits at a different x
    expect(Math.abs(lonePoint.x - burstXs[0])).toBeGreaterThan(20);
  });
});
