import { NextResponse } from 'next/server';

// Server-side cache and lock
let lastFetchTime = 0;
let cachedData: any = null;
let lastQuery: string | null = null;
let isFetching = false;

const COOLDOWN_MS = 6000; // 6 seconds

// Fallback data when rate limited
const mockFallback = {
  articles: [
    {
      url: "https://example.com/fallback-1",
      domain: "example.com",
      title: "LIVE FEED PAUSED - GDELT RATE LIMIT EXCEEDED",
      seendate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    },
    {
      url: "https://example.com/fallback-2",
      domain: "system.local",
      title: "Showing Cached or Fallback Data. Please wait 6 seconds.",
      seendate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    }
  ]
};

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
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json&sort=DateDesc`;
    console.log('[API Route] Fetching from GDELT:', gdeltUrl);
    
    const response = await fetch(gdeltUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NeuralNewsCurationMVP/1.0'
      },
    });

    console.log('[API Route] GDELT Status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[API Route] GDELT Error Text:', text);
      if (response.status === 429) {
        console.log('[API Route] Rate limited by GDELT. Providing fallback.');
        lastFetchTime = Date.now(); 
        return NextResponse.json(cachedData || mockFallback);
      }
      throw new Error(`GDELT API responded with status ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    // Update Cache
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
