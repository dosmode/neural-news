'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { KeywordDef } from '@/types';

const TOP_PAD = 70;
const BOTTOM_PAD = 30;
const LAYER_X = { input: 0.16, hidden1: 0.52, hidden2: 0.84 };

interface PositionedNode {
  id: string;
  label: string;
  kind: 'keyword' | 'filter';
  layer: 0 | 1 | 2;
  x: number;
  y: number;
  isActive: boolean;
  weight: number;
}

interface PositionedEdge {
  id: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  isActive: boolean;
  weight: number;
}

function layout(
  width: number,
  height: number,
  keywords: KeywordDef[],
  activeKeywords: Set<string>,
  dynamicFilterNodes: { id: string; label: string; layer: 1 | 2 }[],
  filterWeights: Record<string, number>
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (width === 0 || height === 0) return { nodes: [], edges: [] };

  // Reserve room at the bottom of the input column for the add-keyword control
  const usableH = height - TOP_PAD - BOTTOM_PAD - 40;
  const layer1 = dynamicFilterNodes.filter(n => n.layer === 1);
  const layer2 = dynamicFilterNodes.filter(n => n.layer === 2);

  const place = (count: number, i: number) => {
    if (count <= 1) return TOP_PAD + usableH / 2;
    return TOP_PAD + (usableH / (count - 1)) * i;
  };

  const inputNodes: PositionedNode[] = keywords.map((kw, i) => ({
    id: kw.id,
    label: kw.label,
    kind: 'keyword',
    layer: 0,
    x: width * LAYER_X.input,
    y: place(keywords.length, i),
    isActive: activeKeywords.has(kw.id),
    weight: 0,
  }));

  const hidden1Nodes: PositionedNode[] = layer1.map((n, i) => ({
    id: n.id,
    label: n.label,
    kind: 'filter',
    layer: 1,
    x: width * LAYER_X.hidden1,
    y: place(layer1.length, i),
    isActive: true,
    weight: filterWeights[n.id] ?? 0.5,
  }));

  const hidden2Nodes: PositionedNode[] = layer2.map((n, i) => ({
    id: n.id,
    label: n.label,
    kind: 'filter',
    layer: 2,
    x: width * LAYER_X.hidden2,
    y: place(layer2.length, i),
    isActive: true,
    weight: filterWeights[n.id] ?? 0.5,
  }));

  const edges: PositionedEdge[] = [];

  // Input → Layer 1
  inputNodes.forEach(src => {
    hidden1Nodes.forEach(tgt => {
      edges.push({
        id: `e-${src.id}-${tgt.id}`,
        sx: src.x, sy: src.y, tx: tgt.x, ty: tgt.y,
        isActive: src.isActive,
        weight: tgt.weight,
      });
    });
  });

  // Layer 1 → Layer 2
  hidden1Nodes.forEach(src => {
    hidden2Nodes.forEach(tgt => {
      edges.push({
        id: `e-${src.id}-${tgt.id}`,
        sx: src.x, sy: src.y, tx: tgt.x, ty: tgt.y,
        isActive: true,
        weight: tgt.weight,
      });
    });
  });

  return { nodes: [...inputNodes, ...hidden1Nodes, ...hidden2Nodes], edges };
}

function KeywordPill({
  node,
  onToggle,
  onRemove,
}: {
  node: PositionedNode;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onToggle(node.id)}
      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
      className={`
        group absolute px-3.5 py-2 rounded-full border-2 cursor-pointer select-none
        text-[11px] font-bold uppercase tracking-tight whitespace-nowrap
        transition-all duration-300
        ${node.isActive
          ? 'bg-neon-blue/15 border-neon-blue text-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.35),inset_0_0_10px_rgba(0,243,255,0.1)] scale-110'
          : 'bg-black border-white/15 text-white/30 hover:border-white/40 hover:text-white/60 scale-95'
        }
      `}
    >
      {node.label}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
        aria-label={`Remove ${node.label}`}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black border border-white/30 text-white/60 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-neon-red/30 hover:border-neon-red hover:text-neon-red transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

function AddKeywordControl({ onAdd }: { onAdd: (label: string) => { ok: boolean; error?: string } }) {
  const [value, setValue] = useState('');
  const [hint, setHint] = useState('');

  const submit = () => {
    const r = onAdd(value);
    if (r.ok) {
      setValue('');
      setHint('');
    } else {
      setHint(
        r.error === 'empty' ? 'Enter a topic'
        : r.error === 'duplicate' ? 'Already added'
        : r.error === 'limit' ? 'Max 8 keywords'
        : r.error === 'too-long' ? 'Too long'
        : 'Invalid'
      );
    }
  };

  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1" style={{ width: 150 }}>
      {hint && <span className="text-[8px] font-mono text-neon-red/80 pl-1">{hint}</span>}
      <div className="flex items-center gap-1 bg-black/70 border border-white/15 rounded-full pl-2.5 pr-1 py-1 backdrop-blur-sm focus-within:border-neon-blue/50 transition-colors">
        <input
          value={value}
          maxLength={32}
          onChange={(e) => { setValue(e.target.value); if (hint) setHint(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Add topic…"
          className="flex-1 bg-transparent outline-none text-[10px] text-white placeholder:text-white/25 min-w-0"
        />
        <button
          onClick={submit}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Add keyword"
          className="shrink-0 w-5 h-5 rounded-full bg-neon-blue/15 border border-neon-blue/50 text-neon-blue text-sm leading-none flex items-center justify-center hover:bg-neon-blue/25"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FilterCard({
  node,
  onWeightChange,
}: {
  node: PositionedNode;
  onWeightChange: (id: string, w: number) => void;
}) {
  const accent = node.layer === 1 ? 'neon-purple' : 'neon-green';
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
      className={`
        absolute min-w-[120px] rounded-lg p-2 bg-black/70 backdrop-blur-sm
        border ${node.layer === 1 ? 'border-neon-purple/40' : 'border-neon-green/40'}
        shadow-[0_0_12px_rgba(0,0,0,0.5)]
      `}
    >
      <div className={`text-[9px] font-mono uppercase tracking-wider mb-1.5 ${node.layer === 1 ? 'text-neon-purple' : 'text-neon-green'}`}>
        {node.label}
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={node.weight}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onWeightChange(node.id, parseFloat(e.target.value))}
        className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer ${node.layer === 1 ? 'accent-neon-purple' : 'accent-neon-green'}`}
      />
      <div className="flex justify-end mt-0.5">
        <span className={`text-[8px] font-mono font-bold ${node.layer === 1 ? 'text-neon-purple' : 'text-neon-green'}`}>
          {(node.weight * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function NeuralPanel({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const keywords = useStore((s) => s.keywords);
  const activeKeywords = useStore((s) => s.activeKeywords);
  const dynamicFilterNodes = useStore((s) => s.dynamicFilterNodes);
  const filterWeights = useStore((s) => s.filterWeights);
  const toggleKeyword = useStore((s) => s.toggleKeyword);
  const addKeyword = useStore((s) => s.addKeyword);
  const removeKeyword = useStore((s) => s.removeKeyword);
  const setFilterWeight = useStore((s) => s.setFilterWeight);
  const isLoading = useStore((s) => s.isLoading);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDims({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, edges } = useMemo(
    () => layout(dims.width, dims.height, keywords, activeKeywords, dynamicFilterNodes, filterWeights),
    [dims, keywords, activeKeywords, dynamicFilterNodes, filterWeights]
  );

  return (
    <div
      ref={containerRef}
      style={style}
      className={`relative overflow-hidden bg-black/30 ${className}`}
    >
      {/* Panel title */}
      <div className="absolute top-3 left-4 z-20 text-[9px] font-mono text-white/25 uppercase tracking-widest pointer-events-none">
        Neural Filter
      </div>

      {/* Column labels */}
      {dims.width > 0 && (
        <>
          <div className="absolute top-9 z-10 text-[8px] font-mono text-white/15 uppercase tracking-widest pointer-events-none"
               style={{ left: dims.width * LAYER_X.input, transform: 'translateX(-50%)' }}>Input</div>
          <div className="absolute top-9 z-10 text-[8px] font-mono text-white/15 uppercase tracking-widest pointer-events-none"
               style={{ left: dims.width * LAYER_X.hidden1, transform: 'translateX(-50%)' }}>Topic</div>
          <div className="absolute top-9 z-10 text-[8px] font-mono text-white/15 uppercase tracking-widest pointer-events-none"
               style={{ left: dims.width * LAYER_X.hidden2, transform: 'translateX(-50%)' }}>Filter</div>
        </>
      )}

      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {edges.map((e) => {
          const cp = Math.abs(e.tx - e.sx) * 0.5;
          const d = `M ${e.sx} ${e.sy} C ${e.sx + cp} ${e.sy} ${e.tx - cp} ${e.ty} ${e.tx} ${e.ty}`;
          if (e.isActive) {
            return (
              <path
                key={e.id}
                d={d}
                fill="none"
                stroke="#00f3ff"
                strokeWidth={1 + e.weight * 2.5}
                strokeOpacity={0.25 + e.weight * 0.6}
                strokeDasharray="6 10"
                strokeLinecap="round"
                className="animate-neural-flow"
              />
            );
          }
          return (
            <path
              key={e.id}
              d={d}
              fill="none"
              stroke="#ffffff"
              strokeWidth={0.5}
              strokeOpacity={0.05}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      <div className="absolute inset-0 z-10">
        {nodes.map((n) =>
          n.kind === 'keyword' ? (
            <KeywordPill key={n.id} node={n} onToggle={toggleKeyword} onRemove={removeKeyword} />
          ) : (
            <FilterCard key={n.id} node={n} onWeightChange={setFilterWeight} />
          )
        )}
      </div>

      {/* Empty state for the input column */}
      {dims.width > 0 && keywords.length === 0 && (
        <div
          className="absolute z-10 text-[10px] font-mono text-white/30 text-center leading-relaxed pointer-events-none"
          style={{ left: dims.width * LAYER_X.input, top: '42%', transform: 'translate(-50%, -50%)', width: 130 }}
        >
          Add a keyword<br />to start ↓
        </div>
      )}

      {/* Add-keyword control */}
      <AddKeywordControl onAdd={addKeyword} />

      {/* Loading flow indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue/70 to-transparent animate-pulse z-20" />
      )}
    </div>
  );
}
