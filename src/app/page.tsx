'use client';

import React from 'react';
import { useStore } from '@/store/useStore';

import ForceGraphPanel from '@/components/neural/ForceGraphPanel';
import ArticleScatter from '@/components/output/ArticleScatter';
import ArticleStrip from '@/components/output/ArticleStrip';
import ArticleDetailPanel from '@/components/shared/ArticleDetailPanel';
import { useGdeltFetch } from '@/hooks/useGdeltFetch';
import { useKeywordInit } from '@/hooks/useKeywordInit';

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

  return (
    <main className="flex flex-col bg-[#050508] text-white min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden">
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
        </div>
      </header>

      {/* Main: stacked on mobile, left neural panel + right output on desktop */}
      <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden z-10">
        <ForceGraphPanel className="w-full h-[300px] shrink-0 border-b border-white/[0.05] lg:w-[360px] lg:h-auto lg:border-b-0 lg:border-r" />

        <div className="flex flex-col w-full lg:flex-1 lg:min-h-0 lg:min-w-0">
          <div className="relative w-full h-[55vh] min-h-[360px] lg:flex-1 lg:h-auto lg:min-h-0">
            <ArticleScatter />
          </div>
          <ArticleStrip className="shrink-0 h-[180px]" />
        </div>
      </div>

      <ArticleDetailPanel />
    </main>
  );
}
