import { create } from 'zustand';
import { AppState, DynamicFilterNode, KeywordDef } from '@/types';
import { slugify, validateNewKeyword, MAX_KEYWORDS } from '@/utils/keywordUtils';

const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  // legacy + pool slugs → nicer hidden-layer categories (unknown ids fall to "General")
  'nvda': 'Semiconductors',
  'nvidia': 'Semiconductors',
  'tsmc': 'Semiconductors',
  'semiconductors': 'Semiconductors',
  'ai': 'AI & Technology',
  'ai-trend': 'AI & Technology',
  'openai': 'AI & Technology',
  'apple': 'AI & Technology',
  'tesla': 'AI & Technology',
  'bitcoin': 'Crypto',
  'ethereum': 'Crypto',
  'crypto': 'Crypto',
  'fed-rate': 'Monetary Policy',
  'interest-rates': 'Monetary Policy',
  'inflation': 'Monetary Policy',
  'recession': 'Monetary Policy',
  'us-china': 'Geopolitics',
  'gold': 'Commodities',
  'oil': 'Commodities',
  'stock-market': 'Markets',
};

const LAYER_2_NODES: DynamicFilterNode[] = [
  { id: 'sentiment', label: 'Sentiment', layer: 2 },
  { id: 'recency', label: 'Recency', layer: 2 },
  { id: 'relevance', label: 'Relevance', layer: 2 },
];

function computeDynamicFilterNodes(activeKeywords: Set<string>): DynamicFilterNode[] {
  const categories = new Set(
    Array.from(activeKeywords).map(kw => KEYWORD_CATEGORY_MAP[kw] ?? 'General')
  );
  const layer1: DynamicFilterNode[] = Array.from(categories)
    .slice(0, 4)
    .map(cat => ({ id: cat, label: cat, layer: 1 as const }));
  return [...layer1, ...LAYER_2_NODES];
}

// Recompute the derived hidden-layer nodes + filter weights for a keyword set,
// preserving any existing weight for unchanged categories.
function deriveFrom(activeKeywords: Set<string>, prevWeights: Record<string, number>) {
  const dynamicFilterNodes = computeDynamicFilterNodes(activeKeywords);
  const filterWeights: Record<string, number> = {};
  dynamicFilterNodes.forEach(node => {
    filterWeights[node.id] = prevWeights[node.id] ?? 0.5;
  });
  return { dynamicFilterNodes, filterWeights };
}

const emptyDerived = deriveFrom(new Set(), {});

export const useStore = create<AppState>((set) => ({
  keywords: [],
  activeKeywords: new Set<string>(),
  filterWeights: emptyDerived.filterWeights,
  dynamicFilterNodes: emptyDerived.dynamicFilterNodes,
  articles: [],
  selectedArticleId: null,
  isLoading: false,
  error: null,
  showClassificationField: true,
  hydrated: false,
  clusterMode: 'sentiment',
  viewMode: 'cluster',

  toggleKeyword: (id) => set((state) => {
    const newKeywords = new Set(state.activeKeywords);
    if (newKeywords.has(id)) newKeywords.delete(id);
    else newKeywords.add(id);
    return { activeKeywords: newKeywords, ...deriveFrom(newKeywords, state.filterWeights) };
  }),

  addKeyword: (label) => {
    let result: { ok: boolean; error?: string } = { ok: true };
    set((state) => {
      const v = validateNewKeyword(label, state.keywords, MAX_KEYWORDS);
      if (!v.ok) {
        result = { ok: false, error: v.error };
        return {};
      }
      const trimmed = label.trim();
      const def: KeywordDef = { id: slugify(trimmed), label: trimmed };
      // guard against slug collision producing an existing id
      if (state.keywords.some(k => k.id === def.id)) {
        result = { ok: false, error: 'duplicate' };
        return {};
      }
      const newActive = new Set(state.activeKeywords);
      newActive.add(def.id);
      return {
        keywords: [...state.keywords, def],
        activeKeywords: newActive,
        ...deriveFrom(newActive, state.filterWeights),
      };
    });
    return result;
  },

  removeKeyword: (id) => set((state) => {
    const newActive = new Set(state.activeKeywords);
    newActive.delete(id);
    return {
      keywords: state.keywords.filter(k => k.id !== id),
      activeKeywords: newActive,
      ...deriveFrom(newActive, state.filterWeights),
    };
  }),

  setKeywords: (keywords, activeIds) => set((state) => {
    const newActive = new Set(activeIds);
    return {
      keywords,
      activeKeywords: newActive,
      hydrated: true,
      ...deriveFrom(newActive, state.filterWeights),
    };
  }),

  setFilterWeight: (id, weight) => set((state) => ({
    filterWeights: { ...state.filterWeights, [id]: weight },
  })),

  setSelectedArticle: (id) => set({ selectedArticleId: id }),

  setArticles: (articles) => set({ articles }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  toggleClassificationField: () => set((s) => ({ showClassificationField: !s.showClassificationField })),

  setClusterMode: (clusterMode) => set({ clusterMode }),

  setViewMode: (viewMode) => set({ viewMode }),
}));
