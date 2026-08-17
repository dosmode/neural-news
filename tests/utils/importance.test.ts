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
});
