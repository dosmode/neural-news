import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { fetchGdeltNews } from '@/services/gdeltService';

// Global variable to persist across fast refreshes
let globalLastFetchTime = 0;
const FETCH_COOLDOWN_MS = 6000; // 6 seconds to be extremely safe with GDELT

export function useGdeltFetch() {
  const activeKeywords = useStore((state) => state.activeKeywords);
  const setArticles = useStore((state) => state.setArticles);
  const setIsLoading = useStore((state) => state.setIsLoading);
  const setError = useStore((state) => state.setError);
  
  // Keep track of the latest keywords we actually want to fetch
  const latestKeywordsRef = useRef(activeKeywords);
  latestKeywordsRef.current = activeKeywords;

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const executeFetch = async () => {
      const currentKeywords = latestKeywordsRef.current;
      
      if (currentKeywords.size === 0) {
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
        const articles = await fetchGdeltNews(currentKeywords);
        if (isMounted) {
          setArticles(articles);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const scheduleFetch = () => {
      const now = Date.now();
      const timeSinceLastFetch = now - globalLastFetchTime;

      if (timeSinceLastFetch >= FETCH_COOLDOWN_MS) {
        // Safe to fetch immediately
        executeFetch();
      } else {
        // Need to wait until cooldown expires
        const waitTime = FETCH_COOLDOWN_MS - timeSinceLastFetch;
        setIsLoading(true); // Show loading while waiting in queue
        timer = setTimeout(() => {
          executeFetch();
        }, waitTime);
      }
    };

    scheduleFetch();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [activeKeywords, setArticles, setIsLoading, setError]);
}
