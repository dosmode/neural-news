import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Server-side per-query cache + a global fetch lock.
// NOTE: module-level state only holds within a single warm instance; on
// serverless multi-instance deploys each instance keeps its own cache.
const cache = new Map<string, { data: { articles: any[] }; time: number }>();
const CACHE_TTL_MS = 60000; // full results
const EMPTY_TTL_MS = 10000; // empty results expire fast so a hiccup doesn't stick
const MAX_CACHE_ENTRIES = 20;

let lastFetchTime = 0;
let isFetching = false;
const COOLDOWN_MS = 3000;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function getCached(query: string): { articles: any[] } | null {
  const entry = cache.get(query);
  if (!entry) return null;
  const ttl = entry.data.articles.length > 0 ? CACHE_TTL_MS : EMPTY_TTL_MS;
  if (Date.now() - entry.time > ttl) {
    cache.delete(query);
    return null;
  }
  return entry.data;
}

function setCached(query: string, data: { articles: any[] }) {
  cache.set(query, { data, time: Date.now() });
  // Evict oldest entries beyond the cap
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function parseRssToArticles(xml: string): { articles: any[] } {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;

  if (!items) return { articles: [] };

  const itemsArray = Array.isArray(items) ? items : [items];
  const articles: any[] = [];

  // Per-item guard: one malformed item must not discard the whole batch.
  for (const item of itemsArray) {
    try {
      const sourceUrl = item.source?.['@_url'] || '';
      let domain = '';
      try {
        domain = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : '';
      } catch {
        domain = '';
      }

      let seendate = '';
      if (item.pubDate) {
        const d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) {
          seendate = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        }
      }

      const url = item.link || item.guid || '';
      if (!url || !item.title) continue;

      articles.push({ url, domain, title: item.title, seendate });
    } catch {
      continue;
    }
  }

  return { articles };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const cached = getCached(query);
  if (cached) {
    return NextResponse.json(cached);
  }

  const now = Date.now();
  if (isFetching || now - lastFetchTime < COOLDOWN_MS) {
    // No cache for THIS query and the upstream is rate-locked: tell the client
    // to retry shortly instead of serving another query's articles.
    const retryAfterMs = Math.max(500, COOLDOWN_MS - (now - lastFetchTime));
    return NextResponse.json({ articles: [], pending: true, retryAfterMs });
  }

  isFetching = true;

  try {
    // Google News RSS supports boolean OR (uppercase). Strip only parentheses.
    const cleanQuery = query.replace(/[()]/g, '').trim();
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(newsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NeuralNewsFeed/1.0)' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Google News RSS responded with status ${response.status}`);
    }

    const xml = await response.text();
    const data = parseRssToArticles(xml);

    setCached(query, data);
    lastFetchTime = Date.now();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Fetch failed:', error?.message || error);
    lastFetchTime = Date.now();
    // Surface a real error so the client can show its ERROR state —
    // never fabricate placeholder articles.
    return NextResponse.json(
      { articles: [], error: 'upstream_failed', message: String(error?.message || error) },
      { status: 502 }
    );
  } finally {
    isFetching = false;
  }
}
