import { describe, it, expect } from 'vitest';
import {
  buildInitialNodes,
  buildOverview,
  getChildren,
  collectDescendants,
  areRelated,
  computeCrossLinks,
  isLeaf,
  MAX_LIVE_NODES,
  MAX_CROSS_LINKS,
  GraphNode,
  GraphLink,
} from '@/utils/graphTree';

function node(id: string): GraphNode {
  return { id, label: id, depth: 0, parentId: null, expanded: false, hasChildren: false };
}

describe('isLeaf', () => {
  it('returns true for a keyword with no adjacency entry', () => {
    expect(isLeaf('totally-unknown-keyword-xyz')).toBe(true);
  });

  it('returns false for a keyword that has children', () => {
    expect(isLeaf('ai')).toBe(false);
  });
});

describe('buildInitialNodes', () => {
  it('creates depth-0 root nodes with null parent', () => {
    const nodes = buildInitialNodes(['ai', 'bitcoin']);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].depth).toBe(0);
    expect(nodes[0].parentId).toBeNull();
    expect(nodes[0].expanded).toBe(false);
  });

  it('marks hasChildren correctly', () => {
    const nodes = buildInitialNodes(['ai']);
    expect(nodes[0].hasChildren).toBe(true);
  });
});

describe('getChildren', () => {
  const parent: GraphNode = {
    id: 'ai',
    label: 'AI',
    depth: 0,
    parentId: null,
    expanded: false,
    hasChildren: true,
  };

  it('returns child nodes from the adjacency map', () => {
    const children = getChildren(parent, new Set(['ai']));
    expect(children.length).toBeGreaterThan(0);
    expect(children[0].depth).toBe(1);
    expect(children[0].parentId).toBe('ai');
  });

  it('dedups against live node ids', () => {
    const allIds = getChildren(parent, new Set(['ai'])).map((c) => c.id);
    // Mark the first child as already live
    const live = new Set(['ai', allIds[0]]);
    const children = getChildren(parent, live);
    expect(children.map((c) => c.id)).not.toContain(allIds[0]);
  });

  it('returns empty array for a leaf node', () => {
    const leaf: GraphNode = {
      id: 'unknown-xyz',
      label: 'Unknown',
      depth: 1,
      parentId: 'ai',
      expanded: false,
      hasChildren: false,
    };
    expect(getChildren(leaf, new Set(['ai', 'unknown-xyz']))).toHaveLength(0);
  });
});

describe('collectDescendants', () => {
  it('collects the full recursive subtree', () => {
    // a → b → c, a → d
    const links: GraphLink[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-c', source: 'b', target: 'c' },
      { id: 'a-d', source: 'a', target: 'd' },
    ];
    const desc = collectDescendants('a', links);
    expect(desc).toEqual(new Set(['b', 'c', 'd']));
  });

  it('returns empty set for a node with no children', () => {
    const links: GraphLink[] = [{ id: 'a-b', source: 'a', target: 'b' }];
    expect(collectDescendants('b', links).size).toBe(0);
  });

  it('handles object-form source/target (post-tick d3 mutation)', () => {
    const nodeB: GraphNode = { id: 'b', label: 'B', depth: 1, parentId: 'a', expanded: false, hasChildren: false };
    const nodeA: GraphNode = { id: 'a', label: 'A', depth: 0, parentId: null, expanded: true, hasChildren: true };
    const links: GraphLink[] = [{ id: 'a-b', source: nodeA, target: nodeB }];
    expect(collectDescendants('a', links)).toEqual(new Set(['b']));
  });
});

describe('buildOverview', () => {
  const roots = [{ id: 'ai', label: 'AI' }, { id: 'bitcoin', label: 'Bitcoin' }];

  it('includes the root nodes at depth 0', () => {
    const { nodes } = buildOverview(roots, 360, 600);
    const rootNodes = nodes.filter((n) => n.depth === 0);
    expect(rootNodes.map((n) => n.id).sort()).toEqual(['ai', 'bitcoin']);
  });

  it('expands roots one level (depth-1 children, no grandchildren)', () => {
    const { nodes } = buildOverview(roots, 360, 600);
    expect(nodes.some((n) => n.depth === 1)).toBe(true);
    expect(nodes.some((n) => n.depth >= 2)).toBe(false);
  });

  it('wires a link from each parent to each child', () => {
    const { nodes, links } = buildOverview(roots, 360, 600);
    const childNodes = nodes.filter((n) => n.depth === 1);
    childNodes.forEach((child) => {
      expect(links.some((l) => l.source === child.parentId && l.target === child.id)).toBe(true);
    });
  });

  it('marks roots with children as expanded', () => {
    const { nodes } = buildOverview(roots, 360, 600);
    const ai = nodes.find((n) => n.id === 'ai');
    expect(ai?.expanded).toBe(true);
  });

  it('gives roots higher selectedAt than children', () => {
    const { nodes } = buildOverview(roots, 360, 600);
    const minRoot = Math.min(...nodes.filter((n) => n.depth === 0).map((n) => n.selectedAt ?? 0));
    const maxChild = Math.max(...nodes.filter((n) => n.depth === 1).map((n) => n.selectedAt ?? 0));
    expect(minRoot).toBeGreaterThan(maxChild);
  });

  it('never exceeds MAX_LIVE_NODES', () => {
    const manyRoots = Array.from({ length: 18 }, (_, i) => ({ id: `ai`, label: 'AI' }))
      .map((r, i) => ({ id: `root-${i}`, label: `Root ${i}` }));
    const { nodes } = buildOverview(manyRoots, 360, 600);
    expect(nodes.length).toBeLessThanOrEqual(MAX_LIVE_NODES);
  });

  it('handles a leaf root with no children gracefully', () => {
    const { nodes } = buildOverview([{ id: 'unknown-xyz', label: 'Unknown' }], 360, 600);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].expanded).toBe(false);
  });

  it('tags overview links as hierarchy', () => {
    const { links } = buildOverview([{ id: 'ai', label: 'AI' }], 360, 600);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((l) => l.type === 'hierarchy')).toBe(true);
  });
});

describe('areRelated', () => {
  it('is true when one keyword lists the other as a child', () => {
    // KEYWORD_SUGGESTIONS_MAP['ai'] includes 'Nvidia'
    expect(areRelated('ai', 'nvidia')).toBe(true);
  });

  it('is symmetric (bidirectional union)', () => {
    expect(areRelated('nvidia', 'ai')).toBe(true);
  });

  it('is false for unrelated keywords', () => {
    expect(areRelated('ai', 'bitcoin')).toBe(false);
  });

  it('is false for self', () => {
    expect(areRelated('ai', 'ai')).toBe(false);
  });
});

describe('computeCrossLinks', () => {
  it('links related non-hierarchy node pairs', () => {
    const links = computeCrossLinks([node('ai'), node('nvidia')], []);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('cross');
  });

  it('does not link unrelated node pairs', () => {
    const links = computeCrossLinks([node('ai'), node('bitcoin')], []);
    expect(links).toHaveLength(0);
  });

  it('dedups against an existing hierarchy link for the same pair', () => {
    const hierarchy: GraphLink[] = [{ id: 'ai-nvidia', source: 'ai', target: 'nvidia', type: 'hierarchy' }];
    const links = computeCrossLinks([node('ai'), node('nvidia')], hierarchy);
    expect(links).toHaveLength(0);
  });

  it('produces at most one cross link per node pair', () => {
    const links = computeCrossLinks([node('ai'), node('nvidia'), node('openai')], []);
    const keys = new Set(links.map((l) => l.id));
    expect(keys.size).toBe(links.length);
  });

  it('never exceeds MAX_CROSS_LINKS', () => {
    const many = Array.from({ length: 20 }, (_, i) => node(`k${i}`));
    const links = computeCrossLinks(many, []);
    expect(links.length).toBeLessThanOrEqual(MAX_CROSS_LINKS);
  });

  it('handles hierarchy links whose endpoints are objects (post-tick d3)', () => {
    const ai = node('ai');
    const nvidia = node('nvidia');
    const hierarchy: GraphLink[] = [{ id: 'ai-nvidia', source: ai, target: nvidia, type: 'hierarchy' }];
    const links = computeCrossLinks([ai, nvidia], hierarchy);
    expect(links).toHaveLength(0);
  });
});
