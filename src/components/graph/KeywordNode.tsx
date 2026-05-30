import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useStore } from '@/store/useStore';

const KeywordNode = ({ id, data }: NodeProps) => {
  const toggleKeyword = useStore((state) => state.toggleKeyword);
  const isActive = useStore((state) => state.activeKeywords.has(id));

  return (
    <div
      onClick={() => toggleKeyword(id)}
      className={`
        px-4 py-2 rounded-full border-2 transition-all duration-300 cursor-pointer text-xs font-bold uppercase tracking-tighter
        ${isActive 
          ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)] animate-pulse' 
          : 'bg-black border-white/20 text-white/40 hover:border-white/40'
        }
      `}
    >
      <Handle type="source" position={Position.Right} className="opacity-0" />
      {data.label}
    </div>
  );
};

export default memo(KeywordNode);
