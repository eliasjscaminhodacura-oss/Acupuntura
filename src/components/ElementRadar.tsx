'use client';

import { buildRadar3D, RADAR_BRICK, RADAR_FLOOR, RADAR_GRID, RADAR_TOP, shade, type Pt } from '@/lib/radar3d';

type Props = {
  scores: Record<string, number>;
};

const W = 380;
const H = 260;

const pts = (list: Pt[]) => list.map((p) => p.join(',')).join(' ');

// Gráfico 3D dos 5 elementos (mesma geometria usada no PDF).
export default function ElementRadar({ scores }: Props) {
  const g = buildRadar3D(scores, { cx: W / 2, cy: 158, radius: 110, maxHeight: 62, labelGap: 18 });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: W + 60, height: 'auto' }}
      role="img"
      aria-label="Gráfico 3D dos 5 elementos"
    >
      <defs>
        <linearGradient id="radar-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(RADAR_TOP, 1.25)} />
          <stop offset="100%" stopColor={RADAR_TOP} />
        </linearGradient>
        {g.vertices.map((v) => (
          <radialGradient key={v.el} id={`sphere-${v.el}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={shade(v.color, 1.6)} />
            <stop offset="100%" stopColor={shade(v.color, 0.75)} />
          </radialGradient>
        ))}
      </defs>

      <polygon points={pts(g.floor)} fill={RADAR_FLOOR} stroke={RADAR_GRID} />
      {g.rings.map((ring, i) => (
        <polygon key={i} points={pts(ring)} fill="none" stroke={RADAR_GRID} strokeWidth={1} />
      ))}
      {g.spokes.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={RADAR_GRID} strokeWidth={1} />
      ))}

      {g.walls.map((w, i) => (
        <polygon key={i} points={pts(w.pts)} fill={w.color} stroke={shade(RADAR_BRICK, 0.7)} strokeWidth={0.6} />
      ))}
      <polygon points={pts(g.top)} fill="url(#radar-top)" stroke={RADAR_BRICK} strokeWidth={1.8} strokeLinejoin="round" />

      {g.pillars.map((p, i) => (
        <line
          key={i}
          x1={p.floor[0]}
          y1={p.floor[1]}
          x2={p.top[0]}
          y2={p.top[1]}
          stroke={shade(RADAR_BRICK, 0.55)}
          strokeWidth={0.8}
        />
      ))}
      {g.vertices.map((v) => (
        <circle key={v.el} cx={v.at[0]} cy={v.at[1]} r={6} fill={`url(#sphere-${v.el})`} />
      ))}

      {g.labels.map((l) => (
        <text
          key={l.text}
          x={l.at[0]}
          y={l.at[1]}
          fontSize={13}
          fontWeight={700}
          fill={l.color}
          dominantBaseline="middle"
          textAnchor={l.align === 'left' ? 'start' : l.align === 'right' ? 'end' : 'middle'}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
