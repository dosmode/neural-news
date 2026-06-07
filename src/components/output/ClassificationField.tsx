'use client';

import React, { useRef, useEffect } from 'react';
import { MappedPoint } from '@/types';
import { sentimentFieldColor } from '@/utils/sentimentField';

interface Props {
  points: MappedPoint[];
  width: number;
  height: number;
  intensity: number; // 0..1, from the Sentiment filter weight
  visible: boolean;
  dimmed: boolean; // true while loading — keep field but reduce opacity
}

/**
 * Canvas heatmap layer rendered behind the article dots. Each article contributes
 * an additive radial gradient of its sentiment color, producing a smooth blended
 * "decision boundary" field like the TensorFlow Playground output.
 */
export default function ClassificationField({
  points,
  width,
  height,
  intensity,
  visible,
  dimmed,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (points.length === 0) return;

    const R = Math.min(width, height) * 0.18;
    const centerAlpha = 0.16 * intensity;

    ctx.globalCompositeOperation = 'lighter';
    for (const p of points) {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      grd.addColorStop(0, sentimentFieldColor(p.sentiment, centerAlpha));
      grd.addColorStop(1, sentimentFieldColor(p.sentiment, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [points, width, height, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
      style={{
        width,
        height,
        filter: 'blur(28px)',
        opacity: visible ? (dimmed ? 0.4 : 0.85) : 0,
      }}
    />
  );
}
