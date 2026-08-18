'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  computeTimeRange,
  formatShortTime,
  filterArticlesAsOf,
  TIME_MACHINE_WINDOW_MS,
} from '@/utils/timeline';
import { archiveUnion, timeTravelPool } from '@/utils/archive';
import { computeImportance } from '@/utils/importance';

const MIN_WINDOW_MS = 60 * 60_000; // the selected range can't shrink below 1h

/**
 * Always-visible range scrubber along the bottom of the map. Two handles set
 * the window's MIN and MAX; the band between them drags as a whole to slide
 * the window through time. Everything (graph sizes, map, feed) follows the
 * selected range. Dragging the band to the far right — or tapping LIVE —
 * returns to now. The rail spans the feed + the local archive.
 */
export default function TimeMachineRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const articles = useStore((s) => s.articles);
  const keywords = useStore((s) => s.keywords);
  const timeMachineAt = useStore((s) => s.timeMachineAt);
  const windowMs = useStore((s) => s.timeMachineWindowMs);
  const setTimeMachineAt = useStore((s) => s.setTimeMachineAt);

  const pool = useMemo(() => archiveUnion(articles), [articles]);
  const range = useMemo(() => computeTimeRange(pool), [pool]);

  const traveling = timeMachineAt !== null;

  // The selected window's hottest keywords (live-updating while scrubbing).
  const topIssues = useMemo(() => {
    if (!traveling || timeMachineAt === null) return [];
    const windowed = filterArticlesAsOf(
      timeTravelPool(articles, timeMachineAt, keywords),
      timeMachineAt,
      windowMs
    );
    const scores = computeImportance(windowed, keywords, { at: timeMachineAt, windowMs });
    return keywords
      .map((k) => ({ ...k, count: scores.get(k.id)?.count ?? 0 }))
      .filter((k) => k.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [traveling, timeMachineAt, windowMs, articles, keywords]);

  const timeAtClientX = useCallback(
    (clientX: number) => {
      const el = railRef.current;
      if (!el || !range) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8) return null; // hidden/collapsed rail → never divide by ~0
      const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const t = range.min + frac * (range.max - range.min);
      return Number.isFinite(t) ? t : null;
    },
    [range]
  );

  // Drag one of: 'start' (left handle), 'end' (right handle), 'band' (slide).
  const beginDrag = useCallback(
    (mode: 'start' | 'end' | 'band') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!range) return;
      const initEnd = timeMachineAt ?? range.max;
      const initWindow = traveling ? windowMs : TIME_MACHINE_WINDOW_MS;
      const grabT = timeAtClientX(e.clientX) ?? initEnd;
      // Band drags keep the grip point — except when engaging FROM live,
      // where the pointer position becomes the window's end (otherwise the
      // grip anchors end at max and the drag can never leave live).
      const grabOffset = traveling ? initEnd - grabT : 0;

      const apply = (clientX: number) => {
        const t = timeAtClientX(clientX);
        if (t === null) return;
        if (mode === 'end') {
          const start = initEnd - initWindow;
          const end = Math.min(range.max, Math.max(start + MIN_WINDOW_MS, t));
          setTimeMachineAt(end, end - start);
        } else if (mode === 'start') {
          const end = initEnd;
          const start = Math.min(end - MIN_WINDOW_MS, Math.max(range.min - initWindow, t));
          setTimeMachineAt(end, end - start);
        } else {
          // band: slide the whole window; hitting the right edge = back to live
          const end = t + grabOffset;
          if (end >= range.max - (range.max - range.min) * 0.005) {
            setTimeMachineAt(null);
          } else {
            setTimeMachineAt(Math.max(range.min + MIN_WINDOW_MS, Math.min(range.max, end)), initWindow);
          }
        }
      };

      apply(e.clientX);
      const move = (ev: PointerEvent) => apply(ev.clientX);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [range, traveling, timeMachineAt, windowMs, timeAtClientX, setTimeMachineAt]
  );

  if (!range) return null;

  const span = range.max - range.min;
  const end = traveling ? (timeMachineAt as number) : range.max;
  const start = end - (traveling ? windowMs : TIME_MACHINE_WINDOW_MS);
  const endFrac = Math.min(1, Math.max(0, (end - range.min) / span));
  const startFrac = Math.min(endFrac, Math.max(0, (start - range.min) / span));

  return (
    <div data-tour="time-rail" className="absolute bottom-0 left-0 right-0 z-20">
      {/* "What mattered then" — the window's top keywords, re-ranked live */}
      <AnimatePresence>
        {traveling && topIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center gap-1.5 pb-1.5 px-3 flex-wrap pointer-events-none"
          >
            <span className="text-[8px] font-mono text-[#ffb85c]/70 uppercase tracking-widest mr-1">
              Top then
            </span>
            {topIssues.map((k, i) => (
              <motion.span
                key={k.id}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md ${
                  i === 0
                    ? 'border-[#ffb85c]/60 text-[#ffb85c] bg-[#ffb85c]/10'
                    : 'border-white/15 text-white/55 bg-black/50'
                }`}
              >
                {k.label} <span className="opacity-60">{k.count}</span>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The rail itself */}
      <div
        className="flex items-center gap-2 px-3 pb-1.5 pt-1 bg-gradient-to-t from-black/70 to-transparent"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <History size={11} className={traveling ? 'text-[#ffb85c]' : 'text-white/25'} />
        <span className="hidden sm:block text-[8px] font-mono text-white/25 whitespace-nowrap">
          {formatShortTime(range.min)}
        </span>
        <div
          ref={railRef}
          onPointerDown={beginDrag('band')}
          className="relative flex-1 h-6 cursor-ew-resize touch-none group"
          title="Drag handles to set the range · drag the band to slide it · right end = live"
        >
          {/* track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/10" />

          {traveling ? (
            <>
              {/* selected window band (drag to slide) */}
              <div
                onPointerDown={beginDrag('band')}
                className="absolute top-1/2 -translate-y-1/2 h-[7px] rounded-full bg-[#ffb85c]/35 border border-[#ffb85c]/50 cursor-grab active:cursor-grabbing"
                style={{ left: `${startFrac * 100}%`, width: `${Math.max(0.5, (endFrac - startFrac) * 100)}%` }}
              />
              {/* MIN handle */}
              <div
                onPointerDown={beginDrag('start')}
                aria-label="Range start handle"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ffb85c] border-2 border-[#0a0a14] shadow-[0_0_8px_rgba(255,184,92,0.8)] cursor-ew-resize hover:scale-125 transition-transform"
                style={{ left: `${startFrac * 100}%` }}
              />
              {/* MAX handle */}
              <div
                onPointerDown={beginDrag('end')}
                aria-label="Range end handle"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ffb85c] border-2 border-[#0a0a14] shadow-[0_0_8px_rgba(255,184,92,0.8)] cursor-ew-resize hover:scale-125 transition-transform"
                style={{ left: `${endFrac * 100}%` }}
              />
            </>
          ) : (
            /* live: single handle resting at now */
            <div
              aria-label="Live handle"
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-neon-green border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.6)] group-hover:scale-125 transition-transform"
              style={{ left: '100%' }}
            />
          )}
        </div>
        <button
          onClick={() => setTimeMachineAt(null)}
          className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
            traveling
              ? 'border-[#ffb85c]/60 text-[#ffb85c] hover:bg-[#ffb85c]/10'
              : 'border-neon-green/40 text-neon-green pointer-events-none'
          }`}
        >
          {traveling ? (
            <>
              <span className="hidden sm:inline">{formatShortTime(start)} → </span>
              {formatShortTime(end)} ↺
            </>
          ) : (
            '● Live'
          )}
        </button>
      </div>
    </div>
  );
}
