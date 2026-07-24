import { useRef, useEffect, useState, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  Simulation,
  ForceLink,
} from 'd3-force';
import { GraphNode, GraphLink } from '@/utils/graphTree';

interface UseForceSimulationParams {
  width: number;
  height: number;
  nodes: GraphNode[];
  links: GraphLink[];
}

interface UseForceSimulationResult {
  tickVersion: number;
  reheat: () => void;
  setFixed: (id: string, x: number | null, y: number | null) => void;
}

const LINK_DISTANCE = 64;
const CHARGE_STRENGTH = -200;
const COLLIDE_RADIUS = 32;
const COLLIDE_STRENGTH = 0.85;
const CENTER_PULL = 0.04; // gentle forceX/forceY pull toward center
const VELOCITY_DECAY = 0.45; // higher friction → glides to rest, less oscillation

/**
 * Owns a d3-force simulation in a ref and bridges it to React: each tick bumps
 * `tickVersion` so the consuming component re-renders from the (mutated) node
 * x/y. d3 is used for physics only — React+SVG renders the DOM.
 */
export function useForceSimulation({
  width,
  height,
  nodes,
  links,
}: UseForceSimulationParams): UseForceSimulationResult {
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const [tickVersion, setTickVersion] = useState(0);

  // Create the simulation once.
  useEffect(() => {
    const sim = forceSimulation<GraphNode, GraphLink>()
      .velocityDecay(VELOCITY_DECAY)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>()
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
      )
      .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
      .force('collide', forceCollide(COLLIDE_RADIUS).strength(COLLIDE_STRENGTH))
      .on('tick', () => setTickVersion((v) => (v + 1) % 1_000_000));

    simRef.current = sim;

    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, []);

  // Keep the centering forces in sync with the container size. forceCenter keeps
  // the centroid centered; forceX/forceY add a gentle pull so the graph doesn't
  // drift off-panel and settles evenly.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim || width === 0 || height === 0) return;
    sim.force('center', forceCenter(width / 2, height / 2));
    sim.force('x', forceX<GraphNode>(width / 2).strength(CENTER_PULL));
    sim.force('y', forceY<GraphNode>(height / 2).strength(CENTER_PULL));
    sim.alpha(0.3).restart();
  }, [width, height]);

  // Feed the current live nodes/links into the simulation whenever they change.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodes);
    const linkForce = sim.force('link') as ForceLink<GraphNode, GraphLink> | undefined;
    if (linkForce) linkForce.links(links);
    sim.alpha(0.3).restart();
  }, [nodes, links]);

  const reheat = useCallback(() => {
    simRef.current?.alpha(0.3).restart();
  }, []);

  const setFixed = useCallback((id: string, x: number | null, y: number | null) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === id);
    if (!node) return;
    node.fx = x;
    node.fy = y;
  }, []);

  return { tickVersion, reheat, setFixed };
}
