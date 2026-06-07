import { describe, it, expect } from 'vitest';
import { slugify, normalizeForCompare, validateNewKeyword, MAX_KEYWORDS } from '@/utils/keywordUtils';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Fed Rate')).toBe('fed-rate');
  });
  it('collapses punctuation and trims dashes', () => {
    expect(slugify('  AI & Technology!! ')).toBe('ai-technology');
  });
  it('handles single word', () => {
    expect(slugify('Bitcoin')).toBe('bitcoin');
  });
});

describe('normalizeForCompare', () => {
  it('trims and lowercases', () => {
    expect(normalizeForCompare('  Nvidia ')).toBe('nvidia');
  });
});

describe('validateNewKeyword', () => {
  const existing = [{ label: 'Nvidia' }, { label: 'Bitcoin' }];

  it('rejects empty / whitespace-only', () => {
    expect(validateNewKeyword('   ', existing)).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects too-long labels', () => {
    expect(validateNewKeyword('x'.repeat(40), existing)).toEqual({ ok: false, error: 'too-long' });
  });

  it('rejects duplicates case-insensitively', () => {
    expect(validateNewKeyword('  nvidia ', existing)).toEqual({ ok: false, error: 'duplicate' });
  });

  it('rejects when at the limit', () => {
    const full = Array.from({ length: MAX_KEYWORDS }, (_, i) => ({ label: `kw${i}` }));
    expect(validateNewKeyword('NewOne', full)).toEqual({ ok: false, error: 'limit' });
  });

  it('accepts a valid new keyword', () => {
    expect(validateNewKeyword('Tesla', existing)).toEqual({ ok: true });
  });
});
