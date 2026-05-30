import { create } from 'zustand';
import { AppState, Article } from '@/types';

export const useStore = create<AppState>((set) => ({
  activeKeywords: new Set(['nvda', 'ai-trend']), // Default active
  filterWeights: {
    'sentiment': 0.5,
    'type': 0.5,
    'market': 0.5,
  },
  articles: [],
  selectedArticleId: null,
  currentGradient: 'from-blue-900 via-black to-red-900',
  isLoading: false,
  error: null,

  toggleKeyword: (id) => set((state) => {
    const newSet = new Set(state.activeKeywords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { activeKeywords: newSet };
  }),

  setFilterWeight: (id, weight) => set((state) => ({
    filterWeights: { ...state.filterWeights, [id]: weight }
  })),

  setSelectedArticle: (id) => set({ selectedArticleId: id }),

  setArticles: (articles) => set({ articles }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
}));
