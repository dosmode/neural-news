import { KeywordDef, SuggestionDef } from '@/types';
import { slugify } from '@/utils/keywordUtils';
import { TRENDING_POOL } from './trendingService';

export const SUGGESTIONS_PER_KEYWORD = 5;

// Curated adjacency map: keyword slug → related keyword labels
export const KEYWORD_SUGGESTIONS_MAP: Record<string, string[]> = {
  'ai': ['Machine Learning', 'OpenAI', 'Nvidia', 'Deep Learning', 'Automation', 'Robotics'],
  'openai': ['AI', 'ChatGPT', 'GPT-4', 'Microsoft', 'Anthropic', 'LLM'],
  'nvidia': ['Semiconductors', 'AI', 'TSMC', 'GPU', 'Data Centers', 'Jensen Huang'],
  'tsmc': ['Semiconductors', 'Nvidia', 'Apple', 'Taiwan', 'Chip Manufacturing', 'Intel'],
  'semiconductors': ['Nvidia', 'TSMC', 'AI', 'Intel', 'Samsung', 'Chip Shortage'],
  'bitcoin': ['Ethereum', 'Crypto', 'Blockchain', 'DeFi', 'Stablecoins', 'Halving'],
  'ethereum': ['Bitcoin', 'DeFi', 'NFT', 'Smart Contracts', 'Layer 2', 'Staking'],
  'crypto': ['Bitcoin', 'Ethereum', 'Blockchain', 'Web3', 'DeFi', 'Regulation'],
  'tesla': ['Elon Musk', 'EV', 'SpaceX', 'Autopilot', 'Battery', 'Cybertruck'],
  'apple': ['iPhone', 'Tim Cook', 'TSMC', 'App Store', 'Vision Pro', 'Services'],
  'fed-rate': ['Inflation', 'Interest Rates', 'Recession', 'Jerome Powell', 'Monetary Policy', 'Dollar'],
  'interest-rates': ['Fed Rate', 'Inflation', 'Bonds', 'Mortgage', 'Bank Stocks', 'Recession'],
  'inflation': ['CPI', 'Fed Rate', 'Consumer Prices', 'Supply Chain', 'Recession', 'Gold'],
  'recession': ['Unemployment', 'GDP', 'Fed Rate', 'Inflation', 'Stock Market', 'Credit'],
  'us-china': ['Trade War', 'Taiwan', 'Tariffs', 'Supply Chain', 'Semiconductors', 'Geopolitics'],
  'gold': ['Silver', 'Commodities', 'Fed Rate', 'Safe Haven', 'Inflation', 'Oil'],
  'oil': ['OPEC', 'Energy', 'Gold', 'Gas Prices', 'Commodities', 'Climate'],
  'stock-market': ['S&P 500', 'Nasdaq', 'Dow Jones', 'Fed Rate', 'Earnings', 'IPO'],
  // Additional common topics
  'elon-musk': ['Tesla', 'SpaceX', 'Twitter', 'X', 'Neuralink', 'Starlink'],
  'microsoft': ['OpenAI', 'Azure', 'Copilot', 'AI', 'Cloud', 'Gaming'],
  'google': ['AI', 'Alphabet', 'Search', 'Cloud', 'YouTube', 'Android'],
  'amazon': ['AWS', 'E-Commerce', 'Cloud', 'AI', 'Logistics', 'Bezos'],
  'meta': ['Facebook', 'AI', 'Metaverse', 'Instagram', 'VR', 'Zuckerberg'],
  'climate': ['Energy', 'Oil', 'Carbon', 'Solar', 'EV', 'Green Energy'],
  'ukraine': ['Russia', 'War', 'NATO', 'Geopolitics', 'Sanctions', 'Energy'],
  'russia': ['Ukraine', 'Sanctions', 'Oil', 'Geopolitics', 'NATO', 'Ruble'],
  'taiwan': ['TSMC', 'China', 'US-China', 'Semiconductors', 'Geopolitics', 'Defense'],
  'defi': ['Ethereum', 'Crypto', 'Yield Farming', 'Stablecoins', 'Smart Contracts', 'Web3'],
  'real-estate': ['Interest Rates', 'Mortgage', 'Housing Market', 'Fed Rate', 'Inflation', 'REITs'],
};

/**
 * Returns up to SUGGESTIONS_PER_KEYWORD suggestion labels for a given keyword,
 * excluding keywords already active and suggestions already shown or dismissed.
 */
export function getSuggestionsFor(
  keywordId: string,
  existingKeywords: KeywordDef[],
  existingSuggestions: SuggestionDef[]
): string[] {
  const activeIds = new Set(existingKeywords.map((k) => k.id));
  const dismissedLabels = new Set(
    existingSuggestions
      .filter((s) => s.sourceKeywordId === keywordId && s.isDismissed)
      .map((s) => s.label.toLowerCase())
  );
  const shownLabels = new Set(
    existingSuggestions
      .filter((s) => s.sourceKeywordId === keywordId)
      .map((s) => s.label.toLowerCase())
  );

  const candidates = KEYWORD_SUGGESTIONS_MAP[keywordId] ?? [];

  const filtered = candidates.filter((label) => {
    const slug = slugify(label);
    return (
      !activeIds.has(slug) &&
      !dismissedLabels.has(label.toLowerCase()) &&
      !shownLabels.has(label.toLowerCase())
    );
  });

  if (filtered.length >= 3) {
    return filtered.slice(0, SUGGESTIONS_PER_KEYWORD);
  }

  // Fallback: pull from TRENDING_POOL excluding active keywords
  const fallback = TRENDING_POOL
    .filter((kw) => !activeIds.has(kw.id) && kw.id !== keywordId)
    .map((kw) => kw.label)
    .filter((label) => !dismissedLabels.has(label.toLowerCase()) && !shownLabels.has(label.toLowerCase()));

  const combined = [...new Set([...filtered, ...fallback])];
  return combined.slice(0, SUGGESTIONS_PER_KEYWORD);
}
