'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';
import { HEADER_HEIGHT } from '@/utils/layout';

export default function ArticleDetailPanel() {
  const selectedArticleId = useStore((state) => state.selectedArticleId);
  const articles = useStore((state) => state.articles);
  const setSelectedArticle = useStore((state) => state.setSelectedArticle);

  const article = articles.find((a) => a.id === selectedArticleId);

  const formattedDate = article?.seendate
    ? (() => {
        try {
          return new Date(
            article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')
          ).toLocaleString();
        } catch {
          return article.seendate;
        }
      })()
    : '';

  return (
    <AnimatePresence>
      {selectedArticleId && article && (
        <>
          {/* Click-to-close backdrop (does not cover the neural panel visually — it's transparent) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedArticle(null)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          />

          {/* Slide-in panel — full-width sheet on mobile, 400px side panel on desktop */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 z-50 flex flex-col bg-[#080810]/95 border-l border-white/10 backdrop-blur-xl overflow-y-auto w-full lg:w-[400px]"
            style={{ top: HEADER_HEIGHT, bottom: 0 }}
          >
            {/* Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon-blue/10 blur-[100px] pointer-events-none" />

            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
            >
              <X size={22} />
            </button>

            <div className="flex flex-col gap-4 p-7">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  article.type === 'breaking' ? 'border-neon-red text-neon-red' : 'border-neon-purple text-neon-purple'
                }`}>
                  {article.type.toUpperCase()}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  article.sentiment === 'positive' ? 'border-neon-blue text-neon-blue' :
                  article.sentiment === 'negative' ? 'border-neon-red text-neon-red' :
                  'border-white/30 text-white/40'
                }`}>
                  {article.sentiment.toUpperCase()}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {article.title}
              </h2>

              <p className="text-white/60 leading-relaxed text-sm">
                {article.summary}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {Object.keys(article.relevanceMap).map((kw) => (
                  <span key={kw} className="text-[9px] font-mono text-white/30 bg-white/[0.04] px-2 py-1 rounded">
                    #{kw.toUpperCase()}
                  </span>
                ))}
              </div>

              <div className="text-[10px] font-mono text-white/40 flex justify-between border-t border-white/10 pt-4">
                <span className="truncate max-w-[180px]">{article.domain}</span>
                <span>{formattedDate}</span>
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 w-full py-3 bg-neon-blue text-black font-bold rounded-lg hover:bg-white transition-all duration-300 uppercase tracking-widest text-xs text-center block"
              >
                Read Full Source Article
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
