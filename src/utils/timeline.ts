import { Article, MappedPoint } from '@/types';

export interface TimeTick {
  x: number;
  label: string;
}

const AXIS_PAD = 60;
const COL_W = 24;
const STACK_STEP = 22;
const TICK_COUNT = 5;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Parse a compact ISO `YYYYMMDDTHHMMSSZ` seendate to UTC milliseconds, or null. */
export function parseSeendate(s: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(t) ? null : t;
}

/** Look-back window the issue time machine shows for a selected moment. */
export const TIME_MACHINE_WINDOW_MS = 24 * HOUR_MS;

/**
 * Restrict articles to the time machine's view: published in
 * [at - window, at]. `at === null` means live — everything passes.
 * Undated articles are excluded while traveling (they can't be placed).
 */
export function filterArticlesAsOf<T extends { seendate: string }>(
  articles: T[],
  at: number | null,
  windowMs: number = TIME_MACHINE_WINDOW_MS
): T[] {
  if (at === null) return articles;
  return articles.filter((a) => {
    const t = parseSeendate(a.seendate);
    return t !== null && t <= at && t >= at - windowMs;
  });
}

/**
 * Scrubbable date range of a set of articles: 10th-percentile floor (a lone
 * months-old outlier must not stretch the rail into emptiness), capped to the
 * last 30 days, and requiring ≥5 dated articles spanning ≥2h.
 */
export function computeTimeRange(
  articles: { seendate: string }[],
  maxSpanMs: number = 30 * DAY_MS
): { min: number; max: number } | null {
  const times: number[] = [];
  for (const a of articles) {
    const t = parseSeendate(a.seendate);
    if (t !== null) times.push(t);
  }
  if (times.length < 5) return null;
  times.sort((a, b) => a - b);
  const max = times[times.length - 1];
  const p10 = times[Math.floor(times.length * 0.1)];
  const min = Math.max(p10, max - maxSpanMs);
  return max - min >= 2 * HOUR_MS ? { min, max } : null;
}

/** Short local timestamp for scrubber labels (e.g. "8/14 21:05"). */
export function formatShortTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/**
 * Lay out articles on a horizontal time axis by publication time. Dots at the
 * same time-column stack vertically (alternating up/down) so busy periods read
 * as tall bursts while staying individually distinguishable.
 */
export function calculateTimeline(
  articles: Article[],
  width: number,
  height: number
): { points: MappedPoint[]; ticks: TimeTick[]; undatedCount: number } {
  if (articles.length === 0 || width === 0 || height === 0) {
    return { points: [], ticks: [], undatedCount: 0 };
  }

  // Dedup by URL, parse times, drop undated, sort ascending
  const dedup = Array.from(new Map(articles.map(a => [a.url, a])).values());
  const dated = dedup
    .map(a => ({ a, t: parseSeendate(a.seendate) }))
    .filter((d): d is { a: Article; t: number } => d.t !== null)
    .sort((p, q) => p.t - q.t);

  const undatedCount = dedup.length - dated.length;

  if (dated.length === 0) return { points: [], ticks: [], undatedCount };

  let min = dated[0].t;
  let max = dated[dated.length - 1].t;
  if (min === max) { min -= HOUR_MS; max += HOUR_MS; } // pad so the axis renders

  const x = (t: number) => AXIS_PAD + ((t - min) / (max - min)) * (width - 2 * AXIS_PAD);

  const colCounts: Record<number, number> = {};
  const points: MappedPoint[] = dated.map(({ a, t }) => {
    const px = x(t);
    const col = Math.round(px / COL_W);
    const idx = (colCounts[col] = (colCounts[col] ?? 0) + 1) - 1;
    const dir = idx % 2 === 0 ? 1 : -1;
    const py = height / 2 + dir * Math.ceil(idx / 2) * STACK_STEP;
    return {
      ...a,
      x: Math.max(10, Math.min(width - 10, px)),
      y: Math.max(50, Math.min(height - 50, py)),
    };
  });

  const span = max - min;
  const useDate = span > DAY_MS;
  const ticks: TimeTick[] = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = min + (span * i) / (TICK_COUNT - 1);
    const d = new Date(t);
    const label = useDate
      ? `${d.getMonth() + 1}/${d.getDate()}`
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { x: x(t), label };
  });

  return { points, ticks, undatedCount };
}
