export interface Article {
  id: string;
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceMap: Record<string, number>;
  type: 'breaking' | 'deep-dive';
  url: string;
  domain: string;
  seendate: string;
}

export interface MappedPoint extends Article {
  x: number;
  y: number;
}

export interface KeywordDef {
  id: string;
  label: string;
  parentId?: string | null;
}

export type ClusterMode = 'sentiment' | 'topic';

export type ViewMode = 'cluster' | 'timeline' | 'flow';

export interface AppState {
  keywords: KeywordDef[];
  activeKeywords: Set<string>;
  filterWeights: Record<string, number>;
  articles: Article[];
  selectedArticleId: string | null;
  isLoading: boolean;
  error: string | null;
  showClassificationField: boolean;
  hydrated: boolean;
  clusterMode: ClusterMode;
  viewMode: ViewMode;
  /** Issue time machine: view the app as of this Unix-ms moment (null = live). */
  timeMachineAt: number | null;
  /** Width of the selected time window ending at timeMachineAt (min↔max range). */
  timeMachineWindowMs: number;

  // Actions
  setClusterMode: (mode: ClusterMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setKeywords: (keywords: KeywordDef[], activeIds: string[]) => void;
  setFilterWeight: (id: string, weight: number) => void;
  setSelectedArticle: (id: string | null) => void;
  setArticles: (articles: Article[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleClassificationField: () => void;
  setTimeMachineAt: (at: number | null, windowMs?: number) => void;
}
