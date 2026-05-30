'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClustering } from '@/hooks/useClustering';
import { useStore } from '@/store/useStore';

export default function CurationMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Dimensions only pass > 0 after mount
  const { points } = useClustering(dimensions.width, dimensions.height);
  const setSelectedArticle = useStore((state) => state.setSelectedArticle);
  const isLoading = useStore((state) => state.isLoading);
  const error = useStore((state) => state.error);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-transparent">
      {/* Ensure absolute container spans the whole area */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {!isLoading && points.map((point) => {
            // Guard against NaN
            const safeX = isNaN(point.x) ? dimensions.width / 2 : point.x;
            const safeY = isNaN(point.y) ? dimensions.height / 2 : point.y;
            
            return (
              <motion.div
                key={point.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1,
                  x: safeX - 10, 
                  y: safeY - 10,
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 50, damping: 10 }}
                whileHover={{ scale: 1.5, zIndex: 50 }}
                onClick={() => setSelectedArticle(point.id)}
                className={`
                  absolute top-0 left-0 w-5 h-5 rounded-full cursor-pointer shadow-lg
                  ${point.sentiment === 'positive' ? 'bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.8)]' : 
                    point.sentiment === 'negative' ? 'bg-neon-red shadow-[0_0_10px_rgba(255,49,49,0.8)]' : 
                    'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'}
                  border border-white/20
                `}
                title={point.title}
              >
                <div className="absolute inset-0 rounded-full animate-ping bg-inherit opacity-20" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neon-blue/30 border-t-neon-blue animate-spin" />
            <span className="text-neon-blue font-mono text-sm tracking-widest animate-pulse">FETCHING LIVE DATA...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg font-mono text-sm max-w-md text-center backdrop-blur-md">
            <p className="font-bold mb-2">CONNECTION ERROR</p>
            <p className="opacity-80">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && points.length === 0 && dimensions.width > 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/10 font-mono text-sm pointer-events-none">
          NO DATA POINTS DETECTED
        </div>
      )}
    </div>
  );
}
