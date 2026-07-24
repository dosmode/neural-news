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
 * Build the initial root node(s) for the graph from the active keyword ids.
 * Root nodes have depth 0 and no parent.
 */
export function buildInitialNodes(activeKeywordIds: string[]): GraphNode[] {
  return activeKeywordIds.map((id) => ({
    id,
    label: labelFor(id),
    depth: 0,
    parentId: null,
    expanded: false,
    hasChildren: !isLeaf(id),
  }));
}

/**
 * Return the child nodes for a given parent, derived from the adjacency map,
 * excluding any ids already present in the live graph (dedup).
 */
export function getChildren(parent: GraphNode, liveNodeIds: Set<string>): GraphNode[] {
  const childLabels = KEYWORD_SUGGESTIONS_MAP[parent.id] ?? [];
  const result: GraphNode[] = [];
  for (const label of childLabels) {
    const id = slugify(label);
    if (liveNodeIds.has(id)) continue; // already on the graph
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

/**
 * Whether two keyword ids are related per the adjacency map (bidirectional
 * union): true if either keyword lists the other as a child. False for self.
 */
export function areRelated(idA: string, idB: string): boolean {
  if (idA === idB) return false;
  const aKids = KEYWORD_SUGGESTIONS_MAP[idA] ?? [];
  if (aKids.some((label) => slugify(label) === idB)) return true;
  const bKids = KEYWORD_SUGGESTIONS_MAP[idB] ?? [];
  return bKids.some((label) => slugify(label) === idA);
}

/** Unordered pair key so {a,b} and {b,a} collapse to one. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Cross-links among the live nodes: a line between any two related nodes that
 * aren't already joined by a hierarchy link. Deduped by unordered pair and
 * capped at MAX_CROSS_LINKS for visual density.
 */
export function computeCrossLinks(
  nodes: GraphNode[],
  hierarchyLinks: GraphLink[]
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
      if (!areRelated(a, b)) continue;
      out.push({ id: `x-${key}`, source: a, target: b, type: 'cross' });
      if (out.length >= MAX_CROSS_LINKS) return out; // density cap (FR-010)
    }
  }
  return out;
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
