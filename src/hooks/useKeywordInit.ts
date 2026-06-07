import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { getTrendingKeywords } from '@/services/trendingService';

const STORAGE_KEY = 'neural-news:keywords';

/**
 * One-time keyword hydration: restore the saved set from localStorage, or seed
 * ~5 dynamic trending topics on a first visit (or empty saved set). After
 * hydration, persists the keyword set on every change.
 */
export function useKeywordInit() {
  const setKeywords = useStore((s) => s.setKeywords);
  const keywords = useStore((s) => s.keywords);
  const activeKeywords = useStore((s) => s.activeKeywords);
  const hydrated = useStore((s) => s.hydrated);

  // Hydrate once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.keywords?.length) {
        const activeIds: string[] = saved.activeIds ?? saved.keywords.map((k: any) => k.id);
        setKeywords(saved.keywords, activeIds);
        return;
      }
    } catch {
      /* ignore corrupt storage and fall through to seeding */
    }

    // First visit or empty saved set → seed trending defaults
    getTrendingKeywords(5).then((top) => {
      if (!cancelled) setKeywords(top, top.map((k) => k.id));
    });

    return () => { cancelled = true; };
  }, [setKeywords]);

  // Persist after hydration whenever the set changes
  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ keywords, activeIds: Array.from(activeKeywords) })
      );
    } catch {
      /* ignore quota / serialization errors */
    }
  }, [keywords, activeKeywords, hydrated]);
}
