import { Article, KeywordDef } from '@/types';
import { parseSeendate } from './timeline';

const ARCHIVE_KEY = 'neural-news:article-archive:v1';
const MAX_ITEMS = 1500;
const MAX_AGE_MS = 30 * 24 * 3600_000;

let cache: Article[] | null = null;

/** All archived articles, newest first (in-memory cached). */
export function loadArchive(): Article[] {
  if (typeof window === 'undefined') return [];
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARCHIVE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

/**
 * Fold freshly fetched articles into the rolling local archive. The archive is
 * what makes the time machine's range grow beyond the current 100-article
 * feed: every visit banks its articles (deduped by id, undated dropped,
 * pruned past 30 days / 1500 items).
 */
export function mergeArchive(incoming: Article[]): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const byId = new Map<string, Article>();
    for (const a of loadArchive()) byId.set(a.id, a);
    for (const a of incoming) byId.set(a.id, a);
    const merged = Array.from(byId.values()).filter((a) => {
      const t = parseSeendate(a.seendate);
      return t !== null && now - t <= MAX_AGE_MS;
    });
    merged.sort((x, y) => (y.seendate || '').localeCompare(x.seendate || ''));
    cache = merged.slice(0, MAX_ITEMS);
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(cache));
  } catch {
    /* quota exceeded → keep the in-memory copy only */
  }
}

/** Current feed + archive, deduped by id (current wins). */
export function archiveUnion(current: Article[], archive: Article[] = loadArchive()): Article[] {
  const ids = new Set(current.map((a) => a.id));
  const out = [...current];
  for (const a of archive) if (!ids.has(a.id)) out.push(a);
  return out;
}

/**
 * The article pool the app draws from at a given time-machine moment.
 * Live (`at === null`) → just the current feed. Traveling → feed + archive,
 * with each archived article's relevanceMap refreshed against the CURRENT
 * keyword set (title match) so era articles pass the active-keyword
 * visibility filters when they genuinely match.
 */
export function timeTravelPool(
  current: Article[],
  at: number | null,
  keywords: KeywordDef[],
  archive: Article[] = loadArchive()
): Article[] {
  if (at === null) return current;
  const ids = new Set(current.map((a) => a.id));
  const out = [...current];
  for (const a of archive) {
    if (ids.has(a.id)) continue;
    const lower = a.title.toLowerCase();
    const rel: Record<string, number> = {};
    for (const k of keywords) {
      if (k.label && lower.includes(k.label.toLowerCase())) rel[k.id] = 0.9;
    }
    out.push(Object.keys(rel).length > 0 ? { ...a, relevanceMap: rel } : a);
  }
  return out;
}
