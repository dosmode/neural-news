import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { calculateTimeline } from '@/utils/timeline';

export function useTimeline(width: number, height: number) {
  const articles = useStore((state) => state.articles);
  return useMemo(
    () => calculateTimeline(articles, width, height),
    [articles, width, height]
  );
}
