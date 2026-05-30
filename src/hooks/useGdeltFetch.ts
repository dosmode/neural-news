import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { fetchGdeltNews } from '@/services/gdeltService';

export function useGdeltFetch() {
  const activeKeywords = useStore((state) => state.activeKeywords);
  const setArticles = useStore((state) => state.setArticles);
  const setIsLoading = useStore((state) => state.setIsLoading);
  const setError = useStore((state) => state.setError);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (activeKeywords.size === 0) {
        setArticles([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const articles = await fetchGdeltNews(activeKeywords);
        if (isMounted) {
          setArticles(articles);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch data');
          // In case of error, we can either clear articles or leave existing ones. Let's leave existing.
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Debounce to 5500ms to respect GDELT's strict 1 request per 5 seconds limit
    const timer = setTimeout(() => {
      fetchData();
    }, 5500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeKeywords, setArticles, setIsLoading, setError]);
}
