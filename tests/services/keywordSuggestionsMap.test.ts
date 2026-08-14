import { describe, it, expect } from 'vitest';
import { KEYWORD_SUGGESTIONS_MAP } from '@/services/keywordSuggestions';
import { slugify } from '@/utils/keywordUtils';

// The adjacency map drives the graph's expand + cross-link relations.
describe('KEYWORD_SUGGESTIONS_MAP', () => {
  it('has non-empty child lists for every entry', () => {
    for (const [key, labels] of Object.entries(KEYWORD_SUGGESTIONS_MAP)) {
      expect(labels.length, key).toBeGreaterThan(0);
    }
  });

  it('never lists a keyword as its own child', () => {
    for (const [key, labels] of Object.entries(KEYWORD_SUGGESTIONS_MAP)) {
      expect(labels.map(slugify), key).not.toContain(key);
    }
  });

  it('uses slugs as keys (stable ids)', () => {
    for (const key of Object.keys(KEYWORD_SUGGESTIONS_MAP)) {
      expect(slugify(key)).toBe(key);
    }
  });
});
