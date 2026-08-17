import { parseSeendate } from '@/utils/timeline';

export interface ImportanceEntry {
  /** Normalized 0..1 within the current node set (1 = hottest keyword now). */
  score: number;
  /** Raw number of feed articles whose title mentions the keyword. */
  count: number;
}

/**
 * How important is each keyword *right now*, judged by the live feed: count
 * the articles whose title mentions the node's label, weighting newer
 * articles more (newest ≈ 1.0, oldest ≈ 0.4 per match). Scores are
 * normalized against the hottest node so the graph always has a full-size
 * anchor. Drives node radius/glow so the day's dominant issues read at a
 * glance.
 */
export interface ImportanceOpts {
  /** Time-machine mode: measure coverage as of this Unix-ms moment. */
  at?: number;
  /** Look-back window for `at` mode (default 24h). */
  windowMs?: number;
}

export function computeImportance(
  articles: { title: string; seendate: string }[],
  nodes: { id: string; label: string }[],
  opts?: ImportanceOpts
): Map<string, ImportanceEntry> {
  const map = new Map<string, ImportanceEntry>();
  if (articles.length === 0 || nodes.length === 0) return map;

  const at = opts?.at ?? null;
  const windowMs = opts?.windowMs ?? 24 * 3600_000;

  let dated = articles.map((a) => ({
    title: a.title.toLowerCase(),
    t: parseSeendate(a.seendate),
  }));

  let min: number;
  let span: number;
  if (at !== null) {
    // As-of mode: only articles published in [at - window, at] exist "yet";
    // undated articles can't be placed on the timeline and are excluded.
    const start = at - windowMs;
    dated = dated.filter((d) => d.t !== null && d.t <= at && d.t >= start);
    if (dated.length === 0) return map;
    min = start;
    span = windowMs;
  } else {
    const times = dated.map((d) => d.t).filter((t): t is number => t !== null);
    min = times.length ? Math.min(...times) : 0;
    span = (times.length ? Math.max(...times) : 1) - min || 1;
  }

  let maxScore = 0;
  for (const n of nodes) {
    const needle = n.label.toLowerCase();
    if (needle.length < 2) {
      map.set(n.id, { score: 0, count: 0 });
      continue;
    }
    // Short Latin labels ("US", "AI", "EV") must match as whole words —
    // plain substring search would count "business" as a hit for "us".
    const boundaryRe =
      needle.length <= 3 && /^[a-z0-9]+$/.test(needle)
        ? new RegExp(`\\b${needle}\\b`)
        : null;
    let score = 0;
    let count = 0;
    for (const d of dated) {
      if (boundaryRe ? !boundaryRe.test(d.title) : !d.title.includes(needle)) continue;
      count += 1;
      const recency = d.t === null ? 0.5 : (d.t - min) / span;
      score += 0.4 + recency * 0.6;
    }
    map.set(n.id, { score, count });
    if (score > maxScore) maxScore = score;
  }

  if (maxScore > 0) {
    map.forEach((e) => {
      e.score = e.score / maxScore;
    });
  }
  return map;
}
