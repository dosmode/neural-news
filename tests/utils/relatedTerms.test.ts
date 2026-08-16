import { describe, it, expect } from 'vitest';
import { extractRelatedTerms } from '@/utils/relatedTerms';

describe('extractRelatedTerms', () => {
  const titles = [
    'Samsung Electronics posts record profit on chip demand - Reuters',
    'Samsung Electronics expands Texas fab amid AI boom - Bloomberg',
    'Chip demand lifts SK Hynix and Samsung Electronics - FT',
    'Galaxy sales slip as Samsung Electronics pivots to AI - CNBC',
  ];

  it('finds proper-noun phrases that repeat across titles', () => {
    const terms = extractRelatedTerms(titles, 'Samsung');
    expect(terms.some((t) => /Chip Demand|SK Hynix|AI/i.test(t) || t === 'Samsung Electronics')).toBe(true);
  });

  it('excludes terms overlapping the source keyword itself', () => {
    const terms = extractRelatedTerms(titles, 'Samsung Electronics');
    expect(terms.every((t) => !/samsung|electronics/i.test(t))).toBe(true);
  });

  it('requires a term to appear in at least minCount titles', () => {
    const terms = extractRelatedTerms(titles, 'Samsung Electronics');
    // 'Galaxy' appears once only → excluded at default minCount=2
    expect(terms).not.toContain('Galaxy');
  });

  it('extracts frequent Korean tokens', () => {
    const koTitles = [
      '삼성전자, 반도체 수출 호조에 실적 개선 - 연합뉴스',
      '반도체 업황 회복에 삼성전자 주가 상승 - 한겨레',
    ];
    const terms = extractRelatedTerms(koTitles, '삼성전자');
    expect(terms).toContain('반도체');
    expect(terms.every((t) => t !== '삼성전자')).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(extractRelatedTerms([], 'anything')).toEqual([]);
  });

  it('strips the trailing source name from titles', () => {
    // 'Reuters' etc. appear once per title but as sources; after stripping they
    // should not dominate. Use identical sources to try to force a false hit.
    const t = [
      'Oil prices climb - MarketWatch',
      'Gold steadies - MarketWatch',
      'Dollar slips - MarketWatch',
    ];
    const terms = extractRelatedTerms(t, 'commodities');
    expect(terms).not.toContain('MarketWatch');
  });
});
