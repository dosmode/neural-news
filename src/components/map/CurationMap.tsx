'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClustering } from '@/hooks/useClustering';
import { useStore } from '@/store/useStore';
import { MappedPoint } from '@/types';

export default function CurationMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { points } = useClustering(dimensions.width, dimensions.height);
  const setSelectedArticle = useStore((state) => state.setSelectedArticle);

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
      <svg className="w-full h-full pointer-events-none">
        {/* Connection lines between points could be added here for extra visual complexity */}
      </svg>

      <div className="absolute inset-0">
        <AnimatePresence>
          {points.map((point) => (
            <motion.div
              key={point.id}
              initial={false}
              animate={{ 
                x: point.x - 10, 
                y: point.y - 10,
                scale: 1,
              }}
              whileHover={{ scale: 1.5, zIndex: 50 }}
              onClick={() => setSelectedArticle(point.id)}
              className={`
                absolute w-5 h-5 rounded-full cursor-pointer shadow-lg
                ${point.sentiment === 'positive' ? 'bg-neon-blue shadow-neon-blue/50' : 
                  point.sentiment === 'negative' ? 'bg-neon-red shadow-neon-red/50' : 
                  'bg-white shadow-white/50'}
                border border-white/20
              `}
              title={point.title}
            >
              <div className="absolute inset-0 rounded-full animate-ping bg-inherit opacity-20" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/10 font-mono text-sm">
          NO DATA POINTS DETECTED
        </div>
      )}
    </div>
  );
}
