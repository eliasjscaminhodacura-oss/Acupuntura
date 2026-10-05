'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BODY_H, BODY_OUTLINE, BODY_W, ORGANS, pointPositions, type BodyResult, type BodyView } from '@/lib/body-map';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import { shade, type Pt } from '@/lib/radar3d';

// O 3D (three.js) é pesado: só é baixado quando o resultado aparece.
const Body3D = dynamic(() => import('./Body3D'), {
  ssr: false,
  loading: () => <div className="body3d-loading">Carregando o corpo em 3D…</div>,
});

const CYAN = '#5CE1E6';
const POINT = '#FFE27A';
const POINT_SELECTED = '#FF3B3B';

const pts = (list: Pt[]) => list.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');

function View({ view, body, selected, onSelect }: {
  view: BodyView;
  body: BodyResult;
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const organScore = new Map(body.organs.map((o) => [o.organ, o]));
  const id = `holo-${view}`;

  return (
    <figure className="holo-view">
      <svg viewBox={`-12 -6 ${BODY_W + 24} ${BODY_H + 14}`} role="img" aria-label={`Corpo, vista de ${view === 'front' ? 'frente' : 'costas'}`}>
        <defs>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.16" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.04" />
          </linearGradient>
          <clipPath id={`${id}-clip`}><polygon points={pts(BODY_OUTLINE)} /></clipPath>
        </defs>

        {/* grade de fundo */}
        {Array.from({ length: 23 }, (_, i) => (
          <line key={i} x1={-12} x2={BODY_W + 12} y1={i * 20} y2={i * 20} stroke={CYAN} strokeOpacity={0.07} />
        ))}

        <polygon points={pts(BODY_OUTLINE)} fill={`url(#${id}-body)`} stroke={CYAN} strokeWidth={1.3} filter={`url(#${id}-glow)`} />

        {/* linhas de "energia" internas */}
        <g clipPath={`url(#${id}-clip)`} stroke={CYAN} strokeOpacity={0.25} fill="none">
          <line x1={100} y1={view === 'back' ? 66 : 60} x2={100} y2={262} strokeDasharray={view === 'back' ? '3 3' : undefined} />
          <rect className="holo-scan" x={-12} y={0} width={BODY_W + 24} height={6} fill={CYAN} fillOpacity={0.18} stroke="none" />
        </g>

        {ORGANS.filter((o) => o.view === view).map((o) => {
          const hit = organScore.get(o.organ);
          const color = hit ? ELEMENT_COLOR[hit.element] : CYAN;
          const opacity = hit ? 0.35 + 0.6 * hit.intensity : 0.12;
          return (
            <g key={o.organ} filter={hit ? `url(#${id}-glow)` : undefined} className={hit && hit.intensity > 0.99 ? 'holo-organ-top' : undefined}>
              <title>{hit ? `${o.organ}: ${Math.round(hit.intensity * 100)}%` : o.organ}</title>
              {o.shapes.map((s, i) =>
                s.kind === 'ellipse' ? (
                  <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={color} fillOpacity={opacity}
                    stroke={hit ? shade(color, 1.4) : CYAN} strokeOpacity={hit ? 0.95 : 0.35} strokeWidth={0.8} />
                ) : (
                  <polyline key={i} points={pts(s.pts)} fill="none" stroke={color} strokeOpacity={hit ? opacity + 0.1 : 0.25}
                    strokeWidth={s.width} strokeLinejoin="round" strokeLinecap="round" />
                )
              )}
            </g>
          );
        })}

        {body.points.filter((p) => p.def.view === view).map((p) => (
          <g key={p.code} className="holo-point" onClick={() => onSelect(selected === p.code ? null : p.code)}>
            <title>{`${p.code} — ${p.def.region}`}</title>
            {pointPositions(p.def).map((pos, i) => {
              const isSelected = selected === p.code;
              const color = isSelected ? POINT_SELECTED : POINT;
              return (
                <g key={i}>
                  {isSelected && (
                    <circle className="holo-point-ring" cx={pos[0]} cy={pos[1]} r={7} fill="none" stroke={POINT_SELECTED} strokeWidth={1.5} />
                  )}
                  <circle cx={pos[0]} cy={pos[1]} r={isSelected ? 4.2 : 2.6} fill={color} filter={`url(#${id}-glow)`} />
                  {pos[0] >= 100 && (
                    <text x={pos[0] + (isSelected ? 8 : 4)} y={pos[1] + 2.5} fontSize={isSelected ? 9 : 7} fontWeight={700} fill={color}>
                      {p.code}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <figcaption>{view === 'front' ? 'FRENTE' : 'COSTAS'}</figcaption>
    </figure>
  );
}

// "Holograma" do corpo: órgãos comprometidos acendem na cor do elemento e
// os pontos sugeridos pelas síndromes identificadas aparecem marcados.
// Por padrão em 3D; o mapa 2D (frente e costas) fica como alternativa e é
// usado sozinho se o aparelho não suportar 3D.
export default function BodyHologram({ body }: { body: BodyResult }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [no3d, setNo3d] = useState(false);

  return (
    <div>
      <div className="holo-mode">
        {!body.organs.length && (
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Marque os sintomas acima para ver os órgãos e pontos no corpo.</p>
        )}
        {!no3d && (
          <button type="button" className="secondary small" onClick={() => setMode((m) => (m === '3d' ? '2d' : '3d'))}>
            {mode === '3d' ? 'Ver em 2D (frente e costas)' : 'Ver em 3D'}
          </button>
        )}
      </div>

      {mode === '3d' && !no3d ? (
        <Body3D body={body} selected={selected} onSelect={setSelected} onFail={() => setNo3d(true)} />
      ) : (
        <div className="holo">
          <View view="front" body={body} selected={selected} onSelect={setSelected} />
          <View view="back" body={body} selected={selected} onSelect={setSelected} />
        </div>
      )}

      <div className="holo-legend">
        {body.organs.length > 0 && <h4>Órgãos mais comprometidos</h4>}
        {body.organs.map((o) => (
          <div key={o.organ} className="organ-bar">
            <span className="organ-name">{o.organ}</span>
            <span className="bar"><span style={{ width: `${Math.round(o.intensity * 100)}%`, background: ELEMENT_COLOR[o.element] }} /></span>
            <span className="organ-pct">{Math.round(o.intensity * 100)}%</span>
          </div>
        ))}

        {body.organs.length > 0 && body.points.length > 0 && (
          <>
            <h4>Pontos sugeridos <small>(toque num ponto para destacá-lo · localização ilustrativa)</small></h4>
            <ul className="point-list">
              {body.points.map((p) => (
                <li key={p.code} className={selected === p.code ? 'active' : undefined}
                  onClick={() => setSelected(selected === p.code ? null : p.code)}>
                  <strong>{p.code}</strong> — {p.def.region}
                  <div className="point-syn">{p.syndromes.join(' · ')}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
