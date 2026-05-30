'use client';

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import KeywordNode from './KeywordNode';
import FilterNode from './FilterNode';
import WeightEdge from './WeightEdge';

const initialNodes: Node[] = [
  // Input Layer
  { id: 'nvda', type: 'keyword', position: { x: 50, y: 50 }, data: { label: 'NVDA' } },
  { id: 'tsmc', type: 'keyword', position: { x: 50, y: 120 }, data: { label: 'TSMC' } },
  { id: 'ai-trend', type: 'keyword', position: { x: 50, y: 190 }, data: { label: 'AI Trend' } },
  { id: 'fed-rate', type: 'keyword', position: { x: 50, y: 260 }, data: { label: 'Fed Rate' } },
  { id: 'us-china', type: 'keyword', position: { x: 50, y: 330 }, data: { label: 'US-China' } },

  // Hidden Layer
  { id: 'sentiment', type: 'filter', position: { x: 300, y: 100 }, data: { label: 'Sentiment' } },
  { id: 'type', type: 'filter', position: { x: 300, y: 220 }, data: { label: 'Article Type' } },
  { id: 'market', type: 'filter', position: { x: 300, y: 340 }, data: { label: 'Market Context' } },
];

const initialEdges: Edge[] = [];
// Fully connect layers
['nvda', 'tsmc', 'ai-trend', 'fed-rate', 'us-china'].forEach(kw => {
  ['sentiment', 'type', 'market'].forEach(filter => {
    initialEdges.push({
      id: `e-${kw}-${filter}`,
      source: kw,
      target: filter,
      type: 'weight',
      animated: false,
    });
  });
});

export default function NetworkGraph() {
  const nodeTypes = useMemo(() => ({
    keyword: KeywordNode,
    filter: FilterNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    weight: WeightEdge,
  }), []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'black' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#111" gap={20} />
          <Controls showInteractive={false} className="bg-white/5 border-white/10 fill-white" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
