import { Article } from '@/types';
import { parseSeendate } from '@/utils/timeline';
import { dominantTopic } from '@/utils/clustering';

export interface DotEmphasis {
  scale: number;
  opacity: number;
}

// Center a 0..1 weight around its neutral 0.5 default → [-1, 1]
const c = (w: number) => (w - 0.5) * 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Turn the filter weights into a per-article size/brightness multiplier.
 * All weights at the neutral default (0.5) → every dot { scale: 1, opacity: 1 }
 * (baseline preserved). Higher weight emphasizes the matching dots (larger),
 * lower weight de-emphasizes them (smaller + dimmer).
 */
export function computeEmphasisMap(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  keywords: { id: string; label: string }[]
): Map<string, DotEmphasis> {
  const map = new Map<string, DotEmphasis>();
  if (articles.length === 0) return map;

  const activeIds = Array.from(activeKeywords);
  const order = keywords.map((k) => k.id);

  // Recency normalization across dated articles (newest = 1, oldest = 0)
  const times = articles
    .map((a) => parseSeendate(a.seendate))
    .filter((t): t is number => t !== null);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 1;
  const span = max - min || 1;

  const cS = c(filterWeights['sentiment'] ?? 0.5);
  const cR = c(filterWeights['recency'] ?? 0.5);
  const cRel = c(filterWeights['relevance'] ?? 0.5);

  for (const a of articles) {
    const t = parseSeendate(a.seendate);
    const recency = t === null ? 0 : (t - min) / span;
    const relevance = activeIds.reduce((m, id) => Math.max(m, a.relevanceMap[id] ?? 0), 0);
    const strength = a.sentiment === 'neutral' ? 0.2 : 1;
    const topicId = dominantTopic(a, activeIds, order);
    const cTopic = c(filterWeights[topicId] ?? 0.5);

    const e = cS * strength + cR * recency + cRel * relevance + cTopic;
    const emphasis = clamp(e / 4, -1, 1);

    map.set(a.id, {
      scale: clamp(1 + emphasis * 0.45, 0.55, 1.45),
      // reduce only below neutral → [0.45, 1]
      opacity: clamp(1 + Math.min(0, emphasis) * 0.55, 0.45, 1),
    });
  }

  return map;
}
