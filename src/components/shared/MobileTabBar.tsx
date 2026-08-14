'use client';

import React from 'react';
import { Network, Map, Newspaper } from 'lucide-react';

export type MobileTab = 'graph' | 'map' | 'feed';

const TABS: { key: MobileTab; label: string; icon: typeof Network }[] = [
  { key: 'graph', label: 'Graph', icon: Network },
  { key: 'map', label: 'Map', icon: Map },
  { key: 'feed', label: 'Feed', icon: Newspaper },
];

/**
 * Bottom tab bar (mobile only). The stacked mobile layout crammed the graph,
 * the scatter map, and the article strip into one long scroll; tabs give each
 * surface the full viewport instead.
 */
export default function MobileTabBar({
  tab,
  onChange,
}: {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
}) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-label={`${label} tab`}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-mono uppercase tracking-widest transition-colors ${
                active ? 'text-neon-blue' : 'text-white/35 active:text-white/60'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-[2px] w-10 bg-neon-blue rounded-full shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
              )}
              <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
