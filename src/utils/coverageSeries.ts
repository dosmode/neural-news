import { parseSeendate } from './timeline';

export interface CoverageStream {
  id: string;
  label: string;
  /** Articles matched per time bucket (length = bucket count). */
  series: number[];
  /** Sum over all buckets — used for top-N selection and legend order. */
  total: number;
}

/**
 * Per-keyword coverage over time, bucketed across [range.min, range.max] —
 * the data behind the FLOW streamgraph. Titles are matched the same way as
 * computeImportance (whole word for short Latin labels, substring otherwise),
 * and only the top `maxStreams` keywords by total coverage are returned.
 * A light 3-point smoothing pass keeps the streams flowing instead of spiky.
 */
export function computeCoverageSeries(
  articles: { title: string; seendate: string }[],
  keywords: { id: string; label: string }[],
  range: { min: number; max: number },
  buckets = 28,
  maxStreams = 7
): CoverageStream[] {
  if (articles.length === 0 || keywords.length === 0 || range.max <= range.min) return [];
  const span = range.max - range.min;

  const dated = articles
    .map((a) => ({ t: parseSeendate(a.seendate), title: a.title.toLowerCase(), raw: a.title }))
    .filter((d): d is { t: number; title: string; raw: string } => d.t !== null && d.t >= range.min && d.t <= range.max);
  if (dated.length === 0) return [];

  const streams: CoverageStream[] = [];
  for (const k of keywords) {
    const needle = k.label.toLowerCase();
    if (needle.length < 2) continue;
    const boundaryRe =
      needle.length <= 3 && /^[a-z0-9]+$/.test(needle)
        ? new RegExp(`\\b${needle}\\b`)
        : null;
    const series = new Array(buckets).fill(0);
    let total = 0;
    for (const d of dated) {
      const hit = boundaryRe ? boundaryRe.test(d.title) : d.title.includes(needle);
      if (!hit) continue;
      const b = Math.min(buckets - 1, Math.floor(((d.t - range.min) / span) * buckets));
      series[b] += 1;
      total += 1;
    }
    if (total > 0) streams.push({ id: k.id, label: k.label, series, total });
  }

  streams.sort((a, b) => b.total - a.total);
  const top = streams.slice(0, maxStreams);

  // Smooth: centered 3-point average so the river flows.
  for (const s of top) {
    const src = s.series;
    s.series = src.map((v, i) => {
      const prev = src[i - 1] ?? v;
      const next = src[i + 1] ?? v;
      return (prev + v * 2 + next) / 4;
    });
  }
  return top;
}
