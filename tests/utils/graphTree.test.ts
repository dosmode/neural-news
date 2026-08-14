import { describe, it, expect } from 'vitest';
import {
  buildOverview,
  getChildren,
  collectDescendants,
  areRelated,
  computeCrossLinks,
  restoreGraph,
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

  it('relates user-added keywords that share a word token', () => {
    expect(areRelated('stock', 'stock-market')).toBe(true);
    expect(areRelated('south-korea', 'korea-stocks')).toBe(true);
  });

  it('singularizes tokens so stock ↔ bank-stocks connect', () => {
    expect(areRelated('stock', 'bank-stocks')).toBe(true);
  });

  it('relates Korean keywords sharing a token', () => {
    expect(areRelated('주식', '주식-시장')).toBe(true);
  });

  it('does not relate keywords with no shared meaningful token', () => {
    expect(areRelated('south-korea', 'stock-market')).toBe(false);
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

describe('restoreGraph', () => {
  const saved = {
    nodes: [
      { id: 'ai', label: 'AI', depth: 0, parentId: null, expanded: true, selectedAt: 10 },
      { id: 'openai', label: 'OpenAI', depth: 1, parentId: 'ai', expanded: false, selectedAt: 3 },
      { id: 'oil', label: 'Oil', depth: 0, parentId: null, expanded: false, selectedAt: 7 },
    ],
    links: [
      { id: 'ai-openai', source: 'ai', target: 'openai', type: 'hierarchy' as const },
      { id: 'x-ai|oil', source: 'ai', target: 'oil', type: 'cross' as const },
    ],
  };

  it('restores hierarchy, expansion, and selection recency', () => {
    const restored = restoreGraph(saved, 800, 600)!;
    expect(restored.nodes).toHaveLength(3);
    const openai = restored.nodes.find((n) => n.id === 'openai')!;
    expect(openai.depth).toBe(1);
    expect(openai.parentId).toBe('ai');
    expect(restored.nodes.find((n) => n.id === 'ai')!.expanded).toBe(true);
    expect(restored.nodes.find((n) => n.id === 'ai')!.selectedAt).toBe(10);
  });

  it('drops cross links (derived at render time) but keeps hierarchy links', () => {
    const restored = restoreGraph(saved, 800, 600)!;
    expect(restored.links).toHaveLength(1);
    expect(restored.links[0].id).toBe('ai-openai');
  });

  it('seeds every node with coordinates so the simulation can settle', () => {
    const restored = restoreGraph(saved, 800, 600)!;
    for (const n of restored.nodes) {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
    }
  });

  it('returns null for empty or corrupt input', () => {
    expect(restoreGraph({ nodes: [], links: [] }, 800, 600)).toBeNull();
    expect(restoreGraph(null as never, 800, 600)).toBeNull();
  });

  it('drops links whose endpoints are missing and dedupes node ids', () => {
    const restored = restoreGraph(
      {
        nodes: [
          { id: 'a', label: 'A', depth: 0, parentId: null, expanded: false },
          { id: 'a', label: 'A dupe', depth: 0, parentId: null, expanded: false },
        ],
        links: [{ source: 'a', target: 'ghost' }],
      },
      800,
      600
    )!;
    expect(restored.nodes).toHaveLength(1);
    expect(restored.links).toHaveLength(0);
  });
});
