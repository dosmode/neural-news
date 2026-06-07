import * as d3 from 'd3';
import { Article, MappedPoint } from '@/types';

export type ClusterMode = 'sentiment' | 'topic';

export interface Cluster {
  key: string;                 // sentiment value OR topic id
  label: string;               // display text
  kind: 'sentiment' | 'topic';
  sentiment?: 'positive' | 'negative' | 'neutral'; // set in sentiment mode (label color)
  count: number;
  percent: number;             // 0..100
  cx: number;
  cy: number;
}
export type SentimentCluster = Cluster; // back-compat alias

const SENTIMENT_ORDER: Array<'negative' | 'neutral' | 'positive'> = ['negative', 'neutral', 'positive'];
const OTHER_KEY = '__other__';
const ANCHOR_STRENGTH = 0.3; // higher = tighter blobs, more inter-cluster gap
const COLLIDE_RADIUS = 14; // dot visual radius + gap
const SETTLE_TICKS = 120;

/** The active keyword id an article is most relevant to (argmax of relevanceMap). */
export function dominantTopic(article: Article, activeIds: string[], keywordOrder: string[]): string {
  let best = OTHER_KEY;
  let bestScore = -Infinity;
  let bestOrder = Infinity;
  for (const id of activeIds) {
    const score = article.relevanceMap?.[id];
    if (score === undefined) continue;
    const order = keywordOrder.indexOf(id);
    if (score > bestScore || (score === bestScore && order < bestOrder)) {
      best = id;
      bestScore = score;
      bestOrder = order;
    }
  }
  return best;
}

export function calculateClustering(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  width: number,
  height: number,
  mode: ClusterMode = 'sentiment',
  keywords: { id: string; label: string }[] = []
): { points: MappedPoint[]; clusters: Cluster[] } {
  if (articles.length === 0) return { points: [], clusters: [] };

  // Deduplicate by URL, then shallow-clone so D3 never mutates the store articles
  const uniqueArticles = Array.from(new Map(articles.map(a => [a.url, a])).values());

  // Filter to articles relevant to active keywords (keyword still controls the set)
  const visibleArticles = uniqueArticles.filter(article =>
    Object.keys(article.relevanceMap).some(kw => activeKeywords.has(kw))
  );
  const sourceArticles = visibleArticles.length > 0 ? visibleArticles : uniqueArticles;

  // Shallow-clone — D3 adds x/y/vx/vy to these clones, not the originals
  const dataToSimulate: any[] = sourceArticles.map(a => ({ ...a }));

  const activeIds = Array.from(activeKeywords);
  const keywordOrder = keywords.map(k => k.id);
  const labelOf = new Map(keywords.map(k => [k.id, k.label]));

  // Assign each dot a group key according to the mode
  const groupKeyOf = (d: any): string =>
    mode === 'topic' ? dominantTopic(d, activeIds, keywordOrder) : d.sentiment;
  dataToSimulate.forEach((d: any) => { d.__group = groupKeyOf(d); });

  // Determine present groups + their left→right order
  let present: string[];
  if (mode === 'topic') {
    const ordered = keywordOrder.filter(id => dataToSimulate.some(d => d.__group === id));
    if (dataToSimulate.some(d => d.__group === OTHER_KEY)) ordered.push(OTHER_KEY);
    present = ordered;
  } else {
    present = SENTIMENT_ORDER.filter(s => dataToSimulate.some(d => d.__group === s));
  }

  const N = present.length;
  const anchorX: Record<string, number> = {};
  const anchorY: Record<string, number> = {};
  present.forEach((key, i) => {
    anchorX[key] = (width * (i + 1)) / (N + 1);
    anchorY[key] = height * 0.5;
  });

  // Initialise each dot at its cluster anchor (fast, stable settle)
  dataToSimulate.forEach((d: any) => {
    d.x = anchorX[d.__group];
    d.y = anchorY[d.__group];
  });

  const simulation = d3.forceSimulation(dataToSimulate)
    .force('x', d3.forceX((d: any) => anchorX[d.__group]).strength(ANCHOR_STRENGTH))
    .force('y', d3.forceY((d: any) => anchorY[d.__group]).strength(ANCHOR_STRENGTH))
    .force('collide', d3.forceCollide(COLLIDE_RADIUS))
    .stop();

  for (let i = 0; i < SETTLE_TICKS; ++i) simulation.tick();

  const points: MappedPoint[] = dataToSimulate.map((d: any) => {
    const { __group, ...rest } = d;
    return {
      ...rest,
      x: Math.max(10, Math.min(width - 10, isNaN(d.x) ? width / 2 : d.x)),
      y: Math.max(10, Math.min(height - 10, isNaN(d.y) ? height / 2 : d.y)),
    };
  });

  // Build cluster metadata (count, percent, centroid) from the settled points.
  // points[i] aligns with dataToSimulate[i] (map preserves order).
  const total = points.length;
  const clusters: Cluster[] = present.map((key) => {
    let count = 0, sx = 0, sy = 0;
    dataToSimulate.forEach((d: any, idx: number) => {
      if (d.__group === key) { count++; sx += points[idx].x; sy += points[idx].y; }
    });
    const cx = sx / count;
    const cy = sy / count;

    if (mode === 'topic') {
      return {
        key,
        label: key === OTHER_KEY ? 'Other' : (labelOf.get(key) ?? key),
        kind: 'topic' as const,
        count,
        percent: Math.round((count / total) * 100),
        cx,
        cy,
      };
    }
    return {
      key,
      label: key,
      kind: 'sentiment' as const,
      sentiment: key as 'positive' | 'negative' | 'neutral',
      count,
      percent: Math.round((count / total) * 100),
      cx,
      cy,
    };
  });

  return { points, clusters };
}
