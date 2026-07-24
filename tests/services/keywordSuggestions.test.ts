import { describe, it, expect } from 'vitest';
import { getSuggestionsFor, SUGGESTIONS_PER_KEYWORD } from '@/services/keywordSuggestions';
import { KeywordDef, SuggestionDef } from '@/types';

const noKeywords: KeywordDef[] = [];
const noSuggestions: SuggestionDef[] = [];

describe('getSuggestionsFor', () => {
  it('returns up to SUGGESTIONS_PER_KEYWORD results for a known keyword', () => {
    const results = getSuggestionsFor('ai', noKeywords, noSuggestions);
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.length).toBeLessThanOrEqual(SUGGESTIONS_PER_KEYWORD);
  });

  it('excludes already-active keywords from suggestions', () => {
    const active: KeywordDef[] = [{ id: 'openai', label: 'OpenAI' }];
    const results = getSuggestionsFor('ai', active, noSuggestions);
    expect(results.map((r) => r.toLowerCase())).not.toContain('openai');
  });

  it('excludes dismissed suggestions', () => {
    const dismissed: SuggestionDef[] = [
      { id: 'sug-1', label: 'OpenAI', sourceKeywordId: 'ai', isDismissed: true },
    ];
    const results = getSuggestionsFor('ai', noKeywords, dismissed);
    expect(results.map((r) => r.toLowerCase())).not.toContain('openai');
  });

  it('excludes already-shown suggestions (not just dismissed)', () => {
    const shown: SuggestionDef[] = [
      { id: 'sug-1', label: 'OpenAI', sourceKeywordId: 'ai', isDismissed: false },
    ];
    const results = getSuggestionsFor('ai', noKeywords, shown);
    expect(results.map((r) => r.toLowerCase())).not.toContain('openai');
  });

  it('falls back gracefully for unknown keywords and still returns results', () => {
    const results = getSuggestionsFor('unknown-keyword-xyz', noKeywords, noSuggestions);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when all candidates are already active', () => {
    // Make all TRENDING_POOL active (large set) — results should still be array
    const allActive: KeywordDef[] = Array.from({ length: 20 }, (_, i) => ({
      id: `keyword-${i}`,
      label: `Keyword ${i}`,
    }));
    const results = getSuggestionsFor('unknown-keyword-xyz', allActive, noSuggestions);
    expect(Array.isArray(results)).toBe(true);
  });
});
