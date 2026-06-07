import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Server-side cache and lock
let lastFetchTime = 0;
let cachedData: any = null;
let lastQuery: string | null = null;
let isFetching = false;

const COOLDOWN_MS = 3000;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const mockFallback = {
  articles: [
    {
      url: "https://example.com/fallback-1",
      domain: "example.com",
      title: "뉴스 피드 로딩 중...",
      seendate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    },
  ]
};

function parseRssToArticles(xml: string): { articles: any[] } {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;

  if (!items) return { articles: [] };

  const itemsArray = Array.isArray(items) ? items : [items];

  const articles = itemsArray.map((item: any) => {
    // Google News RSS: actual source URL is in <source url="...">
    const sourceUrl = item.source?.['@_url'] || '';
    const domain = sourceUrl
      ? new URL(sourceUrl).hostname.replace(/^www\./, '')
      : '';

    const seendate = item.pubDate
      ? new Date(item.pubDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : '';

    return {
      url: item.link || item.guid || '',
      domain,
      title: item.title || '',
      seendate,
    };
  });

  return { articles };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const now = Date.now();

  if (cachedData && lastQuery === query && (now - lastFetchTime) < 60000) {
    console.log('[API Route] Returning cached data for query:', query);
    return NextResponse.json(cachedData);
  }

  if (isFetching || (now - lastFetchTime < COOLDOWN_MS)) {
    console.warn('[API Route] Cooldown active. Returning cached or fallback data.');
    return NextResponse.json(cachedData || mockFallback);
  }

  isFetching = true;

  try {
    // Strip OR/parentheses for Google News — use space-separated keywords
    const cleanQuery = query.replace(/[()]/g, '').replace(/ OR /g, ' ');
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
    console.log('[API Route] Fetching from Google News RSS:', newsUrl);

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

    console.log('[API Route] Google News Status:', response.status);

    if (!response.ok) {
      throw new Error(`Google News RSS responded with status ${response.status}`);
    }

    const xml = await response.text();

    let data: { articles: any[] };
    try {
      data = parseRssToArticles(xml);
    } catch (parseErr) {
      console.warn('[API Route] RSS parse failed:', parseErr);
      lastFetchTime = Date.now();
      return NextResponse.json(cachedData || mockFallback);
    }

    console.log(`[API Route] Parsed ${data.articles.length} articles from Google News`);

    cachedData = data;
    lastQuery = query;
    lastFetchTime = Date.now();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Caught Exception:', error);
    lastFetchTime = Date.now();
    return NextResponse.json(cachedData || mockFallback);
  } finally {
    isFetching = false;
  }
}
