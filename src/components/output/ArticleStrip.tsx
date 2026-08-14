'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Article } from '@/types';

function ArticleCard({
  article,
  isSelected,
  onClick,
  vertical,
}: {
  article: Article;
  isSelected: boolean;
  onClick: () => void;
  vertical: boolean;
}) {
  const sentimentBorder =
    article.sentiment === 'positive'
      ? 'border-l-neon-blue'
      : article.sentiment === 'negative'
      ? 'border-l-neon-red'
      : 'border-l-white/30';

  const date = article.seendate
    ? `${article.seendate.slice(0, 4)}-${article.seendate.slice(4, 6)}-${article.seendate.slice(6, 8)}`
    : '';

  return (
    <div
      onClick={onClick}
      data-aid={article.id}
      className={`
        ${vertical ? 'w-full min-h-[80px] lg:w-[200px] lg:h-full lg:min-h-0' : 'w-[200px] h-full'}
        shrink-0 rounded-lg cursor-pointer p-3
        flex flex-col gap-1.5 transition-all duration-200
        bg-white/[0.025] hover:bg-white/[0.05]
        border border-white/[0.07] hover:border-white/[0.15]
        border-l-2 ${sentimentBorder}
        ${isSelected ? 'ring-1 ring-neon-blue/50 bg-white/[0.06]' : ''}
      `}
    >
      <p className="text-white text-[11px] leading-snug line-clamp-2 flex-1">{article.title}</p>
      <div className="flex justify-between items-center text-[9px] font-mono text-white/30 shrink-0">
        <span className="truncate max-w-[100px]">{article.domain}</span>
        <span className="shrink-0">{date}</span>
      </div>
    </div>
  );
}

export default function ArticleStrip({
  className = '',
  style,
  mobileVertical = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Mobile feed tab: render as a full-height vertical list (desktop stays a horizontal strip). */
  mobileVertical?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const articles = useStore((s) => s.articles);
  const selectedArticleId = useStore((s) => s.selectedArticleId);
  const setSelectedArticle = useStore((s) => s.setSelectedArticle);
  const isLoading = useStore((s) => s.isLoading);

  const sorted = useMemo(
    () => [...articles].sort((a, b) => (b.seendate || '').localeCompare(a.seendate || '')),
    [articles]
  );

  // Horizontal wheel-scroll needs a native non-passive listener: React's
  // onWheel is passive (preventDefault is ignored + logs a console error) and
  // would double-scroll the page on small screens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Selecting an article elsewhere (scatter dot click) brings its card into view.
  useEffect(() => {
    if (!selectedArticleId || !scrollRef.current) return;
    const card = scrollRef.current.querySelector(`[data-aid="${CSS.escape(selectedArticleId)}"]`);
    card?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [selectedArticleId]);

  return (
    <div style={style} className={`flex flex-col bg-black/40 border-t border-white/[0.05] ${className}`}>
      <div className="px-4 py-1.5 text-[9px] font-mono text-white/25 uppercase tracking-widest shrink-0 border-b border-white/[0.04]">
        Live Feed · {articles.length} Articles
      </div>

      <div className="relative flex-1 min-h-0">
        {/* Edge fade gradients (horizontal strip only) */}
        <div className={`${mobileVertical ? 'hidden lg:block' : ''} absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10`} />
        <div className={`${mobileVertical ? 'hidden lg:block' : ''} absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10`} />

        <div
          ref={scrollRef}
          className={`h-full flex gap-2 scrollbar-hide px-3 py-2 ${
            mobileVertical
              ? 'flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-x-auto lg:overflow-y-hidden'
              : 'overflow-x-auto'
          }`}
        >
          {isLoading && articles.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${mobileVertical ? 'w-full min-h-[80px] lg:w-[200px] lg:h-full lg:min-h-0' : 'w-[200px] h-full'} shrink-0 rounded-lg bg-white/[0.015] animate-pulse`}
              />
            ))}

          {!isLoading && articles.length === 0 && (
            <div className="flex items-center justify-center w-full text-white/10 font-mono text-[10px]">
              NO ARTICLES
            </div>
          )}

          {sorted.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={article.id === selectedArticleId}
              onClick={() => setSelectedArticle(article.id)}
              vertical={mobileVertical}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
