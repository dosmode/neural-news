'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useForceSimulation } from '@/hooks/useForceSimulation';
import { useOverlayDismiss } from '@/hooks/useOverlayDismiss';
import {
  GraphNode,
  GraphLink,
  getChildren,
  collectDescendants,
  computeCrossLinks,
  buildOverview,
  restoreGraph,
  isLeaf,
  MAX_LIVE_NODES,
} from '@/utils/graphTree';
import { slugify } from '@/utils/keywordUtils';
import GraphNodeView from './GraphNodeView';
import GraphLinkView from './GraphLinkView';

const DRAG_THRESHOLD = 4; // px of movement before a press becomes a drag
const NEWS_ACTIVE_CAP = 8; // cap active keywords sent to the news query
const GRAPH_STORAGE_KEY = 'neural-news:graph:v1';
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;

type View = { x: number; y: number; k: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function linkSourceId(l: GraphLink): string {
  return typeof l.source === 'string' ? l.source : l.source.id;
}
function linkTargetId(l: GraphLink): string {
  return typeof l.target === 'string' ? l.target : l.target.id;
}

function AddRootControl({ onAdd }: { onAdd: (label: string) => { ok: boolean; error?: string } }) {
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
        : r.error === 'duplicate' ? 'Already on graph'
        : r.error === 'limit' ? 'Graph is full'
        : 'Invalid'
      );
    }
  };

  return (
    <div
      className="absolute bottom-3 left-3 z-30 flex flex-col gap-1"
      style={{ width: 180 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {hint && <span className="text-[8px] font-mono text-neon-red/80 pl-1">{hint}</span>}
      <div className="flex items-center gap-1 bg-black/70 border border-white/15 rounded-full pl-3 pr-1 py-1.5 backdrop-blur-md focus-within:border-neon-blue/50 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
        <input
          value={value}
          maxLength={32}
          onChange={(e) => { setValue(e.target.value); if (hint) setHint(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Add topic…"
          className="flex-1 bg-transparent outline-none text-[11px] text-white placeholder:text-white/25 min-w-0"
        />
        <button
          onClick={submit}
          aria-label="Add topic"
          className="shrink-0 w-6 h-6 rounded-full bg-neon-blue/15 border border-neon-blue/50 text-neon-blue text-base leading-none flex items-center justify-center hover:bg-neon-blue/30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-7 h-7 rounded-md bg-black/60 border border-white/15 text-white/60 flex items-center justify-center
        hover:text-neon-blue hover:border-neon-blue/50 hover:bg-neon-blue/10 transition-colors backdrop-blur-md text-[13px] leading-none"
    >
      {children}
    </button>
  );
}

export default function ForceGraphPanel({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [liveNodes, setLiveNodes] = useState<GraphNode[]>([]);
  const [liveLinks, setLiveLinks] = useState<GraphLink[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [fullscreen, setFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [capHint, setCapHint] = useState(false);
  const capHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Esc / mobile back gesture leaves fullscreen instead of leaving the app.
  useOverlayDismiss(fullscreen, () => setFullscreen(false));

  const showCapHint = useCallback(() => {
    setCapHint(true);
    if (capHintTimer.current) clearTimeout(capHintTimer.current);
    capHintTimer.current = setTimeout(() => setCapHint(false), 2600);
  }, []);
  useEffect(() => () => {
    if (capHintTimer.current) clearTimeout(capHintTimer.current);
  }, []);

  const storeKeywords = useStore((s) => s.keywords);
  const activeKeywords = useStore((s) => s.activeKeywords);
  const setKeywords = useStore((s) => s.setKeywords);
  const isLoading = useStore((s) => s.isLoading);

  // Cross-links are DERIVED from the live node set (not stored): a connection
  // between any two related keywords that aren't already parent↔child.
  const crossLinks = useMemo(
    () => computeCrossLinks(liveNodes, liveLinks),
    [liveNodes, liveLinks]
  );
  const allLinks = useMemo(() => [...liveLinks, ...crossLinks], [liveLinks, crossLinks]);

  const { tickVersion, reheat, setFixed } = useForceSimulation({
    width: dims.width,
    height: dims.height,
    nodes: liveNodes,
    links: allLinks,
  });

  const initializedRef = useRef(false);
  const liveNodesRef = useRef(liveNodes);
  liveNodesRef.current = liveNodes;
  const selectionCounter = useRef(0);
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; vx: number; vy: number; moved: boolean } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  // ─── Measure container ──────────────────────────────────────────────────
  const dimsRef = useRef(dims);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      // Hidden (mobile tab switched away) measures 0×0 — keep the last real
      // dims so the simulation doesn't collapse toward a zero-sized canvas.
      if (r.width === 0 || r.height === 0) return;
      dimsRef.current = { width: r.width, height: r.height };
      setDims(dimsRef.current);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-measure right after a fullscreen toggle. Keep the user's zoom level but
  // aim the view at the NEW canvas center: the simulation's center force pulls
  // the node cloud there, so any offset based on old positions double-shifts.
  // offsetWidth/Height ignore the FLIP transform mid-animation (rects don't).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0) return;
    dimsRef.current = { width: w, height: h };
    setDims(dimsRef.current);
    setView((v) => ({
      k: v.k,
      x: (w / 2) * (1 - v.k),
      y: (h / 2) * (1 - v.k),
    }));
  }, [fullscreen]);

  // ─── Sync active keyword set → store (recency priority) ─────────────────
  const syncToStore = useCallback((nodes: GraphNode[]) => {
    const keywords = nodes.map((n) => ({ id: n.id, label: n.label }));
    const activeIds = nodes
      .slice()
      .sort((a, b) => (b.selectedAt ?? 0) - (a.selectedAt ?? 0))
      .slice(0, NEWS_ACTIVE_CAP)
      .map((n) => n.id);
    setKeywords(keywords, activeIds);
  }, [setKeywords]);

  // ─── One-time initialization: restore saved graph, else build overview ──
  useEffect(() => {
    if (initializedRef.current) return;
    if (dims.width === 0 || dims.height === 0) return;

    // Restore the persisted graph structure (hierarchy + expansion +
    // selection survive reloads instead of flattening into roots).
    try {
      const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY);
      if (raw) {
        const restored = restoreGraph(JSON.parse(raw), dims.width, dims.height);
        if (restored) {
          initializedRef.current = true;
          selectionCounter.current = Math.max(0, ...restored.nodes.map((n) => n.selectedAt ?? 0));
          setLiveNodes(restored.nodes);
          setLiveLinks(restored.links);
          syncToStore(restored.nodes);
          reheat();
          return;
        }
      }
    } catch {
      /* corrupt storage → fall through to a fresh overview */
    }

    const activeRoots = storeKeywords.filter((k) => activeKeywords.has(k.id));
    if (activeRoots.length === 0) return;

    initializedRef.current = true;
    const { nodes, links } = buildOverview(activeRoots, dims.width, dims.height);
    selectionCounter.current = Math.max(0, ...nodes.map((n) => n.selectedAt ?? 0));
    setLiveNodes(nodes);
    setLiveLinks(links);
    syncToStore(nodes);
    reheat();
  }, [storeKeywords, activeKeywords, dims, syncToStore, reheat]);

  // ─── Persist graph structure on every change (post-init) ───────────────
  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      window.localStorage.setItem(
        GRAPH_STORAGE_KEY,
        JSON.stringify({
          nodes: liveNodes.map((n) => ({
            id: n.id,
            label: n.label,
            depth: n.depth,
            parentId: n.parentId,
            expanded: n.expanded,
            selectedAt: n.selectedAt ?? 0,
          })),
          // Only hierarchy links — cross links are derived at render time.
          links: liveLinks.map((l) => ({
            id: l.id,
            source: linkSourceId(l),
            target: linkTargetId(l),
            type: l.type ?? 'hierarchy',
          })),
        })
      );
    } catch {
      /* quota/serialization errors are non-fatal */
    }
  }, [liveNodes, liveLinks]);

  // ─── Select (+ maybe expand/collapse, or toggle a leaf off) ─────────────
  const selectNode = useCallback((id: string) => {
    const node = liveNodes.find((n) => n.id === id);
    if (!node) return;

    // Clicking an already-active LEAF deselects it (spec 015 FR-004): the only
    // other way to drop a keyword from the news filter is deleting the node.
    const isPlainLeaf = !node.hasChildren || (!node.expanded && liveNodes.length >= MAX_LIVE_NODES);
    if (isPlainLeaf && (node.selectedAt ?? 0) > 0) {
      const top = liveNodes
        .slice()
        .sort((a, b) => (b.selectedAt ?? 0) - (a.selectedAt ?? 0))
        .slice(0, NEWS_ACTIVE_CAP)
        .map((n) => n.id);
      if (top.includes(node.id)) {
        node.selectedAt = 0;
        if (node.hasChildren && !node.expanded && liveNodes.length >= MAX_LIVE_NODES) showCapHint();
        const newNodes = [...liveNodes];
        setLiveNodes(newNodes);
        syncToStore(newNodes);
        reheat();
        return;
      }
    }

    node.selectedAt = ++selectionCounter.current;

    // Expansion blocked by the node cap: tell the user why nothing happened.
    if (node.hasChildren && !node.expanded && liveNodes.length >= MAX_LIVE_NODES) {
      showCapHint();
    }

    if (node.hasChildren && !node.expanded && liveNodes.length < MAX_LIVE_NODES) {
      const liveIds = new Set(liveNodes.map((n) => n.id));
      const children = getChildren(node, liveIds);
      children.forEach((c) => {
        c.x = (node.x ?? dims.width / 2) + (Math.random() - 0.5) * 30;
        c.y = (node.y ?? dims.height / 2) + (Math.random() - 0.5) * 30;
      });
      node.expanded = children.length > 0 ? true : node.expanded;
      const newNodes = [...liveNodes, ...children];
      const newLinks: GraphLink[] = [
        ...liveLinks,
        ...children.map((c) => ({
          id: `${node.id}-${c.id}`,
          source: node.id,
          target: c.id,
          type: 'hierarchy' as const,
        })),
      ];
      setLiveNodes(newNodes);
      setLiveLinks(newLinks);
      syncToStore(newNodes);
      reheat();
    } else if (node.hasChildren && node.expanded) {
      const descendants = collectDescendants(id, liveLinks);
      node.expanded = false;
      const newNodes = liveNodes.filter((n) => !descendants.has(n.id));
      const newLinks = liveLinks.filter(
        (l) => !descendants.has(linkSourceId(l)) && !descendants.has(linkTargetId(l))
      );
      setHoveredId((h) => (h && descendants.has(h) ? null : h));
      setLiveNodes(newNodes);
      setLiveLinks(newLinks);
      syncToStore(newNodes);
      reheat();
    } else {
      const newNodes = [...liveNodes];
      setLiveNodes(newNodes);
      syncToStore(newNodes);
      reheat();
    }
  }, [liveNodes, liveLinks, dims, reheat, syncToStore]);

  const selectNodeRef = useRef(selectNode);
  selectNodeRef.current = selectNode;

  const removeNode = useCallback((id: string) => {
    const descendants = collectDescendants(id, liveLinks);
    const toRemove = new Set<string>([id, ...descendants]);
    const newNodes = liveNodes.filter((n) => !toRemove.has(n.id));
    const newLinks = liveLinks.filter(
      (l) => !toRemove.has(linkSourceId(l)) && !toRemove.has(linkTargetId(l))
    );
    // Clear hover so a removed node can't leave the graph stuck dimmed.
    setHoveredId((h) => (h && toRemove.has(h) ? null : h));
    setLiveNodes(newNodes);
    setLiveLinks(newLinks);
    syncToStore(newNodes);
    reheat();
  }, [liveNodes, liveLinks, reheat, syncToStore]);

  // ─── Add a new root keyword ─────────────────────────────────────────────
  const addRoot = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return { ok: false, error: 'empty' };
    const slug = slugify(trimmed);
    if (liveNodes.some((n) => n.id === slug)) return { ok: false, error: 'duplicate' };
    if (liveNodes.length >= MAX_LIVE_NODES) return { ok: false, error: 'limit' };
    const node: GraphNode = {
      id: slug,
      label: trimmed,
      depth: 0,
      parentId: null,
      expanded: false,
      hasChildren: !isLeaf(slug),
      selectedAt: ++selectionCounter.current,
      x: dims.width / 2 + (Math.random() - 0.5) * 40,
      y: dims.height / 2 + (Math.random() - 0.5) * 40,
    };
    const newNodes = [...liveNodes, node];
    setLiveNodes(newNodes);
    syncToStore(newNodes);
    reheat();
    return { ok: true };
  }, [liveNodes, dims, reheat, syncToStore]);

  // ─── Node drag (screen → world via current view) ────────────────────────
  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const v = viewRef.current;
        const worldX = (e.clientX - rect.left - v.x) / v.k;
        const worldY = (e.clientY - rect.top - v.y) / v.k;
        setFixed(drag.id, worldX, worldY);
        reheat();
      }
    }
  }, [setFixed, reheat]);

  const handleWindowPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      if (!drag.moved) selectNodeRef.current(drag.id);
      else setFixed(drag.id, null, null);
    }
    dragRef.current = null;
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [setFixed, handleWindowPointerMove]);

  const handleNodePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
  }, [handleWindowPointerMove, handleWindowPointerUp]);

  // ─── Background pan ─────────────────────────────────────────────────────
  const handleBgPointerMove = useCallback((e: PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (!p.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      p.moved = true;
      setIsPanning(true);
    }
    if (p.moved) setView((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
  }, []);

  const handleBgPointerUp = useCallback(() => {
    panRef.current = null;
    setIsPanning(false);
    window.removeEventListener('pointermove', handleBgPointerMove);
    window.removeEventListener('pointerup', handleBgPointerUp);
  }, [handleBgPointerMove]);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const v = viewRef.current;
    panRef.current = { startX: e.clientX, startY: e.clientY, vx: v.x, vy: v.y, moved: false };
    window.addEventListener('pointermove', handleBgPointerMove);
    window.addEventListener('pointerup', handleBgPointerUp);
  }, [handleBgPointerMove, handleBgPointerUp]);

  // ─── Wheel zoom (toward cursor) — native non-passive listener ───────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const k = clamp(v.k * factor, ZOOM_MIN, ZOOM_MAX);
        const worldX = (cx - v.x) / v.k;
        const worldY = (cy - v.y) / v.k;
        return { k, x: cx - worldX * k, y: cy - worldY * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomToward = useCallback((factor: number) => {
    setView((v) => {
      const cx = dims.width / 2;
      const cy = dims.height / 2;
      const k = clamp(v.k * factor, ZOOM_MIN, ZOOM_MAX);
      const worldX = (cx - v.x) / v.k;
      const worldY = (cy - v.y) / v.k;
      return { k, x: cx - worldX * k, y: cy - worldY * k };
    });
  }, [dims]);

  const resetView = useCallback(() => setView({ x: 0, y: 0, k: 1 }), []);

  useEffect(() => () => {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointermove', handleBgPointerMove);
    window.removeEventListener('pointerup', handleBgPointerUp);
  }, [handleWindowPointerMove, handleWindowPointerUp, handleBgPointerMove, handleBgPointerUp]);

  // ─── Hover neighbor highlight ───────────────────────────────────────────
  const neighborIds = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>();
    for (const l of allLinks) {
      const s = linkSourceId(l);
      const t = linkTargetId(l);
      if (s === hoveredId) set.add(t);
      if (t === hoveredId) set.add(s);
    }
    return set;
  }, [hoveredId, allLinks]);

  const activeNewsIds = useMemo(() => {
    const ids = liveNodes
      .slice()
      .sort((a, b) => (b.selectedAt ?? 0) - (a.selectedAt ?? 0))
      .slice(0, NEWS_ACTIVE_CAP)
      .map((n) => n.id);
    return new Set(ids);
  }, [liveNodes, tickVersion]);

  const transform = `translate(${view.x}, ${view.y}) scale(${view.k})`;

  return (
    <motion.div
      ref={containerRef}
      layout
      transition={{ layout: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
      style={fullscreen ? undefined : style}
      className={
        fullscreen
          ? 'fixed inset-0 z-50 bg-[#06060b]'
          : `relative overflow-hidden bg-black/30 ${className}`
      }
    >
      {/* Ambient depth */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,rgba(0,243,255,0.05),transparent_60%)]" />

      {/* Title */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-2 pointer-events-none">
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
          Keyword Graph
        </span>
        {/* Immediate feedback for node clicks: the news query is refreshing */}
        {isLoading && (
          <span className="flex items-center gap-1.5 bg-black/70 border border-neon-blue/30 rounded-full pl-1.5 pr-2.5 py-0.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full border border-neon-blue/30 border-t-neon-blue animate-spin" />
            <span className="text-[8px] font-mono text-neon-blue/90 uppercase tracking-widest">
              Fetching
            </span>
          </span>
        )}
      </div>

      {/* SVG canvas — background pointerdown pans; wheel zooms */}
      <svg
        className="absolute inset-0 w-full h-full"
        data-tick={tickVersion}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={handleBgPointerDown}
      >
        <g transform={transform}>
          {/* Links (hierarchy + cross) — AnimatePresence so links fade out
              alongside their collapsing nodes instead of vanishing abruptly */}
          <AnimatePresence>
            {allLinks.map((l) => {
              const s = linkSourceId(l);
              const t = linkTargetId(l);
              const highlighted = !!hoveredId && (s === hoveredId || t === hoveredId);
              const dimmed = !!hoveredId && !highlighted;
              return <GraphLinkView key={l.id} link={l} isHighlighted={highlighted} isDimmed={dimmed} />;
            })}
          </AnimatePresence>

          {/* Nodes */}
          <AnimatePresence>
            {liveNodes.map((n) => {
              const dimmed = !!hoveredId && n.id !== hoveredId && !(neighborIds?.has(n.id));
              return (
                <GraphNodeView
                  key={n.id}
                  node={n}
                  isHovered={hoveredId === n.id}
                  isNeighborDimmed={dimmed}
                  isSelected={activeNewsIds.has(n.id)}
                  onPointerDown={handleNodePointerDown}
                  onPointerEnter={setHoveredId}
                  onPointerLeave={() => setHoveredId(null)}
                  onRemove={removeNode}
                />
              );
            })}
          </AnimatePresence>
        </g>
      </svg>

      {/* Control cluster (top-right) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        <CtrlButton label="Zoom in" onClick={() => zoomToward(1.2)}>＋</CtrlButton>
        <CtrlButton label="Zoom out" onClick={() => zoomToward(1 / 1.2)}>－</CtrlButton>
        <CtrlButton label="Reset view" onClick={resetView}>⊙</CtrlButton>
        <CtrlButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen((f) => !f)}>
          {fullscreen ? '⤢' : '⛶'}
        </CtrlButton>
      </div>

      {/* Legend (bottom-right) */}
      {liveNodes.length > 0 && (
        <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1 bg-black/50 border border-white/10 rounded-md px-2.5 py-1.5 backdrop-blur-md pointer-events-none">
          <div className="flex items-center gap-1.5">
            <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.5" /></svg>
            <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Hierarchy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#bc13fe" strokeWidth="1.4" strokeOpacity="0.7" strokeDasharray="3 3" /></svg>
            <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Related</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {liveNodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="text-[11px] font-mono text-white/25 text-center leading-relaxed">
            Add a topic<br />to grow the graph
          </div>
        </div>
      )}

      {/* Hint */}
      {liveNodes.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[8px] font-mono text-white/20 uppercase tracking-wider pointer-events-none whitespace-nowrap hidden sm:block">
          Scroll · zoom   ·   Drag bg · pan   ·   Click · expand
        </div>
      )}

      {/* Node-cap toast: expansion was silently impossible before; now say why */}
      <AnimatePresence>
        {capHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-md bg-black/80 border border-neon-red/40 text-neon-red/90 text-[10px] font-mono uppercase tracking-wider backdrop-blur-md pointer-events-none whitespace-nowrap"
          >
            Graph is full — collapse or remove nodes first
          </motion.div>
        )}
      </AnimatePresence>

      <AddRootControl onAdd={addRoot} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue/70 to-transparent animate-pulse z-30" />
      )}
    </motion.div>
  );
}
