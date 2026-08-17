import { describe, it, expect } from 'vitest';
import { computeImportance } from '@/utils/importance';

const art = (title: string, seendate: string) => ({ title, seendate });

describe('computeImportance', () => {
  const nodes = [
    { id: 'ai', label: 'AI' },
    { id: 'bitcoin', label: 'Bitcoin' },
    { id: 'quiet', label: 'Quietkeyword' },
  ];

  it('scores covered keywords above uncovered ones and normalizes max to 1', () => {
    const articles = [
      art('AI breakthrough announced', '20260814T100000Z'),
      art('AI regulation debate heats up', '20260814T110000Z'),
      art('Bitcoin steady', '20260814T090000Z'),
    ];
    const m = computeImportance(articles, nodes);
    expect(m.get('ai')!.score).toBe(1);
    expect(m.get('ai')!.count).toBe(2);
    expect(m.get('bitcoin')!.score).toBeGreaterThan(0);
    expect(m.get('bitcoin')!.score).toBeLessThan(1);
    expect(m.get('quiet')!.score).toBe(0);
    expect(m.get('quiet')!.count).toBe(0);
  });

  it('weights newer coverage above older coverage at equal counts', () => {
    const articles = [
      art('AI story from the start of the window', '20260810T000000Z'),
      art('Bitcoin story from the end of the window', '20260814T000000Z'),
      // extra articles to widen the time span
      art('unrelated filler', '20260810T000000Z'),
      art('unrelated filler 2', '20260814T000000Z'),
    ];
    const m = computeImportance(articles, [
      { id: 'ai', label: 'AI' },
      { id: 'bitcoin', label: 'Bitcoin' },
    ]);
    expect(m.get('bitcoin')!.score).toBeGreaterThan(m.get('ai')!.score);
  });

  it('matches case-insensitively and handles Korean labels', () => {
    const articles = [
      art('정부, 인공지능 윤리원칙 발표', '20260814T100000Z'),
      art('인공지능 투자 확대', '20260814T110000Z'),
    ];
    const m = computeImportance(articles, [{ id: '인공지능', label: '인공지능' }]);
    expect(m.get('인공지능')!.count).toBe(2);
    expect(m.get('인공지능')!.score).toBe(1);
  });

  it('returns an empty map for empty inputs', () => {
    expect(computeImportance([], nodes).size).toBe(0);
    expect(computeImportance([art('x', '20260814T000000Z')], []).size).toBe(0);
  });

  it('matches short Latin labels as whole words only', () => {
    const articles = [
      art('Local business owners plus tourists rally', '20260814T100000Z'), // "us" inside words
      art('US tariffs hit European exports', '20260814T110000Z'), // real "US"
      art('He said the plan was fair', '20260814T120000Z'), // "ai" inside "said"
      art('AI startups raise record funding', '20260814T130000Z'), // real "AI"
    ];
    const m = computeImportance(articles, [
      { id: 'us', label: 'US' },
      { id: 'ai', label: 'AI' },
    ]);
    expect(m.get('us')!.count).toBe(1);
    expect(m.get('ai')!.count).toBe(1);
  });
});

describe('computeImportance as-of mode (time machine)', () => {
  const nodes = [{ id: 'ai', label: 'AI' }];
  const at = Date.UTC(2026, 7, 14, 12, 0, 0); // 2026-08-14T12:00Z

  it('only counts articles inside the [at - window, at] range', () => {
    const articles = [
      { title: 'AI story before the window', seendate: '20260812T110000Z' },
      { title: 'AI story inside the window', seendate: '20260814T080000Z' },
      { title: 'AI story after at (future)', seendate: '20260814T130000Z' },
    ];
    const m = computeImportance(articles, nodes, { at, windowMs: 24 * 3600_000 });
    expect(m.get('ai')!.count).toBe(1);
  });

  it('excludes undated articles while traveling', () => {
    const articles = [{ title: 'AI undated', seendate: '' }];
    const m = computeImportance(articles, nodes, { at });
    expect(m.get('ai')?.count ?? 0).toBe(0);
  });

  it('weights recency relative to the selected moment', () => {
    const articles = [
      { title: 'AI early in window', seendate: '20260813T130000Z' },
      { title: 'Bitcoin right before at', seendate: '20260814T115900Z' },
    ];
    const m = computeImportance(
      articles,
      [{ id: 'ai', label: 'AI' }, { id: 'bitcoin', label: 'Bitcoin' }],
      { at }
    );
    expect(m.get('bitcoin')!.score).toBeGreaterThan(m.get('ai')!.score);
  });
});
