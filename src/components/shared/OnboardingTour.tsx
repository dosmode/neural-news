'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useOverlayDismiss } from '@/hooks/useOverlayDismiss';

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

const CLOSE_ANIM_MS = 240;
const CARD_W = 300;
const CARD_H_EST = 200;
const PAD = 12;

interface Step {
  title: string;
  body: string;
  /** CSS selectors tried in order — first visible match gets the spotlight.
      Later entries are mobile fallbacks (e.g. the bottom tab button). */
  targets: string[];
}

const STEPS: Step[] = [
  {
    title: 'Your keyword graph',
    body: 'News mapped as a living graph. Bigger, brighter nodes = more coverage right now; green rings drive your feed; ▲ marks a topic that just surged.',
    targets: ['[data-tour="graph"]'],
  },
  {
    title: 'Grow it yourself',
    body: 'Type any topic here — Korean works too. Purple dashed nodes hide related keywords: click to expand, click again to collapse.',
    targets: ['[data-tour="add-topic"]'],
  },
  {
    title: 'Graph controls',
    body: 'Scroll to zoom and drag to pan. ⊙ recenters the view, ⛶ goes fullscreen, and ✦ keeps a history of every keyword the app suggested — re-add any of them.',
    targets: ['[data-tour="controls"]'],
  },
  {
    title: 'Read the map',
    body: 'Every dot is an article, sized by the filter weights. Switch Cluster/Timeline, group by Sentiment/Topic, and open Filters to re-weight the map live.',
    targets: ['[data-tour="map-controls"]', 'button[aria-label="Map tab"]'],
  },
  {
    title: 'The time machine',
    body: 'Drag this timeline to rewind the whole app — graph, map, and feed — to any moment. The range grows as the app banks articles; the right end is LIVE.',
    targets: ['[data-tour="time-rail"]', 'button[aria-label="Map tab"]'],
  },
  {
    title: 'The feed',
    body: 'All matching articles, newest first. Click any card — or any dot on the map — to open the full story.',
    targets: ['[data-tour="feed"]', 'button[aria-label="Feed tab"]'],
  },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function findRect(targets: string[]): Rect | null {
  for (const sel of targets) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0) {
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }
  }
  return null;
}

export default function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = step === STEPS.length - 1;

  // Animate out, then unmount deterministically (AnimatePresence exit proved
  // unreliable in this stack — it left an invisible click-blocking overlay).
  const requestClose = useCallback(() => {
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_ANIM_MS);
  }, [onClose]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useOverlayDismiss(open && !closing, requestClose);

  // Restart from the first step each time the tour opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setClosing(false);
    }
  }, [open]);

  // Track the current step's target element. Beyond step changes and resizes,
  // keep re-measuring on a slow interval while open: layout/FLIP animations
  // can still be settling when the tour appears, and a rect captured
  // mid-animation would strand the ring in the wrong place.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const next = findRect(STEPS[step].targets);
      setRect((prev) => {
        if (
          prev === next ||
          (prev &&
            next &&
            Math.abs(prev.x - next.x) < 1 &&
            Math.abs(prev.y - next.y) < 1 &&
            Math.abs(prev.w - next.w) < 1 &&
            Math.abs(prev.h - next.h) < 1)
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const iv = setInterval(measure, 500);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearInterval(iv);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        // Defer: setState on the parent from inside an updater is a
        // render-phase side effect React forbids.
        queueMicrotask(requestClose);
        return s;
      }
      return s + 1;
    });
  }, [requestClose]);

  useEffect(() => {
    if (!open || closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closing, next]);

  if (!open) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardW = Math.min(CARD_W, vw - 2 * PAD);

  // Card placement: below the target when there's room, else above; centered
  // on the target horizontally, clamped to the viewport.
  let cardLeft = (vw - cardW) / 2;
  let cardTop = (vh - CARD_H_EST) / 2;
  if (rect) {
    cardLeft = Math.min(Math.max(rect.x + rect.w / 2 - cardW / 2, PAD), vw - cardW - PAD);
    const below = rect.y + rect.h + PAD;
    cardTop =
      below + CARD_H_EST <= vh - PAD
        ? below
        : Math.max(PAD, rect.y - PAD - CARD_H_EST);
  }

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: 'none' }}>
      {/* Input blocker: the app underneath stays inert while the tour runs */}
      <div
        style={{ pointerEvents: closing ? 'none' : 'auto' }}
        className="absolute inset-0"
        onPointerDown={(e) => e.preventDefault()}
      />

      {/* Spotlight: a ring around the real element; the giant box-shadow dims
          everything else, punching a visual hole at the target */}
      {rect ? (
        <motion.div
          initial={false}
          animate={{
            left: rect.x - 6,
            top: rect.y - 6,
            width: rect.w + 12,
            height: rect.h + 12,
            opacity: closing ? 0 : 1,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="absolute rounded-xl border border-neon-blue/70 pointer-events-none"
          style={{ boxShadow: '0 0 0 9999px rgba(3,3,8,0.78), 0 0 24px rgba(0,243,255,0.25)' }}
        />
      ) : (
        <motion.div
          initial={false}
          animate={{ opacity: closing ? 0 : 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(3,3,8,0.78)' }}
        />
      )}

      {/* Step card, gliding next to the highlighted element */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: closing ? 0 : 1, y: closing ? 6 : 0, left: cardLeft, top: cardTop }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute rounded-2xl border border-white/12 bg-[#0a0a14]/95 shadow-[0_0_60px_rgba(0,243,255,0.08)] overflow-hidden"
        style={{ width: cardW, pointerEvents: closing ? 'none' : 'auto' }}
      >
        <button
          onClick={requestClose}
          aria-label="Skip tour"
          className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider text-white/35 hover:text-white transition-colors"
        >
          Skip <X size={13} />
        </button>

        <div className="p-5 pt-6">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="text-[9px] font-mono text-neon-blue/70 uppercase tracking-[0.25em] mb-1.5">
              Step {step + 1} / {STEPS.length}
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mb-1.5">
              {STEPS[step].title}
            </h2>
            <p className="text-[12.5px] leading-relaxed text-white/55 min-h-[54px]">
              {STEPS[step].body}
            </p>
          </motion.div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-5 bg-neon-blue' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-2.5 py-2 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-2 rounded-lg bg-neon-blue text-black text-[11px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
              >
                {last ? 'Start exploring' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
