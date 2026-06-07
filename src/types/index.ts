export interface KeywordNodeData {
  id: string;
  label: string;
  isActive: boolean;
  type: 'input';
}

export interface FilterNodeData {
  id: string;
  label: string;
  type: 'hidden';
  weight: number; // 0.0 to 1.0
}

export interface ConnectionData {
  source: string;
  target: string;
  weight: number;
}

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
  socialimage?: string;
}

export interface MappedPoint extends Article {
  x: number;
  y: number;
}

export interface DynamicFilterNode {
  id: string;
  label: string;
  layer: 1 | 2;
}

export interface KeywordDef {
  id: string;
  label: string;
}

export type ClusterMode = 'sentiment' | 'topic';

export type ViewMode = 'cluster' | 'timeline';

export interface AppState {
  keywords: KeywordDef[];
  activeKeywords: Set<string>;
  filterWeights: Record<string, number>;
  dynamicFilterNodes: DynamicFilterNode[];
  articles: Article[];
  selectedArticleId: string | null;
  isLoading: boolean;
  error: string | null;
  showClassificationField: boolean;
  hydrated: boolean;
  clusterMode: ClusterMode;
  viewMode: ViewMode;

  // Actions
  toggleKeyword: (id: string) => void;
  setClusterMode: (mode: ClusterMode) => void;
  setViewMode: (mode: ViewMode) => void;
  addKeyword: (label: string) => { ok: boolean; error?: string };
  removeKeyword: (id: string) => void;
  setKeywords: (keywords: KeywordDef[], activeIds: string[]) => void;
  setFilterWeight: (id: string, weight: number) => void;
  setSelectedArticle: (id: string | null) => void;
  setArticles: (articles: Article[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleClassificationField: () => void;
}
