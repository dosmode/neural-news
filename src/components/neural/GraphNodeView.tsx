'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraphNode, baseRadius } from '@/utils/graphTree';

interface GraphNodeViewProps {
  node: GraphNode;
  isHovered: boolean;
  isNeighborDimmed: boolean;
  isSelected: boolean;
  /** 0..1 share of current news coverage — drives radius and glow. */
  importance?: number;
  /** Coverage spiked vs the last snapshot — pulsing "this just blew up" ring. */
  isSurging?: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerEnter: (id: string) => void;
  onPointerLeave: () => void;
  onRemove?: (id: string) => void;
}

// On touch devices hover never sticks, so hover-only affordances are
// unreachable — surface them permanently instead (spec 011 FR-004/005).
const isCoarsePointer =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export default function GraphNodeView({
  node,
  isHovered,
  isNeighborDimmed,
  isSelected,
  importance = 0,
  isSurging = false,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onRemove,
}: GraphNodeViewProps) {
  if (node.x == null || node.y == null) return null;

  // Importance-scaled radius (panel writes node.r; fall back to the base).
  const r = node.r ?? baseRadius(node.depth);
  const isRoot = node.depth === 0;
  const collapsedWithChildren = node.hasChildren && !node.expanded;
  const hot = importance > 0.35;

  // root = neon blue, collapsed-with-children = neon purple, leaf/expanded = dim
  const fill = isRoot
    ? '#00f3ff'
    : collapsedWithChildren
    ? '#bc13fe'
    : node.expanded
    ? '#00f3ff'
    : '#8a8a9a';

  const opacity = isNeighborDimmed ? 0.16 : 1;
  const labelFill = isNeighborDimmed ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)';

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ x: node.x, y: node.y, cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown(node.id, e)}
      onPointerEnter={() => onPointerEnter(node.id)}
      onPointerLeave={onPointerLeave}
    >
      {/* Glow halo — hot topics glow harder so the day's issues pop */}
      {(isRoot || isHovered || node.expanded || hot) && (
        <circle
          r={r + 6 + importance * 4}
          fill={fill}
          opacity={isHovered ? 0.28 : 0.14 + importance * 0.22}
        />
      )}

      {/* Expand affordance ring for collapsed-with-children */}
      {collapsedWithChildren && (
        <circle r={r + 3} fill="none" stroke={fill} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
      )}

      {/* Selected ring: this keyword is currently driving the article results */}
      {isSelected && (
        <circle r={r + 4.5} fill="none" stroke="#39ff14" strokeWidth={1.5} opacity={0.85} />
      )}

      {/* Surge: coverage just spiked — expanding pulse ring + ▲ badge */}
      {isSurging && (
        <>
          <circle r={r + 8} fill="none" stroke="#ff9f1c" strokeWidth={1.4}>
            <animate attributeName="r" values={`${r + 6};${r + 16};${r + 6}`} dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text
            x={-r - 5}
            y={-r - 5}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#ff9f1c"
            stroke="#06060b"
            strokeWidth={2}
            style={{ pointerEvents: 'none', paintOrder: 'stroke' }}
          >
            ▲
          </text>
        </>
      )}

      <circle
        r={r}
        fill={fill}
        stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={isHovered ? 1.5 : 0.75}
      />

      {/* Label with a dark halo (paint-order stroke) for legibility over links */}
      <text
        x={0}
        y={r + 12}
        textAnchor="middle"
        fontSize={(isRoot ? 11 : 9) + Math.round(importance * 2)}
        fontWeight={isRoot || importance > 0.6 ? 700 : 500}
        fill={labelFill}
        stroke="#06060b"
        strokeWidth={2.5}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          paintOrder: 'stroke',
        }}
      >
        {node.label}
      </text>

      {/* Remove button: hover-revealed on mouse; always visible on user-added
          roots for touch devices (hover is unreachable there) */}
      {onRemove && (isHovered || (isCoarsePointer && isRoot)) && (
        <g
          transform={`translate(${r + 4}, ${-r - 4})`}
          onPointerDown={(e) => { e.stopPropagation(); onRemove(node.id); }}
          style={{ cursor: 'pointer' }}
        >
          {/* Invisible enlarged hit area so the tap target isn't 12px */}
          <circle r={isCoarsePointer ? 14 : 8} fill="transparent" />
          <circle r={6} fill="#06060b" stroke="rgba(255,255,255,0.4)" strokeWidth={0.75} />
          <line x1={-2.2} y1={-2.2} x2={2.2} y2={2.2} stroke="#ff5577" strokeWidth={1.2} strokeLinecap="round" />
          <line x1={2.2} y1={-2.2} x2={-2.2} y2={2.2} stroke="#ff5577" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      )}
    </motion.g>
  );
}
