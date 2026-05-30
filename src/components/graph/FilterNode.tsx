import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useStore } from '@/store/useStore';

const FilterNode = ({ id, data }: NodeProps) => {
  const weight = useStore((state) => state.filterWeights[id] || 0.5);
  const setFilterWeight = useStore((state) => state.setFilterWeight);

  return (
    <div className="bg-black/80 border-2 border-neon-purple p-3 rounded-lg min-w-[120px] shadow-[0_0_15px_rgba(188,19,254,0.2)]">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div className="text-[10px] font-mono text-neon-purple uppercase mb-2 tracking-widest">
        {data.label}
      </div>
      
      <div className="flex flex-col gap-1">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={weight}
          onChange={(e) => setFilterWeight(id, parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
        />
        <div className="flex justify-between text-[8px] font-mono text-white/30">
          <span>MIN</span>
          <span className="text-neon-purple font-bold">{(weight * 100).toFixed(0)}%</span>
          <span>MAX</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
};

export default memo(FilterNode);
