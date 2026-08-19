import { create } from 'zustand';
import { AppState } from '@/types';
import { TIME_MACHINE_WINDOW_MS } from '@/utils/timeline';

// The three global filter weights (spec 012). 0.5 is neutral: no emphasis.
const DEFAULT_FILTER_WEIGHTS: Record<string, number> = {
  sentiment: 0.5,
  recency: 0.5,
  relevance: 0.5,
};

export const useStore = create<AppState>((set) => ({
  keywords: [],
  activeKeywords: new Set<string>(),
  filterWeights: { ...DEFAULT_FILTER_WEIGHTS },
  articles: [],
  selectedArticleId: null,
  isLoading: false,
  error: null,
  showClassificationField: true,
  hydrated: false,
  // Topic grouping is the more striking first impression — sentiment is one
  // toggle away.
  clusterMode: 'topic',
  viewMode: 'cluster',
  timeMachineAt: null,
  timeMachineWindowMs: TIME_MACHINE_WINDOW_MS,

  // The force graph owns the keyword lifecycle and syncs the full set here.
  setKeywords: (keywords, activeIds) =>
    set({
      keywords,
      activeKeywords: new Set(activeIds),
      hydrated: true,
    }),

  setFilterWeight: (id, weight) =>
    set((state) => ({
      filterWeights: { ...state.filterWeights, [id]: weight },
    })),

  setSelectedArticle: (id) => set({ selectedArticleId: id }),

  setArticles: (articles) => set({ articles }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  toggleClassificationField: () =>
    set((s) => ({ showClassificationField: !s.showClassificationField })),

  setClusterMode: (clusterMode) => set({ clusterMode }),

  setViewMode: (viewMode) => set({ viewMode }),

  // Defensive: a non-finite moment or window would silently blank the whole
  // app (every date filter fails against NaN) — never store one.
  setTimeMachineAt: (timeMachineAt, windowMs) =>
    set((s) => ({
      timeMachineAt:
        timeMachineAt === null || Number.isFinite(timeMachineAt)
          ? timeMachineAt
          : s.timeMachineAt,
      timeMachineWindowMs:
        windowMs !== undefined && Number.isFinite(windowMs) && windowMs > 0
          ? windowMs
          : s.timeMachineWindowMs,
    })),
}));
