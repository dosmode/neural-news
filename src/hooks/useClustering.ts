import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { calculateClustering, Cluster } from '@/utils/clustering';
import { filterArticlesAsOf } from '@/utils/timeline';
import { timeTravelPool } from '@/utils/archive';
import { MappedPoint } from '@/types';

export function useClustering(width: number, height: number) {
  const allArticles = useStore((state) => state.articles);
  const activeKeywords = useStore((state) => state.activeKeywords);
  const filterWeights = useStore((state) => state.filterWeights);
  const clusterMode = useStore((state) => state.clusterMode);
  const keywords = useStore((state) => state.keywords);
  const timeMachineAt = useStore((state) => state.timeMachineAt);
  const timeMachineWindowMs = useStore((state) => state.timeMachineWindowMs);

  // Time machine: only articles from the selected moment's window exist —
  // drawn from the feed + the local archive so older moments have data.
  const articles = useMemo(
    () => filterArticlesAsOf(timeTravelPool(allArticles, timeMachineAt, keywords), timeMachineAt, timeMachineWindowMs),
    [allArticles, timeMachineAt, timeMachineWindowMs, keywords]
  );

  const [points, setPoints] = useState<MappedPoint[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  useEffect(() => {
    if (width > 0 && height > 0 && articles.length > 0) {
      const result = calculateClustering(
        articles,
        activeKeywords,
        filterWeights,
        width,
        height,
        clusterMode,
        keywords
      );
      setPoints(result.points);
      setClusters(result.clusters);
    } else if (articles.length === 0) {
      setPoints([]);
      setClusters([]);
    }
  }, [articles, activeKeywords, filterWeights, width, height, clusterMode, keywords]);

  return { points, clusters };
}
