import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json&sort=DateDesc`;
    
    // Server-side fetch bypasses browser CORS
    const response = await fetch(gdeltUrl, {
      headers: {
        'User-Agent': 'NeuralNewsCurationMVP/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`GDELT API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Route Error fetching GDELT:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch from GDELT' }, { status: 500 });
  }
}
