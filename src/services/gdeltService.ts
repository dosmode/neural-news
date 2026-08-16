import { Article, KeywordDef } from '@/types';

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
// Word-list sentiment (English + Korean). A lexicon heuristic, not ML — but
// unlike the old title-hash version the label actually reflects the headline.
const POSITIVE_WORDS = [
  'surge', 'soar', 'rally', 'rallies', 'record high', 'gain', 'jump', 'boost',
  'wins', 'beat', 'beats', 'growth', 'rise', 'rises', 'breakthrough',
  'success', 'profit', 'strong', 'recovery', 'upgrade', 'bullish', 'expands',
  'milestone', 'award', 'approve', 'approved',
  '호조', '상승', '급등', '최고치', '돌파', '성공', '흑자', '수익', '성장',
  '개선', '회복', '호재', '달성', '강세', '수상', '승인', '확대',
] as const;
const NEGATIVE_WORDS = [
  'crash', 'plunge', 'plummet', 'fall', 'falls', 'drop', 'drops', 'loss',
  'losses', 'fail', 'fails', 'crisis', 'fear', 'fears', 'risk', 'risks',
  'warn', 'warns', 'warning', 'layoff', 'layoffs', 'decline', 'slump',
  'weak', 'worst', 'recession', 'downgrade', 'bearish', 'concern', 'tumble',
  'sink', 'sinks', 'lawsuit', 'fraud', 'ban', 'banned', 'shutdown',
  '하락', '급락', '최저', '적자', '손실', '위기', '우려', '부진', '침체',
  '경고', '악재', '약세', '감소', '소송', '사기', '금지', '중단', '파산',
] as const;

function getSentimentHeuristic(title: string): 'positive' | 'negative' | 'neutral' {
  const lower = title.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score -= 1;
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
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

// Deterministic 0..1 jitter from a seed string, so the same article + keyword
// always lands in the same spot (no reshuffle on refetch).
function jitter(seed: string): number {
  return (hashString(seed) % 1000) / 1000;
}

// Pseudo-relevance Scoring — matches against the keyword LABEL, keys the map by keyword ID
function calculateRelevanceMap(title: string, activeKeywords: KeywordDef[]): Record<string, number> {
  const relevanceMap: Record<string, number> = {};
  const lowerTitle = title.toLowerCase();

  let matchFound = false;
  activeKeywords.forEach(kw => {
    // If the keyword's human label appears in the title, high relevance
    if (lowerTitle.includes(kw.label.toLowerCase())) {
      relevanceMap[kw.id] = 0.8 + jitter(title + '|' + kw.id) * 0.2; // 0.8 to 1.0
      matchFound = true;
    } else {
      // Small background relevance so it still clusters somewhere if it was fetched via an OR query
      relevanceMap[kw.id] = 0.1 + jitter(title + '|' + kw.id) * 0.3; // 0.1 to 0.4
    }
  });

  // If no direct matches (matched on body, not title), anchor the first keyword
  if (!matchFound && activeKeywords.length > 0) {
    relevanceMap[activeKeywords[0].id] = 0.6;
  }

  return relevanceMap;
}

export interface NewsFetchResult {
  articles: Article[];
  /** Server is rate-locked and had no cache for this query: retry shortly. */
  pending?: boolean;
  retryAfterMs?: number;
}

export async function fetchGdeltNews(activeKeywords: KeywordDef[]): Promise<NewsFetchResult> {
  if (activeKeywords.length === 0) {
    return { articles: [] };
  }

  // Construct query from human labels: (label1 OR label2)
  const queryStr = `(${activeKeywords.map(k => k.label).join(' OR ')})`;

  // Use internal Next.js API route to bypass CORS
  const url = `/api/gdelt?query=${encodeURIComponent(queryStr)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data?.pending) {
    return { articles: [], pending: true, retryAfterMs: data.retryAfterMs ?? 1500 };
  }

  if (!data || !data.articles || !Array.isArray(data.articles)) {
    return { articles: [] };
  }

  // Transform to our Article format, deduping by URL so React keys stay unique.
  const seenUrls = new Set<string>();
  const mappedArticles: Article[] = [];
  for (const item of data.articles) {
    if (!item?.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    mappedArticles.push({
      id: item.url, // URL is unique after dedup
      title: item.title,
      summary: `Source: ${item.domain}`, // Fallback as artlist lacks body text
      sentiment: getSentimentHeuristic(item.title),
      relevanceMap: calculateRelevanceMap(item.title, activeKeywords),
      type: getTypeHeuristic(item.title),
      url: item.url,
      domain: item.domain,
      seendate: item.seendate,
    });
  }

  return { articles: mappedArticles };
}
