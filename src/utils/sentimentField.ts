import { Article } from '@/types';

/** Clamp a number into the [0, 1] range. */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Map an article sentiment to an rgba color string for the classification field.
 * Reuses the app's sentiment palette: positive = neon-blue, negative = neon-red,
 * neutral = dim grey-blue (reads as "uncertain / dark").
 */
export function sentimentFieldColor(sentiment: Article['sentiment'], alpha: number): string {
  switch (sentiment) {
    case 'positive':
      return `rgba(0,243,255,${alpha})`;
    case 'negative':
      return `rgba(255,49,49,${alpha})`;
    default:
      // Dim cool-grey so the neutral cluster doesn't blow out to pure white under additive blending
      return `rgba(80,92,120,${alpha})`;
  }
}

/**
 * Derive the field's overall intensity multiplier (0.4..1.0) from the Sentiment
 * filter weight, so the existing slider visibly saturates/softens the field.
 */
export function fieldIntensity(sentimentWeight: number): number {
  return 0.4 + clamp01(sentimentWeight) * 0.6;
}
