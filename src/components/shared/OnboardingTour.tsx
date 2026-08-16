'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useOverlayDismiss } from '@/hooks/useOverlayDismiss';

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

// Mini neon illustrations, one per step, drawn in the app's own visual language.
function StepArt({ step }: { step: number }) {
  if (step === 0) {
    // A tiny keyword graph
    return (
      <svg viewBox="0 0 200 90" className="w-full h-[90px]">
        <line x1="60" y1="45" x2="112" y2="24" stroke="#ffffff" strokeOpacity="0.25" />
        <line x1="60" y1="45" x2="108" y2="66" stroke="#ffffff" strokeOpacity="0.25" />
        <line x1="112" y1="24" x2="158" y2="50" stroke="#bc13fe" strokeOpacity="0.5" strokeDasharray="3 4" />
        <circle cx="60" cy="45" r="11" fill="#00f3ff" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="45" r="16" fill="none" stroke="#00f3ff" strokeOpacity="0.3" />
        <circle cx="112" cy="24" r="7" fill="#bc13fe" opacity="0.85" />
        <circle cx="108" cy="66" r="7" fill="#8a8a9a" />
        <circle cx="158" cy="50" r="6" fill="#8a8a9a" />
      </svg>
    );
  }
  if (step === 1) {
    // Add-topic input + expanding node
    return (
      <svg viewBox="0 0 200 90" className="w-full h-[90px]">
        <rect x="18" y="60" rx="11" width="98" height="22" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.2)" />
        <text x="30" y="75" fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="monospace">Add topic…</text>
        <circle cx="105" cy="71" r="8" fill="rgba(0,243,255,0.15)" stroke="#00f3ff" strokeOpacity="0.6" />
        <text x="105" y="75" fontSize="11" fill="#00f3ff" textAnchor="middle">+</text>
        <circle cx="150" cy="32" r="9" fill="#bc13fe" opacity="0.9" />
        <circle cx="150" cy="32" r="13" fill="none" stroke="#bc13fe" strokeOpacity="0.7" strokeDasharray="2 2">
          <animateTransform attributeName="transform" type="rotate" from="0 150 32" to="360 150 32" dur="9s" repeatCount="indefinite" />
        </circle>
        <line x1="150" y1="32" x2="176" y2="52" stroke="#ffffff" strokeOpacity="0.2" />
        <circle cx="176" cy="52" r="5" fill="#8a8a9a">
          <animate attributeName="opacity" values="0;1;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  if (step === 2) {
    // Pan/zoom + green active ring
    return (
      <svg viewBox="0 0 200 90" className="w-full h-[90px]">
        <circle cx="66" cy="44" r="10" fill="#00f3ff" opacity="0.9" />
        <circle cx="66" cy="44" r="16" fill="none" stroke="#39ff14" strokeWidth="1.5" strokeOpacity="0.85">
          <animate attributeName="stroke-opacity" values="0.85;0.4;0.85" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="126" cy="30" r="6" fill="#8a8a9a" />
        <circle cx="140" cy="62" r="6" fill="#8a8a9a" />
        <line x1="66" y1="44" x2="126" y2="30" stroke="#ffffff" strokeOpacity="0.22" />
        <line x1="66" y1="44" x2="140" y2="62" stroke="#ffffff" strokeOpacity="0.22" />
        <g stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M172 22 v14 M165 29 h14" />
          <path d="M165 62 h14" />
        </g>
      </svg>
    );
  }
  // Article dots + detail card
  return (
    <svg viewBox="0 0 200 90" className="w-full h-[90px]">
      {[
        [30, 30, '#00f3ff'], [44, 52, '#ff3131'], [58, 24, '#8a8a9a'],
        [70, 44, '#00f3ff'], [88, 60, '#8a8a9a'], [96, 30, '#ff3131'],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="4" fill={c as string} opacity="0.85">
          <animate attributeName="cy" values={`${y};${(y as number) - 3};${y}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <rect x="122" y="16" rx="6" width="62" height="58" fill="rgba(8,8,16,0.95)" stroke="rgba(255,255,255,0.18)" />
      <rect x="130" y="26" rx="2" width="34" height="5" fill="rgba(255,255,255,0.5)" />
      <rect x="130" y="37" rx="2" width="46" height="3" fill="rgba(255,255,255,0.2)" />
      <rect x="130" y="44" rx="2" width="42" height="3" fill="rgba(255,255,255,0.2)" />
      <rect x="130" y="56" rx="3" width="46" height="9" fill="#00f3ff" opacity="0.85" />
    </svg>
  );
}

const STEPS = [
  {
    title: 'Welcome to Neural News',
    body: 'News, mapped as a living graph. Keywords grow, connect, and pull matching stories into your feed in real time.',
  },
  {
    title: 'Grow your graph',
    body: 'Add your own topics with the input in the graph panel. Purple dashed nodes hold related keywords — click to expand them, click again to collapse.',
  },
  {
    title: 'Explore the map',
    body: 'Drag the background to pan and scroll to zoom. Green rings mark the keywords currently driving your news feed.',
  },
  {
    title: 'Read the signal',
    body: 'Every dot is an article. Switch Cluster and Timeline views, tune the Filters sliders to re-weight what stands out, and click any dot or card to open the full story.',
  },
];

const CLOSE_ANIM_MS = 240;

export default function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = step === STEPS.length - 1;

  // Animate out, then unmount deterministically. We intentionally avoid
  // AnimatePresence here: its exit-complete callback proved unreliable in this
  // stack, leaving an invisible full-screen overlay that swallowed every click.
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

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        // Defer: calling setState on the parent from inside an updater is a
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? CLOSE_ANIM_MS / 1000 : 0.25 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{
        background: 'rgba(3,3,8,0.78)',
        backdropFilter: 'blur(6px)',
        pointerEvents: closing ? 'none' : 'auto',
      }}
    >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={closing ? { opacity: 0, y: 12, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
            transition={closing ? { duration: CLOSE_ANIM_MS / 1000 } : { type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-[380px] rounded-2xl border border-white/12 bg-[#0a0a14]/95 shadow-[0_0_60px_rgba(0,243,255,0.08)] overflow-hidden"
          >
            {/* Ambient glows */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-neon-blue/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-44 h-44 bg-neon-purple/10 blur-[80px] pointer-events-none" />

            {/* Skip — always one tap away */}
            <button
              onClick={requestClose}
              aria-label="Skip tour"
              className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider text-white/35 hover:text-white transition-colors"
            >
              Skip <X size={13} />
            </button>

            <div className="relative p-6 pt-8">
              {/* Step content re-enters on key change. Deliberately NOT a nested
                  AnimatePresence: a presence inside an exiting presence blocks
                  the parent's exit from completing, leaving an invisible
                  full-screen overlay that eats all clicks. */}
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] mb-5">
                    <StepArt step={step} />
                  </div>
                  <div className="text-[9px] font-mono text-neon-blue/70 uppercase tracking-[0.25em] mb-2">
                    Step {step + 1} / {STEPS.length}
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight mb-2">
                    {STEPS[step].title}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-white/55 min-h-[60px]">
                    {STEPS[step].body}
                  </p>
              </motion.div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-5">
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
                      className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors"
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
    </motion.div>
  );
}
