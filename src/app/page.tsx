'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';

import ForceGraphPanel from '@/components/neural/ForceGraphPanel';
import ArticleScatter from '@/components/output/ArticleScatter';
import ArticleStrip from '@/components/output/ArticleStrip';
import ArticleDetailPanel from '@/components/shared/ArticleDetailPanel';
import OnboardingTour from '@/components/shared/OnboardingTour';
import MobileTabBar, { MobileTab } from '@/components/shared/MobileTabBar';
import { useGdeltFetch } from '@/hooks/useGdeltFetch';
import { useKeywordInit } from '@/hooks/useKeywordInit';

const TOUR_DONE_KEY = 'neural-news:tour-done';

function StatusIndicator() {
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);

  const { label, color } = error
    ? { label: 'ERROR', color: 'text-neon-red' }
    : isLoading
    ? { label: 'FETCHING', color: 'text-neon-blue animate-pulse' }
    : { label: 'SYNCED', color: 'text-neon-green' };

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${color}`} />
      <span className={color}>{label}</span>
    </span>
  );
}

export default function Home() {
  useKeywordInit();
  useGdeltFetch();

  // Mobile shows one surface at a time via the bottom tab bar; desktop shows
  // all three side by side (the tab state is simply ignored at lg and up).
  const [mobileTab, setMobileTab] = useState<MobileTab>('graph');

  // First-visit onboarding: auto-open once, re-openable from the header "?".
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(TOUR_DONE_KEY)) {
        const t = setTimeout(() => {
          // Re-check: the user may have opened and dismissed the tour (via the
          // "?" button) before this delayed auto-open fires.
          try {
            if (!window.localStorage.getItem(TOUR_DONE_KEY)) setTourOpen(true);
          } catch {
            /* ignore */
          }
        }, 900);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage unavailable → skip auto-open */
    }
  }, []);
  const closeTour = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    setTourOpen(false);
  }, []);

  return (
    <main className="flex flex-col bg-[#050508] text-white h-dvh overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,243,255,0.04),transparent_55%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_80%_80%,rgba(188,19,254,0.03),transparent_55%)]" />

      {/* Header */}
      <header className="z-30 h-[72px] w-full px-4 lg:px-6 flex items-center justify-between border-b border-white/[0.06] bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_10px_rgba(0,243,255,0.9)]" />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            NEURAL <span className="text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">NEWS</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 lg:gap-5 text-[11px] font-mono text-white/40">
          <StatusIndicator />
          <span className="hidden sm:inline text-white/25">SOURCE: GOOGLE NEWS RSS</span>
          <span className="hidden sm:inline text-white/25">MVP v1.0.0</span>
          <button
            onClick={() => setTourOpen(true)}
            aria-label="Show onboarding tour"
            title="How it works"
            className="w-7 h-7 rounded-full border border-white/15 text-white/40 hover:text-neon-blue hover:border-neon-blue/50 transition-colors flex items-center justify-center text-[12px]"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main: one tab-selected surface at a time on mobile (full height),
          left neural panel + right output side by side on desktop.
          NOTE: no z-index here — as a flex item it would create a stacking
          context that traps the graph panel's fullscreen mode (fixed z-50)
          BELOW the z-30 header, making the exit/zoom controls unclickable. */}
      <div
        className="flex flex-col lg:flex-row flex-1 min-h-0 lg:overflow-hidden pb-[calc(3.25rem+env(safe-area-inset-bottom))] lg:pb-0"
      >
        <ForceGraphPanel
          className={`${mobileTab === 'graph' ? 'block' : 'hidden'} lg:block w-full flex-1 min-h-0 border-white/[0.05] lg:flex-none lg:w-[360px] lg:h-auto lg:border-r`}
        />

        <div
          className={`${mobileTab === 'graph' ? 'hidden' : 'flex'} lg:flex flex-col w-full flex-1 min-h-0 lg:min-w-0`}
        >
          <div
            className={`relative w-full ${
              mobileTab === 'map' ? 'flex-1 min-h-0' : 'hidden'
            } lg:block lg:flex-1 lg:h-auto lg:min-h-0`}
          >
            <ArticleScatter />
          </div>
          <ArticleStrip
            mobileVertical={mobileTab === 'feed'}
            className={`${
              mobileTab === 'feed' ? 'flex flex-1 min-h-0' : 'hidden'
            } lg:flex lg:flex-none lg:h-[180px]`}
          />
        </div>
      </div>

      <MobileTabBar tab={mobileTab} onChange={setMobileTab} />
      <ArticleDetailPanel />
      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </main>
  );
}
