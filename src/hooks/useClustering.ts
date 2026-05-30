import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { calculateClustering, calculateGradient } from '@/utils/clustering';
import { MappedPoint } from '@/types';

export function useClustering(width: number, height: number) {
  const articles = useStore((state) => state.articles);
  const activeKeywords = useStore((state) => state.activeKeywords);
  const filterWeights = useStore((state) => state.filterWeights);
  
  const [points, setPoints] = useState<MappedPoint[]>([]);

  useEffect(() => {
    if (width > 0 && height > 0 && articles.length > 0) {
      const newPoints = calculateClustering(
        articles,
        activeKeywords,
        filterWeights,
        width,
        height
      );
      setPoints(newPoints);
    }
  }, [articles, activeKeywords, filterWeights, width, height]);

  const gradient = useMemo(() => 
    calculateGradient(articles, filterWeights), 
    [articles, filterWeights]
  );

  return { points, gradient };
}
