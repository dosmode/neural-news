import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { fetchGdeltNews } from '@/services/gdeltService';
import { mergeArchive } from '@/utils/archive';

// Global variable to persist across fast refreshes
let globalLastFetchTime = 0;
const FETCH_COOLDOWN_MS = 6000; // 6 seconds to be extremely safe with the news source
const AUTO_REFRESH_MS = 5 * 60_000; // background refresh cadence (visible tab only)

export function useGdeltFetch() {
  const keywords = useStore((state) => state.keywords);
  const activeKeywords = useStore((state) => state.activeKeywords);
  const hydrated = useStore((state) => state.hydrated);
  const setArticles = useStore((state) => state.setArticles);
  const setIsLoading = useStore((state) => state.setIsLoading);
  const setError = useStore((state) => state.setError);

  // Latest snapshot for the deferred (cooldown) fetch
  const latestRef = useRef({ keywords, activeKeywords, hydrated });
  latestRef.current = { keywords, activeKeywords, hydrated };

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const executeFetch = async () => {
      const snap = latestRef.current;
      const active = snap.keywords.filter((k) => snap.activeKeywords.has(k.id));

      if (!snap.hydrated || active.length === 0) {
        if (isMounted) {
          setArticles([]);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      globalLastFetchTime = Date.now();

      try {
        const result = await fetchGdeltNews(active);
        if (!isMounted) return;
        if (result.pending) {
          // Server was rate-locked with no cache for this query: retry shortly,
          // keeping the current articles and the loading state on screen.
          timer = setTimeout(executeFetch, (result.retryAfterMs ?? 1500) + 300);
          return;
        }
        setArticles(result.articles);
        // Bank this fetch into the local archive — it's what lets the time
        // machine reach further back the longer the app is used.
        mergeArchive(result.articles);
        setIsLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        }
      }
    };

    const scheduleFetch = () => {
      const now = Date.now();
      const timeSinceLastFetch = now - globalLastFetchTime;

      if (timeSinceLastFetch >= FETCH_COOLDOWN_MS) {
        executeFetch();
      } else {
        const waitTime = FETCH_COOLDOWN_MS - timeSinceLastFetch;
        setIsLoading(true);
        timer = setTimeout(executeFetch, waitTime);
      }
    };

    scheduleFetch();

    // Auto-refresh: keep the feed (and the time-machine archive) current
    // without a manual reload — every 5 minutes while the tab is visible,
    // plus immediately when the user returns to a stale tab.
    const refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') scheduleFetch();
    }, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - globalLastFetchTime >= AUTO_REFRESH_MS
      ) {
        scheduleFetch();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [keywords, activeKeywords, hydrated, setArticles, setIsLoading, setError]);
}
