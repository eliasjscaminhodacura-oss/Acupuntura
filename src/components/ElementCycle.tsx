'use client';

import { buildCycle5 } from '@/lib/cycle5';
import { shade, type Pt } from '@/lib/radar3d';

type Props = {
  scores: Record<string, number>;
};

const W = 440;
const H = 430;
const SHENG_COLOR = '#3E6259';
const KE_COLOR = '#A63D2F';

const pts = (list: Pt[]) => list.map((p) => p.join(',')).join(' ');

// Ciclo dos 5 Elementos (Geração/Sheng e Controle/Ke). Os círculos crescem
// com animação conforme os sintomas são marcados; o elemento mais
// comprometido pulsa.
export default function ElementCycle({ scores }: Props) {
  const g = buildCycle5(scores, { cx: W / 2, cy: 196, radius: 128, rMin: 30, rMax: 50, head: 9, labelGap: 10 });
  const topValue = g.top?.value ?? 0;
  const leaders = g.nodes.filter((n) => topValue > 0 && n.value === topValue);
  const others = [...g.nodes].filter((n) => !leaders.includes(n)).sort((a, b) => b.value - a.value);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W + 40, height: 'auto' }}
        role="img"
        aria-label="Ciclo dos 5 Elementos"
      >
        <defs>
          {g.nodes.map((n) => (
            <radialGradient key={n.el} id={`node-${n.el}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={shade(n.color, 1.35)} />
              <stop offset="100%" stopColor={shade(n.color, 0.85)} />
            </radialGradient>
          ))}
        </defs>

        {/* Controle (Ke): estrela tracejada */}
        {g.ke.map((a, i) => (
          <g key={`ke-${i}`} opacity={0.55}>
            <polyline points={pts(a.pts)} fill="none" stroke={KE_COLOR} strokeWidth={1.4} strokeDasharray="5 4" />
            <polygon points={pts(a.head)} fill={KE_COLOR} />
          </g>
        ))}

        {/* Geração (Sheng): arcos pelo contorno */}
        {g.sheng.map((a, i) => (
          <g key={`sheng-${i}`}>
            <polyline points={pts(a.pts)} fill="none" stroke={SHENG_COLOR} strokeWidth={2.2} />
            <polygon points={pts(a.head)} fill={SHENG_COLOR} />
          </g>
        ))}

        {g.nodes.map((n) => {
          const leader = leaders.includes(n);
          return (
            <g key={n.el}>
              {leader && (
                <circle className="cycle-pulse" cx={n.at[0]} cy={n.at[1]} r={n.r + 7} fill="none" stroke={n.color} strokeWidth={3} />
              )}
              <circle
                cx={n.at[0]}
                cy={n.at[1]}
                r={n.r}
                fill={`url(#node-${n.el})`}
                stroke="#fff"
                strokeWidth={2.5}
                style={{ transition: 'r 0.6s ease' }}
              />
              <text x={n.at[0]} y={n.at[1] - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
                {n.el}
              </text>
              <text x={n.at[0]} y={n.at[1] + 12} textAnchor="middle" fontSize={11.5} fill="#fff">
                {n.value} · {n.pct}%
              </text>
              <text
                x={n.at[0]}
                y={n.at[1] + n.r + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ink)"
                stroke="var(--panel)"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {n.organ} ({n.alma})
              </text>
            </g>
          );
        })}

        <g fontSize={11} fill="var(--muted)">
          <line x1={14} y1={H - 30} x2={44} y2={H - 30} stroke={SHENG_COLOR} strokeWidth={2.2} />
          <text x={50} y={H - 26}>Geração (Sheng): um elemento nutre o seguinte</text>
          <line x1={14} y1={H - 12} x2={44} y2={H - 12} stroke={KE_COLOR} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.7} />
          <text x={50} y={H - 8}>Controle (Ke): um elemento freia o outro</text>
        </g>
      </svg>

      <div className="cycle-summary">
        {leaders.length === 0 ? (
          <p>Marque os sintomas acima para ver qual elemento está mais comprometido.</p>
        ) : (
          <>
            <p>
              {leaders.length === 1 ? 'Elemento mais comprometido: ' : 'Elementos mais comprometidos: '}
              {leaders.map((n, i) => (
                <span key={n.el}>
                  {i > 0 && (i === leaders.length - 1 ? ' e ' : ', ')}
                  <strong style={{ color: n.color }}>{n.el}</strong> ({n.organ}, alma {n.alma})
                </span>
              ))}{' '}
              — {leaders[0].pct}% dos sinais assinalados{leaders.length > 1 ? ' cada' : ''}.
            </p>
            <div className="cycle-chips">
              {others.map((n) => (
                <span key={n.el} className="cycle-chip" style={{ borderColor: n.color }}>
                  <span className="dot" style={{ background: n.color }} />
                  {n.el} {n.pct}%
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
