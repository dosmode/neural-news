'use client';

import React from 'react';
import { useStore } from '@/store/useStore';

import NetworkGraph from '@/components/graph/NetworkGraph';
import CurationMap from '@/components/map/CurationMap';
import ArticleModal from '@/components/shared/ArticleModal';
import { useClustering } from '@/hooks/useClustering';
import { useGdeltFetch } from '@/hooks/useGdeltFetch';

export default function Home() {
  const { gradient } = useClustering(0, 0); 
  const { isLoading, error } = useStore();

  // Initiate fetching logic
  useGdeltFetch();

  return (
    <main className="flex h-screen flex-col bg-black text-white overflow-hidden">
      {/* Dynamic Background Gradient */}
      <div className={`fixed inset-0 bg-gradient-to-br ${gradient} opacity-30 pointer-events-none transition-all duration-1000`} />

      {/* Header */}
      <header className="z-20 w-full p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-neon-blue blur-[2px] animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tighter text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
            NEURAL NEWS
          </h1>
        </div>
        <div className="flex gap-6 text-sm font-mono text-white/50">
          <span>MVP v1.0.0</span>
          <span className="text-neon-green">SYSTEM ACTIVE</span>
        </div>
      </header>

      {/* Visualization Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">
        
        {/* Left: Input & Hidden Layers (Network Graph) */}
        <section className="flex-1 border-r border-white/5 relative">
          <div className="absolute top-4 left-6 z-20 pointer-events-none">
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Input & Hidden Layers</h2>
          </div>
          <div id="network-graph-container" className="w-full h-full">
            <NetworkGraph />
          </div>
        </section>

        {/* Right: Output Layer (Curation Map) */}
        <section className="flex-1 relative">
          <div className="absolute top-4 left-6 z-20 pointer-events-none">
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Output Layer: Curation Map</h2>
          </div>
          <div id="curation-map-container" className="w-full h-full">
            <CurationMap />
          </div>
        </section>
      </div>

      {/* Footer / Status Bar */}
      <footer className="z-20 w-full p-3 bg-black/80 border-t border-white/5 text-[10px] font-mono flex justify-between items-center shrink-0">
        <div className="flex gap-4">
          <span className={error ? 'text-neon-red font-bold' : isLoading ? 'text-neon-blue animate-pulse' : 'text-white/30'}>
            STATUS: {error ? 'ERROR' : isLoading ? 'FETCHING' : 'SYNCED'}
          </span>
          <span className="text-white/30">LATENCY: LIVE (GDELT)</span>
        </div>
        <div className="text-white/30">
          © 2026 NEURAL NEWS CURATION PLATFORM
        </div>
      </footer>

      <ArticleModal />
    </main>
  );
}
