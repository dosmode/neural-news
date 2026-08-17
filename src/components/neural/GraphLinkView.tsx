'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraphLink, GraphNode } from '@/utils/graphTree';

interface GraphLinkViewProps {
  link: GraphLink;
  isHighlighted: boolean;
  isDimmed: boolean;
}

/** Resolve an endpoint's coordinates (d3 mutates string id → node object post-tick). */
function coords(endpoint: string | GraphNode): { x: number; y: number } | null {
  if (typeof endpoint === 'string') return null; // not yet resolved by simulation
  if (endpoint.x == null || endpoint.y == null) return null;
  return { x: endpoint.x, y: endpoint.y };
}

export default function GraphLinkView({ link, isHighlighted, isDimmed }: GraphLinkViewProps) {
  const s = coords(link.source);
  const t = coords(link.target);
  if (!s || !t) return null;

  const isCross = link.type === 'cross';
  // Co-occurrence count (data-driven ties). Curated/token relations have no
  // weight and render at the baseline.
  const w = link.weight ?? 0;

  // Cross links (keyword↔keyword association) read as dashed, muted purple, and
  // dimmer than the solid hierarchy (parent→child) links. Strong ties (many
  // shared articles) render thicker and brighter so hot connections pop.
  const opacity = isDimmed
    ? 0.05
    : isHighlighted
    ? 0.7
    : isCross
    ? Math.min(0.5, 0.15 + w * 0.07)
    : 0.22;
  const stroke = isHighlighted ? '#00f3ff' : isCross ? '#bc13fe' : '#ffffff';
  const width = isHighlighted ? 1.6 : isCross ? Math.min(2, 0.7 + w * 0.3) : 1;

  return (
    // motion.g so links fade in/out with their nodes under AnimatePresence
    // (nodes animate 0.35s; an abrupt link vanish reads as a glitch).
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <line
        x1={s.x}
        y1={s.y}
        x2={t.x}
        y2={t.y}
        stroke={stroke}
        strokeWidth={width}
        strokeOpacity={opacity}
        strokeDasharray={isCross ? '3 4' : undefined}
        className="transition-[stroke-opacity] duration-200"
      />
    </motion.g>
  );
}
