import { KEYWORD_SUGGESTIONS_MAP } from '@/services/keywordSuggestions';
import { slugify } from '@/utils/keywordUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  depth: number;
  parentId: string | null;
  expanded: boolean;
  hasChildren: boolean;
  // Monotonic recency counter; higher = more recently clicked. Drives news priority.
  selectedAt?: number;
  // Visual radius (importance-scaled); also feeds the collide force. Set by
  // the panel from computeImportance; absent → baseRadius(depth).
  r?: number;
  // Mutated in place by the d3-force simulation:
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  // d3 mutates these from string id → GraphNode object after the first tick
  source: string | GraphNode;
  target: string | GraphNode;
  // 'hierarchy' = parent→child from expansion; 'cross' = related-keyword association.
  // Absent is treated as hierarchy.
  type?: 'hierarchy' | 'cross';
  // Cross links only: co-occurrence article count — higher = stronger tie,
  // rendered thicker/brighter. Absent = curated/token relation (baseline).
  weight?: number;
}

/** Base node radius before importance scaling: root largest, leaves smallest. */
export function baseRadius(depth: number): number {
  return Math.max(6, 14 - depth * 2.5);
}

export const MAX_LIVE_NODES = 60;
export const MAX_CROSS_LINKS = 40;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A keyword id is a leaf when the adjacency map has no children for it. */
export function isLeaf(nodeId: string): boolean {
  const children = KEYWORD_SUGGESTIONS_MAP[nodeId];
  return !children || children.length === 0;
}

/** Resolve the source node id from a GraphLink (handles string | object). */
function linkSourceId(link: GraphLink): string {
  return typeof link.source === 'string' ? link.source : link.source.id;
}

/** Resolve the target node id from a GraphLink (handles string | object). */
function linkTargetId(link: GraphLink): string {
  return typeof link.target === 'string' ? link.target : link.target.id;
}

/**
 * Return the child nodes for a given parent, derived from the curated
 * adjacency map plus any dynamically discovered (crawled) children, excluding
 * ids already present in the live graph (dedup, curated labels first).
 */
export function getChildren(
  parent: GraphNode,
  liveNodeIds: Set<string>,
  dynamicChildren?: Record<string, string[]>
): GraphNode[] {
  const childLabels = [
    ...(KEYWORD_SUGGESTIONS_MAP[parent.id] ?? []),
    ...(dynamicChildren?.[parent.id] ?? []),
  ];
  const result: GraphNode[] = [];
  const added = new Set<string>();
  for (const label of childLabels) {
    const id = slugify(label);
    if (liveNodeIds.has(id) || added.has(id)) continue; // already on the graph
    added.add(id);
    result.push({
      id,
      label,
      depth: parent.depth + 1,
      parentId: parent.id,
      expanded: false,
      hasChildren: !isLeaf(id),
    });
  }
  return result;
}

/**
 * Recursively collect all descendant node ids of a given node, walking the
 * parent→child links. Used when collapsing a subtree.
 */
export function collectDescendants(nodeId: string, links: GraphLink[]): Set<string> {
  const descendants = new Set<string>();
  const walk = (parentId: string) => {
    for (const link of links) {
      if (linkSourceId(link) === parentId) {
        const childId = linkTargetId(link);
        if (!descendants.has(childId)) {
          descendants.add(childId);
          walk(childId);
        }
      }
    }
  };
  walk(nodeId);
  return descendants;
}

const TOKEN_STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'for', 'in', 'on']);

/** Meaningful word tokens of a slug id, naively singularized ("stocks"→"stock"). */
function tokensOf(id: string): Set<string> {
  return new Set(
    id
      .split('-')
      .map((t) => t.replace(/s$/, ''))
      .filter((t) => t.length >= 2 && !TOKEN_STOPWORDS.has(t))
  );
}

/**
 * Whether two keyword ids are related. Two sources of relation:
 * 1. The curated adjacency map (bidirectional union): either lists the other.
 * 2. Token overlap between the ids ("stock" ↔ "stock-market",
 *    "south-korea" ↔ "korea-stocks") — so USER-ADDED keywords, which the
 *    curated map knows nothing about, still grow cross links.
 * False for self.
 */
export function areRelated(idA: string, idB: string): boolean {
  if (idA === idB) return false;
  const aKids = KEYWORD_SUGGESTIONS_MAP[idA] ?? [];
  if (aKids.some((label) => slugify(label) === idB)) return true;
  const bKids = KEYWORD_SUGGESTIONS_MAP[idB] ?? [];
  if (bKids.some((label) => slugify(label) === idA)) return true;

  const ta = tokensOf(idA);
  if (ta.size === 0) return false;
  for (const t of tokensOf(idB)) {
    if (ta.has(t)) return true;
  }
  return false;
}

/** Unordered pair key so {a,b} and {b,a} collapse to one. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Data-driven relations: two keywords are empirically related when the same
 * article's title matches BOTH (relevanceMap high band, ≥ 0.8) in at least
 * `minCount` articles. This links keywords the curated map and token overlap
 * can't see — e.g. "Samsung" ↔ "South Korea" via shared Korean coverage.
 * Returns pairKey() → co-occurrence count (the tie's strength).
 */
export function computeCooccurrencePairs(
  articles: { relevanceMap: Record<string, number> }[],
  liveIds: Set<string>,
  minCount = 2
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const matched = Object.entries(a.relevanceMap)
      .filter(([id, v]) => v >= 0.8 && liveIds.has(id))
      .map(([id]) => id);
    for (let i = 0; i < matched.length; i++) {
      for (let j = i + 1; j < matched.length; j++) {
        const k = pairKey(matched[i], matched[j]);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  const out = new Map<string, number>();
  counts.forEach((c, k) => {
    if (c >= minCount) out.set(k, c);
  });
  return out;
}

/**
 * Cross-links among the live nodes: a line between any two related nodes that
 * aren't already joined by a hierarchy link. Relations come from the curated
 * map + token overlap (areRelated) plus optional data-driven pairs
 * (computeCooccurrencePairs). Deduped by unordered pair and capped at
 * MAX_CROSS_LINKS for visual density.
 */
export function computeCrossLinks(
  nodes: GraphNode[],
  hierarchyLinks: GraphLink[],
  extraPairs?: Map<string, number>
): GraphLink[] {
  const existing = new Set(
    hierarchyLinks.map((l) => pairKey(linkSourceId(l), linkTargetId(l)))
  );
  const out: GraphLink[] = [];
  const ids = nodes.map((n) => n.id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const key = pairKey(a, b);
      if (existing.has(key)) continue; // already a hierarchy link (FR-005)
      const cooccur = extraPairs?.get(key);
      if (!areRelated(a, b) && cooccur === undefined) continue;
      out.push({ id: `x-${key}`, source: a, target: b, type: 'cross', weight: cooccur });
      if (out.length >= MAX_CROSS_LINKS) return out; // density cap (FR-010)
    }
  }
  return out;
}

// ─── Persistence ────────────────────────────────────────────────────────────

export interface SavedGraph {
  nodes: {
    id: string;
    label: string;
    depth: number;
    parentId: string | null;
    expanded: boolean;
    selectedAt?: number;
  }[];
  links: { id?: string; source: string; target: string; type?: 'hierarchy' | 'cross' }[];
}

/**
 * Rebuild live graph state from a persisted structure: hierarchy, expansion
 * and selection recency survive a reload instead of flattening every node
 * into a root. Seeds positions (roots on a circle, children near parents) so
 * one reheat settles the layout. Returns null for empty/corrupt input.
 * Cross links are intentionally dropped — they are derived at render time.
 */
export function restoreGraph(
  saved: SavedGraph,
  width: number,
  height: number
): { nodes: GraphNode[]; links: GraphLink[] } | null {
  if (!saved || !Array.isArray(saved.nodes) || saved.nodes.length === 0) return null;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(40, Math.min(width, height) * 0.28);

  const sorted = [...saved.nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
  const roots = sorted.filter((n) => !n.parentId);
  const byId = new Map<string, GraphNode>();
  const childCount = new Map<string, number>();
  const nodes: GraphNode[] = [];

  for (const s of sorted) {
    if (!s?.id || byId.has(s.id)) continue;
    let x: number;
    let y: number;
    const parent = s.parentId ? byId.get(s.parentId) : undefined;
    if (!parent) {
      const i = roots.findIndex((r) => r.id === s.id);
      const angle = ((i < 0 ? nodes.length : i) / Math.max(1, roots.length)) * Math.PI * 2;
      x = cx + Math.cos(angle) * radius;
      y = cy + Math.sin(angle) * radius;
    } else {
      const k = (childCount.get(s.parentId as string) ?? 0) + 1;
      childCount.set(s.parentId as string, k);
      x = (parent.x ?? cx) + Math.cos(k * 2.4) * 36;
      y = (parent.y ?? cy) + Math.sin(k * 2.4) * 36;
    }
    const node: GraphNode = {
      id: s.id,
      label: s.label ?? s.id,
      depth: s.depth ?? 0,
      parentId: s.parentId ?? null,
      expanded: !!s.expanded,
      hasChildren: !isLeaf(s.id),
      selectedAt: s.selectedAt ?? 0,
      x,
      y,
    };
    byId.set(node.id, node);
    nodes.push(node);
  }
  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = (saved.links ?? [])
    .filter((l) => l && l.type !== 'cross' && ids.has(l.source) && ids.has(l.target))
    .map((l) => ({
      id: l.id ?? `${l.source}-${l.target}`,
      source: l.source,
      target: l.target,
      type: 'hierarchy' as const,
    }));

  return { nodes, links };
}

/** Best-effort human label for a slug id (falls back to a title-cased slug). */
function labelFor(id: string): string {
  // If the id appears as a child label anywhere, reuse that label's casing.
  for (const labels of Object.values(KEYWORD_SUGGESTIONS_MAP)) {
    for (const label of labels) {
      if (slugify(label) === id) return label;
    }
  }
  // Fallback: title-case the slug
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Build the default "overview" graph: root nodes (depth 0) plus their direct
 * depth-1 children, already expanded. Roots are seeded on a circle around the
 * panel center; children are seeded near their parent with a small outward
 * offset so the force simulation springs them gently into place.
 *
 * Roots receive higher `selectedAt` than children so the initial news fetch is
 * driven by the root keywords. Respects MAX_LIVE_NODES (roots always included;
 * children are added until the cap is reached).
 */
export function buildOverview(
  roots: { id: string; label: string }[],
  width: number,
  height: number
): { nodes: GraphNode[]; links: GraphLink[] } {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(40, Math.min(width, height) * 0.28);

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const liveIds = new Set<string>();

  // Roots get the highest selectedAt values (most recent → lead the news query).
  // Counting down from roots.length keeps root[0] the most recent.
  const rootNodes: GraphNode[] = roots.map((k, i) => {
    const angle = (i / Math.max(1, roots.length)) * Math.PI * 2;
    const node: GraphNode = {
      id: k.id,
      label: k.label,
      depth: 0,
      parentId: null,
      expanded: false,
      hasChildren: !isLeaf(k.id),
      selectedAt: 1000 + (roots.length - i), // roots above all children
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
    liveIds.add(node.id);
    return node;
  });
  nodes.push(...rootNodes);

  // Add depth-1 children for each root that has them, respecting the cap.
  for (const root of rootNodes) {
    if (!root.hasChildren) continue;
    const children = getChildren(root, liveIds);
    if (children.length === 0) continue;
    root.expanded = true;
    children.forEach((c, ci) => {
      if (nodes.length >= MAX_LIVE_NODES) return;
      const spread = (ci / Math.max(1, children.length)) * Math.PI * 2;
      c.selectedAt = 0; // children below roots in recency until clicked
      c.x = (root.x ?? cx) + Math.cos(spread) * 36;
      c.y = (root.y ?? cy) + Math.sin(spread) * 36;
      liveIds.add(c.id);
      nodes.push(c);
      links.push({ id: `${root.id}-${c.id}`, source: root.id, target: c.id, type: 'hierarchy' });
    });
  }

  return { nodes, links };
}
