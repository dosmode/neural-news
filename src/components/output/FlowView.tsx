'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { area, curveBasis } from 'd3';
import { useStore } from '@/store/useStore';
import { computeTimeRange, formatShortTime, TIME_MACHINE_WINDOW_MS } from '@/utils/timeline';
import { archiveUnion } from '@/utils/archive';
import { computeCoverageSeries, CoverageStream } from '@/utils/coverageSeries';

const STREAM_COLORS = [
  '#00f3ff', // cyan
  '#bc13fe', // purple
  '#39ff14', // green
  '#ffb85c', // amber
  '#ff5577', // pink-red
  '#5c9dff', // blue
  '#f3ff5c', // yellow
];

interface FlowViewProps {
  width: number;
  height: number;
}

/**
 * FLOW — the river of issues. Each active keyword is a stream whose width is
 * its coverage over time (ThemeRiver silhouette layout over the feed + local
 * archive). Hover names a stream; CLICK jumps the time machine to that
 * moment, rewinding the whole app. The one-glance answer to "how did these
 * stories rise and fall against each other?"
 */
export default function FlowView({ width, height }: FlowViewProps) {
  const articles = useStore((s) => s.articles);
  const keywords = useStore((s) => s.keywords);
  const timeMachineAt = useStore((s) => s.timeMachineAt);
  const windowMs = useStore((s) => s.timeMachineWindowMs);
  const setTimeMachineAt = useStore((s) => s.setTimeMachineAt);
  const [hovered, setHovered] = useState<string | null>(null);

  const pool = useMemo(() => archiveUnion(articles), [articles]);
  const range = useMemo(() => computeTimeRange(pool), [pool]);
  const streams = useMemo(
    () => (range ? computeCoverageSeries(pool, keywords, range) : []),
    [pool, keywords, range]
  );

  const PAD_X = 24;
  const PAD_TOP = 64;
  const PAD_BOTTOM = 56; // clear of the time rail
  const plotW = Math.max(0, width - PAD_X * 2);
  const plotH = Math.max(0, height - PAD_TOP - PAD_BOTTOM);

  // ThemeRiver silhouette: stack streams around a wiggling center line.
  const layout = useMemo(() => {
    if (streams.length === 0 || plotW === 0 || plotH === 0) return null;
    const buckets = streams[0].series.length;
    const totals = Array.from({ length: buckets }, (_, b) =>
      streams.reduce((s, st) => s + st.series[b], 0)
    );
    const maxTotal = Math.max(...totals, 1);
    const scaleY = (plotH * 0.9) / maxTotal;
    const x = (b: number) => PAD_X + (b / (buckets - 1)) * plotW;
    const centerY = PAD_TOP + plotH / 2;

    const shapes: { stream: CoverageStream; path: string; color: string; peakBucket: number }[] = [];
    const offsets = new Array(buckets).fill(0);
    streams.forEach((st, i) => {
      const pts: [number, number, number][] = st.series.map((v, b) => {
        const y0 = centerY - (totals[b] * scaleY) / 2 + offsets[b] * scaleY;
        return [x(b), y0, y0 + v * scaleY];
      });
      st.series.forEach((v, b) => {
        offsets[b] += v;
      });
      const gen = area<[number, number, number]>()
        .x((d) => d[0])
        .y0((d) => d[1])
        .y1((d) => d[2])
        .curve(curveBasis);
      const peakBucket = st.series.indexOf(Math.max(...st.series));
      shapes.push({
        stream: st,
        path: gen(pts) ?? '',
        color: STREAM_COLORS[i % STREAM_COLORS.length],
        peakBucket,
      });
    });
    return { shapes, buckets, x, centerY };
  }, [streams, plotW, plotH]);

  const jumpTo = useCallback(
    (clientX: number, rectLeft: number) => {
      if (!range) return;
      const frac = Math.min(1, Math.max(0, (clientX - rectLeft - PAD_X) / Math.max(1, plotW)));
      const t = range.min + frac * (range.max - range.min);
      const win = Math.max(TIME_MACHINE_WINDOW_MS, (range.max - range.min) * 0.15);
      setTimeMachineAt(Math.min(range.max, t + win / 2), win);
    },
    [range, plotW, setTimeMachineAt]
  );

  if (!range || !layout) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <p className="text-white/15 font-mono text-sm">NOT ENOUGH COVERAGE HISTORY YET</p>
      </div>
    );
  }

  // Time-machine window overlay position
  const winEndFrac = timeMachineAt !== null ? (timeMachineAt - range.min) / (range.max - range.min) : null;
  const winStartFrac =
    timeMachineAt !== null ? (timeMachineAt - windowMs - range.min) / (range.max - range.min) : null;

  return (
    <div className="absolute inset-0 z-10">
      <svg
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={(e) => jumpTo(e.clientX, e.currentTarget.getBoundingClientRect().left)}
      >
        {/* streams */}
        {layout.shapes.map(({ stream, path, color }) => {
          const dim = hovered !== null && hovered !== stream.id;
          return (
            <path
              key={stream.id}
              d={path}
              fill={color}
              fillOpacity={dim ? 0.08 : hovered === stream.id ? 0.6 : 0.38}
              stroke={color}
              strokeOpacity={dim ? 0.15 : 0.8}
              strokeWidth={hovered === stream.id ? 1.5 : 0.8}
              onMouseEnter={() => setHovered(stream.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
            />
          );
        })}

        {/* selected time-machine window */}
        {winEndFrac !== null && winStartFrac !== null && (
          <rect
            x={PAD_X + Math.max(0, winStartFrac) * plotW}
            y={PAD_TOP - 8}
            width={Math.max(2, (Math.min(1, winEndFrac) - Math.max(0, winStartFrac)) * plotW)}
            height={plotH + 16}
            fill="#ffb85c"
            fillOpacity={0.08}
            stroke="#ffb85c"
            strokeOpacity={0.5}
            strokeDasharray="4 4"
            pointerEvents="none"
            rx={6}
          />
        )}

        {/* stream labels at their peaks */}
        {layout.shapes.map(({ stream, color, peakBucket }) => {
          if (hovered !== null && hovered !== stream.id) return null;
          const lx = layout.x(peakBucket);
          return (
            <text
              key={`lbl-${stream.id}`}
              x={Math.min(Math.max(lx, PAD_X + 30), width - PAD_X - 30)}
              y={PAD_TOP - 14}
              textAnchor="middle"
              fontSize={hovered === stream.id ? 12 : 9}
              fontWeight={700}
              fill={color}
              stroke="#06060b"
              strokeWidth={3}
              style={{ paintOrder: 'stroke', textTransform: 'uppercase', letterSpacing: '0.08em', pointerEvents: 'none' }}
            >
              {hovered === stream.id ? `${stream.label} · ${Math.round(stream.total)} articles` : ''}
            </text>
          );
        })}
      </svg>

      {/* legend + axis labels */}
      <div className="absolute left-5 right-5 flex justify-between text-[8px] font-mono text-white/30 pointer-events-none" style={{ bottom: PAD_BOTTOM - 14 }}>
        <span>{formatShortTime(range.min)}</span>
        <span className="text-white/20 uppercase tracking-widest">Click a moment to time-travel</span>
        <span>{formatShortTime(range.max)}</span>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pointer-events-none max-w-full">
        {layout.shapes.map(({ stream, color }) => (
          <span key={`lg-${stream.id}`} className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider" style={{ color, opacity: hovered === null || hovered === stream.id ? 0.9 : 0.25 }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {stream.label}
          </span>
        ))}
      </div>
    </div>
  );
}
