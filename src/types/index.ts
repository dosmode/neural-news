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

export interface AppState {
  activeKeywords: Set<string>;
  filterWeights: Record<string, number>;
  articles: Article[];
  selectedArticleId: string | null;
  currentGradient: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  toggleKeyword: (id: string) => void;
  setFilterWeight: (id: string, weight: number) => void;
  setSelectedArticle: (id: string | null) => void;
  setArticles: (articles: Article[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}
