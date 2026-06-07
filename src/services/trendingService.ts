import { KeywordDef } from '@/types';
import { slugify } from '@/utils/keywordUtils';

// Curated candidate pool of current finance/tech topics. The ~5 surfaced on
// first visit are this pool ranked by how often each appears in live headlines.
export const TRENDING_POOL: KeywordDef[] = [
  'Nvidia', 'AI', 'Bitcoin', 'Tesla', 'Fed Rate', 'OpenAI', 'TSMC', 'Apple',
  'Inflation', 'Gold', 'Oil', 'US-China', 'Ethereum', 'Semiconductors',
  'Interest Rates', 'Stock Market', 'Recession', 'Crypto',
].map((label) => ({ id: slugify(label), label }));

/**
 * Hybrid trending: rank the curated pool by occurrence across a broad live
 * top-news fetch, return the top `count`. Always returns `count` items
 * (pool-order fallback) and never throws.
 */
export async function getTrendingKeywords(count = 5): Promise<KeywordDef[]> {
  const fallback = () => TRENDING_POOL.slice(0, count);

  try {
    const res = await fetch(
      '/api/gdelt?query=' + encodeURIComponent('business OR technology OR markets')
    );
    if (!res.ok) return fallback();

    const data = await res.json();
    const titles: string[] = Array.isArray(data?.articles)
      ? data.articles.map((a: any) => String(a?.title ?? '').toLowerCase())
      : [];
    if (titles.length === 0) return fallback();

    const ranked = TRENDING_POOL.map((topic, i) => {
      const needle = topic.label.toLowerCase();
      const score = titles.reduce((n, t) => n + (t.includes(needle) ? 1 : 0), 0);
      return { topic, score, i };
    })
      .sort((a, b) => (b.score - a.score) || (a.i - b.i)) // score desc, then pool order
      .map((s) => s.topic);

    return ranked.slice(0, count);
  } catch {
    return fallback();
  }
}
