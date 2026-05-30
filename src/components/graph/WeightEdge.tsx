import React from 'react';
import { getBezierPath, EdgeProps } from 'reactflow';
import { useStore } from '@/store/useStore';

export default function WeightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive = useStore((state) => state.activeKeywords.has(source));
  const weight = useStore((state) => state.filterWeights[target] || 0.5);

  const strokeWidth = isActive ? 1 + weight * 5 : 0.5;
  const opacity = isActive ? 0.3 + weight * 0.7 : 0.1;
  const color = isActive ? '#00f3ff' : '#ffffff';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth,
          stroke: color,
          opacity,
          transition: 'stroke-width 0.3s, opacity 0.3s',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
}
