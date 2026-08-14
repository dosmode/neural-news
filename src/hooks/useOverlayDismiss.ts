import { useEffect, useRef } from 'react';

/**
 * Close an open overlay (detail panel, fullscreen graph, tour) with the
 * Escape key.
 *
 * Deliberately NOT integrated with browser history: pushing/popping history
 * entries from effect cleanups interacts unpredictably with the Next.js
 * app-router's patched history and async popstate handling. If back-gesture
 * dismissal is added later, it should be a single app-level history manager,
 * not a per-overlay hook.
 */
export function useOverlayDismiss(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}
