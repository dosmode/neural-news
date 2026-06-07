import { describe, it, expect } from 'vitest';
import { clamp01, sentimentFieldColor, fieldIntensity } from '@/utils/sentimentField';

describe('sentimentFieldColor', () => {
  it('returns neon-blue rgba for positive with the alpha interpolated', () => {
    expect(sentimentFieldColor('positive', 0.5)).toBe('rgba(0,243,255,0.5)');
  });

  it('returns neon-red rgba for negative', () => {
    expect(sentimentFieldColor('negative', 0.3)).toBe('rgba(255,49,49,0.3)');
  });

  it('returns dim grey-blue rgba for neutral', () => {
    expect(sentimentFieldColor('neutral', 0.2)).toBe('rgba(80,92,120,0.2)');
  });

  it('interpolates alpha 0 for the outer gradient stop', () => {
    expect(sentimentFieldColor('positive', 0)).toBe('rgba(0,243,255,0)');
  });
});

describe('fieldIntensity', () => {
  it('returns 0.4 at weight 0', () => {
    expect(fieldIntensity(0)).toBe(0.4);
  });

  it('returns 1.0 at weight 1', () => {
    expect(fieldIntensity(1)).toBeCloseTo(1.0);
  });

  it('clamps weights above 1 to 1.0', () => {
    expect(fieldIntensity(2)).toBe(1.0);
  });

  it('clamps negative weights to the 0.4 floor', () => {
    expect(fieldIntensity(-1)).toBe(0.4);
  });
});

describe('clamp01', () => {
  it('clamps below 0', () => {
    expect(clamp01(-0.5)).toBe(0);
  });
  it('clamps above 1', () => {
    expect(clamp01(1.5)).toBe(1);
  });
  it('passes through in-range values', () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
});
