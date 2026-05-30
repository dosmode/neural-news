'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';

export default function ArticleModal() {
  const selectedArticleId = useStore((state) => state.selectedArticleId);
  const articles = useStore((state) => state.articles);
  const setSelectedArticle = useStore((state) => state.setSelectedArticle);

  const article = articles.find((a) => a.id === selectedArticleId);

  if (!article) return null;

  return (
    <AnimatePresence>
      {selectedArticleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0a0a0a] border-2 border-neon-blue rounded-2xl p-8 shadow-[0_0_30px_rgba(0,243,255,0.3)] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-neon-blue/10 blur-[100px] pointer-events-none" />
            
            <button 
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  article.type === 'breaking' ? 'border-neon-red text-neon-red' : 'border-neon-purple text-neon-purple'
                }`}>
                  {article.type.toUpperCase()}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  article.sentiment === 'positive' ? 'border-neon-green text-neon-green' : 'border-neon-red text-neon-red'
                }`}>
                  {article.sentiment.toUpperCase()} SENTIMENT
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                {article.title}
              </h2>

              <p className="text-white/60 leading-relaxed text-sm">
                {article.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {Object.keys(article.relevanceMap).map(kw => (
                  <span key={kw} className="text-[9px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded">
                    #{kw.toUpperCase()}
                  </span>
                ))}
              </div>

              <div className="mt-2 text-[10px] font-mono text-white/40 flex justify-between border-t border-white/10 pt-4">
                <span>{article.domain}</span>
                <span>{article.seendate ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toLocaleString() : ''}</span>
              </div>

              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 w-full py-3 bg-neon-blue text-black font-bold rounded-lg hover:bg-white transition-all duration-300 uppercase tracking-widest text-xs text-center block"
              >
                Read Full Source Article
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
