import { Article } from '@/types';

// Deterministic hash function for simple heuristics
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Fallback Sentiment Heuristic
function getSentimentHeuristic(title: string): 'positive' | 'negative' | 'neutral' {
  const hash = hashString(title);
  const mod = hash % 100;
  
  // Basic heuristic: 30% positive, 30% negative, 40% neutral
  if (mod < 30) return 'positive';
  if (mod < 60) return 'negative';
  return 'neutral';
}

// Fallback Type Heuristic
function getTypeHeuristic(title: string): 'breaking' | 'deep-dive' {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('update') || lowerTitle.includes('breaking') || lowerTitle.includes('new') || lowerTitle.includes('reports')) {
    return 'breaking';
  }
  return 'deep-dive';
}

// Pseudo-relevance Scoring
function calculateRelevanceMap(title: string, activeKeywords: Set<string>): Record<string, number> {
  const relevanceMap: Record<string, number> = {};
  const lowerTitle = title.toLowerCase();
  
  let matchFound = false;
  activeKeywords.forEach(kw => {
    // If the exact keyword is in the title, high relevance
    if (lowerTitle.includes(kw.toLowerCase())) {
      relevanceMap[kw] = 0.8 + (Math.random() * 0.2); // 0.8 to 1.0
      matchFound = true;
    } else {
      // Small background relevance so it still clusters somewhere if it was fetched via an OR query
      relevanceMap[kw] = 0.1 + (Math.random() * 0.3); // 0.1 to 0.4
    }
  });

  // If no direct matches (GDELT matched on body, not title), boost the first keyword so it has an anchor
  if (!matchFound && activeKeywords.size > 0) {
    const firstKw = Array.from(activeKeywords)[0];
    relevanceMap[firstKw] = 0.6;
  }

  return relevanceMap;
}

export async function fetchGdeltNews(activeKeywords: Set<string>): Promise<Article[]> {
  if (activeKeywords.size === 0) {
    return [];
  }

  // Construct query: (keyword1 OR keyword2)
  const keywordsArray = Array.from(activeKeywords);
  const queryStr = `(${keywordsArray.map(kw => `"${kw}"`).join(' OR ')})`;
  
  // Use internal Next.js API route to bypass CORS
  const url = `/api/gdelt?query=${encodeURIComponent(queryStr)}`;

  console.log('🌍 [GDELT Fetch] Requesting Internal Proxy URL:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error(`❌ [GDELT Fetch] Error: ${response.status} ${response.statusText}`);
    throw new Error(`GDELT API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('📦 [GDELT Fetch] Raw Response Data:', data);
  
  // GDELT might return empty object {} if no results
  if (!data || !data.articles || !Array.isArray(data.articles)) {
    console.warn('⚠️ [GDELT Fetch] No articles found or unexpected format.');
    return [];
  }

  // Transform to our Article format
  const mappedArticles: Article[] = data.articles.map((item: any): Article => {
    return {
      id: item.url, // URL is typically unique
      title: item.title,
      summary: `Source: ${item.domain}`, // Fallback as artlist lacks body text
      sentiment: getSentimentHeuristic(item.title),
      relevanceMap: calculateRelevanceMap(item.title, activeKeywords),
      type: getTypeHeuristic(item.title),
      url: item.url,
      domain: item.domain,
      seendate: item.seendate,
      socialimage: item.socialimage
    };
  });

  console.log(`✅ [GDELT Fetch] Successfully mapped ${mappedArticles.length} articles.`);
  return mappedArticles;
}
