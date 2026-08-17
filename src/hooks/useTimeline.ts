import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { calculateTimeline, filterArticlesAsOf } from '@/utils/timeline';

export function useTimeline(width: number, height: number) {
  const articles = useStore((state) => state.articles);
  const activeKeywords = useStore((state) => state.activeKeywords);
  const timeMachineAt = useStore((state) => state.timeMachineAt);
  return useMemo(() => {
    // Same visibility rule as the cluster view (calculateClustering): only
    // articles relevant to an active keyword. Otherwise switching views
    // silently changes which articles are shown. The time machine window
    // applies on top.
    const visible = filterArticlesAsOf(articles, timeMachineAt).filter((a) =>
      Object.keys(a.relevanceMap).some((kw) => activeKeywords.has(kw))
    );
    return calculateTimeline(visible, width, height);
  }, [articles, activeKeywords, timeMachineAt, width, height]);
}
