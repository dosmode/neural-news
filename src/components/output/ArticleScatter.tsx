'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClustering } from '@/hooks/useClustering';
import { useTimeline } from '@/hooks/useTimeline';
import { useStore } from '@/store/useStore';
import { MappedPoint } from '@/types';
import ClassificationField from './ClassificationField';
import { fieldIntensity } from '@/utils/sentimentField';

const CARD_W = 230;
const CARD_H = 96;
const PAD = 12;

// Deterministic per-dot hash → desynced float timing (stable across renders)
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function HoverCard({
  point,
  containerWidth,
  containerHeight,
}: {
  point: MappedPoint;
  containerWidth: number;
  containerHeight: number;
}) {
  const date = point.seendate
    ? `${point.seendate.slice(0, 4)}-${point.seendate.slice(4, 6)}-${point.seendate.slice(6, 8)}`
    : '';

  let left = point.x + 20;
  if (left + CARD_W > containerWidth - PAD) left = point.x - CARD_W - 20;
  left = Math.max(PAD, Math.min(left, containerWidth - CARD_W - PAD));

  let top = point.y - CARD_H / 2;
  top = Math.max(PAD, Math.min(top, containerHeight - CARD_H - PAD));

  const sentimentColor =
    point.sentiment === 'positive'
      ? 'border-neon-blue/60 text-neon-blue'
      : point.sentiment === 'negative'
      ? 'border-neon-red/60 text-neon-red'
      : 'border-white/20 text-white/40';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 4 }}
      transition={{ duration: 0.12 }}
      className="absolute z-50 pointer-events-none"
      style={{ left, top, width: CARD_W }}
    >
      <div className="bg-black/95 border border-white/15 rounded-xl p-3 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <p className="text-white text-[11px] leading-snug line-clamp-3 mb-2.5">{point.title}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/40 text-[9px] font-mono truncate">{point.domain}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {date && <span className="text-white/25 text-[9px] font-mono">{date}</span>}
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${sentimentColor}`}>
              {point.sentiment.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ArticleScatter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<MappedPoint | null>(null);

  const { points: clusterPoints, clusters } = useClustering(dimensions.width, dimensions.height);
  const { points: timelinePoints, ticks } = useTimeline(dimensions.width, dimensions.height);
  const setSelectedArticle = useStore((state) => state.setSelectedArticle);
  const isLoading = useStore((state) => state.isLoading);
  const error = useStore((state) => state.error);
  const showClassificationField = useStore((state) => state.showClassificationField);
  const toggleClassificationField = useStore((state) => state.toggleClassificationField);
  const clusterMode = useStore((state) => state.clusterMode);
  const setClusterMode = useStore((state) => state.setClusterMode);
  const viewMode = useStore((state) => state.viewMode);
  const setViewMode = useStore((state) => state.setViewMode);
  const sentimentWeight = useStore((state) => state.filterWeights['sentiment'] ?? 0.5);

  const intensity = fieldIntensity(sentimentWeight);
  const isTimeline = viewMode === 'timeline';
  const points = isTimeline ? timelinePoints : clusterPoints;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setHoveredPoint(null); }, [points]);

  const handleMouseEnter = useCallback((point: MappedPoint) => setHoveredPoint(point), []);
  const handleMouseLeave = useCallback(() => setHoveredPoint(null), []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      {/* Classification field heatmap (cluster view only) */}
      <ClassificationField
        points={points}
        width={dimensions.width}
        height={dimensions.height}
        intensity={intensity}
        visible={showClassificationField && !isTimeline}
        dimmed={isLoading}
      />

      {/* Section label */}
      <div className="hidden sm:block absolute top-4 left-5 z-20 text-[9px] font-mono text-white/20 uppercase tracking-widest pointer-events-none">
        Output Layer · Curation Map
      </div>

      {/* Output controls (view toggle · cluster-mode toggle · field toggle · count) */}
      <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-[72%] lg:top-4 lg:right-5 lg:gap-3 lg:max-w-none">
        {/* View segmented control: Cluster | Timeline */}
        <div className="flex rounded-full border border-white/15 overflow-hidden text-[9px] font-mono uppercase tracking-widest">
          {(['cluster', 'timeline'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-2.5 py-1 transition-colors ${
                viewMode === m
                  ? 'bg-neon-purple/20 text-neon-purple'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Cluster mode segmented control (cluster view only) */}
        {!isTimeline && (
          <div className="flex rounded-full border border-white/15 overflow-hidden text-[9px] font-mono uppercase tracking-widest">
            {(['sentiment', 'topic'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setClusterMode(m)}
                className={`px-2.5 py-1 transition-colors ${
                  clusterMode === m
                    ? 'bg-neon-blue/20 text-neon-blue'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Field toggle (cluster view only) */}
        {!isTimeline && (
          <button
            onClick={toggleClassificationField}
            className={`text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
              showClassificationField
                ? 'border-neon-blue/50 text-neon-blue'
                : 'border-white/15 text-white/30 hover:text-white/50'
            }`}
          >
            Field {showClassificationField ? 'ON' : 'OFF'}
          </button>
        )}

        {/* Article count */}
        {points.length > 0 && (
          <div className="text-sm font-mono text-white/45 pointer-events-none">
            {points.length} <span className="text-white/20">articles</span>
          </div>
        )}
      </div>

      {/* Dots */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {points.map((point, i) => {
            const isHovered = hoveredPoint?.id === point.id;
            const h = hashId(point.id);
            const floatDur = 5 + (h % 30) / 10; // 5.0–7.9s
            const floatDelay = (h % 40) / 10; // 0–3.9s
            return (
              <motion.div
                key={point.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isLoading ? 0.35 : 1,
                  x: point.x - 12,
                  y: point.y - 12,
                  scale: isHovered ? 1.6 : 1,
                  zIndex: isHovered ? 40 : 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 60, damping: 12, delay: i * 0.004 }}
                onMouseEnter={() => handleMouseEnter(point)}
                onMouseLeave={handleMouseLeave}
                onClick={() => { handleMouseLeave(); setSelectedArticle(point.id); }}
                className="absolute top-0 left-0 w-6 h-6 cursor-pointer"
              >
                <div
                  style={{ animation: `dotFloat ${floatDur}s ease-in-out ${floatDelay}s infinite` }}
                  className={`
                    w-full h-full rounded-full ring-1 ring-inset ring-white/10 border border-white/20
                    transition-shadow duration-200
                    ${point.sentiment === 'positive'
                      ? 'bg-neon-blue shadow-[0_0_12px_rgba(0,243,255,0.7)]'
                      : point.sentiment === 'negative'
                      ? 'bg-neon-red shadow-[0_0_12px_rgba(255,49,49,0.7)]'
                      : 'bg-white/75 shadow-[0_0_8px_rgba(255,255,255,0.45)]'}
                    ${isHovered ? 'shadow-[0_0_22px_rgba(255,255,255,0.45)]' : ''}
                  `}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Cluster proportion labels — glass pills above each cluster (cluster view only) */}
      {!isTimeline && !isLoading && clusters.map((c) => {
        // Sentiment mode: color by sentiment. Topic mode: neutral accent (cluster is mixed).
        const accent =
          c.kind === 'topic' ? 'text-white'
          : c.sentiment === 'positive' ? 'text-neon-blue'
          : c.sentiment === 'negative' ? 'text-neon-red'
          : 'text-white/70';
        const dotColor =
          c.kind === 'topic' ? 'bg-neon-blue'
          : c.sentiment === 'positive' ? 'bg-neon-blue'
          : c.sentiment === 'negative' ? 'bg-neon-red'
          : 'bg-white/70';
        // Lift the label above the blob (radius estimated from dot count)
        const estRadius = Math.sqrt(c.count) * 16;
        const top = Math.max(52, c.cy - estRadius - 38);
        return (
          <div
            key={c.key}
            className="absolute z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center gap-1"
            style={{ left: c.cx, top }}
          >
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-full pl-2 pr-2.5 py-1 shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/50">{c.label}</span>
              <span className={`text-sm font-bold ${accent}`}>{c.percent}%</span>
            </div>
            <span className="text-[8px] font-mono text-white/25">{c.count} articles</span>
          </div>
        );
      })}

      {/* Time axis (timeline view only) */}
      {isTimeline && dimensions.width > 0 && points.length > 0 && (
        <>
          {/* axis baseline */}
          <div className="absolute left-0 right-0 z-20 h-px bg-white/10 pointer-events-none" style={{ bottom: 40 }} />
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              {/* faint vertical gridline */}
              <div
                className="absolute top-12 z-0 w-px bg-white/[0.04] pointer-events-none"
                style={{ left: t.x, bottom: 40 }}
              />
              {/* tick label */}
              <div
                className="absolute z-20 -translate-x-1/2 text-[9px] font-mono text-white/35 pointer-events-none"
                style={{ left: t.x, bottom: 22 }}
              >
                {t.label}
              </div>
            </React.Fragment>
          ))}
          {/* axis caption */}
          <div className="absolute left-5 z-20 text-[8px] font-mono text-white/20 uppercase tracking-widest pointer-events-none" style={{ bottom: 22 }}>
            ◀ older · newer ▶
          </div>
        </>
      )}

      {/* Hover preview */}
      <AnimatePresence>
        {hoveredPoint && (
          <HoverCard
            key={hoveredPoint.id}
            point={hoveredPoint}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        )}
      </AnimatePresence>

      {/* Initial loading */}
      {isLoading && points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neon-blue/30 border-t-neon-blue animate-spin" />
            <span className="text-neon-blue font-mono text-sm tracking-widest animate-pulse">
              FETCHING LIVE DATA...
            </span>
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/15 font-mono text-sm">NO DATA POINTS DETECTED</p>
        </div>
      )}
    </div>
  );
}
