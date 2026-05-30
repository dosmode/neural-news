import { NextResponse } from 'next/server';

// Server-side cache and lock to absolutely guarantee GDELT's 1-request-per-5-seconds rule
let lastFetchTime = 0;
let cachedData: any = null;
let lastQuery: string | null = null;
let isFetching = false;

const COOLDOWN_MS = 6000; // 6 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const now = Date.now();

  // 1. If we already fetched this exact query recently, return the cache immediately
  if (cachedData && lastQuery === query && (now - lastFetchTime) < 60000) {
    console.log('[API Route] Returning cached data for query:', query);
    return NextResponse.json(cachedData);
  }

  // 2. If a fetch is currently in progress, reject to prevent overlapping connections
  if (isFetching) {
    console.warn('[API Route] Fetch in progress, rejecting overlapping request.');
    return NextResponse.json({ error: 'Rate limit protection active, please wait.' }, { status: 429 });
  }

  // 3. If we are within the cooldown period from ANY previous fetch, reject
  if (now - lastFetchTime < COOLDOWN_MS) {
    console.warn('[API Route] Global cooldown active, rejecting request.');
    return NextResponse.json({ error: 'Rate limit protection active, please wait.' }, { status: 429 });
  }

  // 4. Safe to fetch
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
    // Even on error, we must update the fetch time so we don't spam retries
    lastFetchTime = Date.now(); 
    return NextResponse.json({ error: error.message || 'Failed to fetch from GDELT' }, { status: 500 });
  } finally {
    isFetching = false;
  }
}
