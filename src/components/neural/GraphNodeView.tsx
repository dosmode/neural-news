'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraphNode } from '@/utils/graphTree';

interface GraphNodeViewProps {
  node: GraphNode;
  isHovered: boolean;
  isNeighborDimmed: boolean;
  isSelected: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerEnter: (id: string) => void;
  onPointerLeave: () => void;
  onRemove?: (id: string) => void;
}

// Node radius shrinks with depth: root largest, leaves smallest.
function radiusFor(depth: number): number {
  return Math.max(6, 14 - depth * 2.5);
}

export default function GraphNodeView({
  node,
  isHovered,
  isNeighborDimmed,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onRemove,
}: GraphNodeViewProps) {
  if (node.x == null || node.y == null) return null;

  const r = radiusFor(node.depth);
  const isRoot = node.depth === 0;
  const collapsedWithChildren = node.hasChildren && !node.expanded;

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
      {/* Glow halo for active/hovered nodes */}
      {(isRoot || isHovered || node.expanded) && (
        <circle r={r + 6} fill={fill} opacity={isHovered ? 0.28 : 0.16} />
      )}

      {/* Expand affordance ring for collapsed-with-children */}
      {collapsedWithChildren && (
        <circle r={r + 3} fill="none" stroke={fill} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
      )}

      {/* Selected ring: this keyword is currently driving the article results */}
      {isSelected && (
        <circle r={r + 4.5} fill="none" stroke="#39ff14" strokeWidth={1.5} opacity={0.85} />
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
        fontSize={isRoot ? 11 : 9}
        fontWeight={isRoot ? 700 : 500}
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

      {/* Hover-revealed remove button */}
      {isHovered && onRemove && (
        <g
          transform={`translate(${r + 4}, ${-r - 4})`}
          onPointerDown={(e) => { e.stopPropagation(); onRemove(node.id); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={6} fill="#06060b" stroke="rgba(255,255,255,0.4)" strokeWidth={0.75} />
          <line x1={-2.2} y1={-2.2} x2={2.2} y2={2.2} stroke="#ff5577" strokeWidth={1.2} strokeLinecap="round" />
          <line x1={2.2} y1={-2.2} x2={-2.2} y2={2.2} stroke="#ff5577" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      )}
    </motion.g>
  );
}
