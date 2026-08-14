'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';

const FILTERS: { id: string; label: string; hint: string }[] = [
  { id: 'sentiment', label: 'Sentiment', hint: 'field & emotional emphasis' },
  { id: 'recency', label: 'Recency', hint: 'newer articles pop' },
  { id: 'relevance', label: 'Relevance', hint: 'keyword matches pop' },
];

/**
 * The spec-012 filter weight sliders, restored as a compact popover: each
 * slider immediately re-weights dot size/brightness (computeEmphasisMap) and
 * — for Sentiment — the classification field intensity.
 */
export default function FilterPanel() {
  const [open, setOpen] = useState(false);
  const filterWeights = useStore((s) => s.filterWeights);
  const setFilterWeight = useStore((s) => s.setFilterWeight);

  const isNeutral = FILTERS.every((f) => (filterWeights[f.id] ?? 0.5) === 0.5);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
          open || !isNeutral
            ? 'border-neon-blue/50 text-neon-blue'
            : 'border-white/15 text-white/30 hover:text-white/50'
        }`}
      >
        <SlidersHorizontal size={11} />
        Filters
        {!isNeutral && <span className="w-1.5 h-1.5 rounded-full bg-neon-blue" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-9 z-40 w-[230px] rounded-xl bg-black/85 border border-white/12 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em]">
                Filter Weights
              </span>
              <button
                onClick={() => FILTERS.forEach((f) => setFilterWeight(f.id, 0.5))}
                aria-label="Reset filters"
                title="Reset to neutral"
                className={`flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider transition-colors ${
                  isNeutral ? 'text-white/15 pointer-events-none' : 'text-white/40 hover:text-neon-blue'
                }`}
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {FILTERS.map((f) => {
                const w = filterWeights[f.id] ?? 0.5;
                return (
                  <div key={f.id}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                        {f.label}
                      </span>
                      <span className={`text-[9px] font-mono tabular-nums ${w === 0.5 ? 'text-white/25' : 'text-neon-blue'}`}>
                        {Math.round(w * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(w * 100)}
                      onChange={(e) => setFilterWeight(f.id, Number(e.target.value) / 100)}
                      aria-label={`${f.label} weight`}
                      className="w-full h-5 cursor-pointer accent-[#00f3ff]"
                    />
                    <div className="text-[8px] font-mono text-white/25 mt-0.5">{f.hint}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
