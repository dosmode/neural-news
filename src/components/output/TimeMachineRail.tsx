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

/**
 * Always-visible drag rail along the bottom of the map: grab the handle and
 * drag left to rewind the whole app (graph sizes, map, feed) to that moment;
 * drag to the right end — or tap LIVE — to return to now. The range spans the
 * current feed plus the local article archive, so it widens with use.
 * While traveling, the moment's hottest keywords are ranked live above the
 * rail — the "what mattered then" readout.
 */
export default function TimeMachineRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const articles = useStore((s) => s.articles);
  const keywords = useStore((s) => s.keywords);
  const timeMachineAt = useStore((s) => s.timeMachineAt);
  const setTimeMachineAt = useStore((s) => s.setTimeMachineAt);

  const pool = useMemo(() => archiveUnion(articles), [articles]);
  const range = useMemo(() => computeTimeRange(pool), [pool]);

  const traveling = timeMachineAt !== null;

  // The selected moment's hottest keywords (live-updating while scrubbing).
  const topIssues = useMemo(() => {
    if (!traveling || timeMachineAt === null) return [];
    const windowed = filterArticlesAsOf(
      timeTravelPool(articles, timeMachineAt, keywords),
      timeMachineAt
    );
    const scores = computeImportance(windowed, keywords, {
      at: timeMachineAt,
      windowMs: TIME_MACHINE_WINDOW_MS,
    });
    return keywords
      .map((k) => ({ ...k, count: scores.get(k.id)?.count ?? 0 }))
      .filter((k) => k.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [traveling, timeMachineAt, articles, keywords]);

  const applyFromClientX = useCallback(
    (clientX: number) => {
      const el = railRef.current;
      if (!el || !range) return;
      const r = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      setTimeMachineAt(frac >= 0.995 ? null : Math.round(range.min + frac * (range.max - range.min)));
    },
    [range, setTimeMachineAt]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      applyFromClientX(e.clientX);
      const move = (ev: PointerEvent) => applyFromClientX(ev.clientX);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [applyFromClientX]
  );

  if (!range) return null;

  const frac = traveling
    ? Math.min(1, Math.max(0, ((timeMachineAt as number) - range.min) / (range.max - range.min)))
    : 1;

  return (
    <div data-tour="time-rail" className="absolute bottom-0 left-0 right-0 z-20">
      {/* "What mattered then" — the moment's top keywords, re-ranked live */}
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
          onPointerDown={onPointerDown}
          className="relative flex-1 h-5 cursor-ew-resize touch-none group"
          title="Drag to rewind · right end = live"
        >
          {/* track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/10" />
          {/* elapsed fill */}
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full ${
              traveling ? 'bg-[#ffb85c]/60' : 'bg-neon-green/40'
            }`}
            style={{ width: `${frac * 100}%` }}
          />
          {/* handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
              traveling
                ? 'bg-[#ffb85c] border-[#ffb85c] shadow-[0_0_10px_rgba(255,184,92,0.8)]'
                : 'bg-neon-green border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.6)]'
            }`}
            style={{ left: `${frac * 100}%` }}
          />
        </div>
        <button
          onClick={() => setTimeMachineAt(null)}
          className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
            traveling
              ? 'border-[#ffb85c]/60 text-[#ffb85c] hover:bg-[#ffb85c]/10'
              : 'border-neon-green/40 text-neon-green pointer-events-none'
          }`}
        >
          {traveling ? formatShortTime(timeMachineAt as number) + ' ↺' : '● Live'}
        </button>
      </div>
    </div>
  );
}
