import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json&sort=DateDesc`;
    console.log('[API Route] Fetching from GDELT:', gdeltUrl);
    
    const response = await fetch(gdeltUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
    });

    console.log('[API Route] GDELT Status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[API Route] GDELT Error Text:', text);
      throw new Error(`GDELT API responded with status ${response.status}: ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Caught Exception:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch from GDELT' }, { status: 500 });
  }
}
