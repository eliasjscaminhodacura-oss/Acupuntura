'use client';

import { Fragment, useState } from 'react';
import dynamic from 'next/dynamic';
import { BODY_H, BODY_W, BREAST_LINES, ORGANS, bodyOutline, pointPositions, type BodyResult, type BodyView } from '@/lib/body-map';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import { shade, type Pt } from '@/lib/radar3d';
import type { Sex } from '@/lib/ficha-types';
import type { Corpo } from './Body3D';
import { organs2d, organsImage, loopsPath } from '@/lib/organs2d';
import { illustrated } from '@/lib/corpo-ilustrado';

// O 3D (three.js) é pesado: só é baixado quando o resultado aparece.
const Body3D = dynamic(() => import('./Body3D'), {
  ssr: false,
  loading: () => <div className="body3d-loading">Carregando o corpo em 3D…</div>,
});

const CYAN = '#5CE1E6';
const POINT = '#FFE27A';
const POINT_SELECTED = '#FF3B3B';

const pts = (list: Pt[]) => list.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');

// Vista ilustrada (atlas: músculos, ossos, vasos e órgãos) com o contorno
// de holograma do corpo masculino ou feminino.
function IllustratedView({ view, body, corpo, selected, onSelect }: {
  view: BodyView;
  body: BodyResult;
  corpo: Corpo;
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const il = illustrated(corpo, view)!;
  const organScore = new Map(body.organs.map((o) => [o.organ, o]));
  const id = `ilus-${view}`;
  const { x, y, w, h } = il.box;

  return (
    <figure className="holo-view">
      <svg viewBox={`${x - 8} ${y - 6} ${w + 16} ${h + 14}`} role="img" aria-label={`Corpo, vista de ${view === 'front' ? 'frente' : 'costas'}`}>
        <defs>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {Array.from({ length: 23 }, (_, i) => (
          <line key={i} x1={x - 8} x2={x + w + 8} y1={i * 20} y2={i * 20} stroke={CYAN} strokeOpacity={0.07} />
        ))}

        <path d={loopsPath(il.outline)} fillRule="evenodd" fill={CYAN} fillOpacity={0.06} />
        <image href={il.img} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />
        <path d={loopsPath(il.outline)} fillRule="evenodd" fill="none" stroke={CYAN} strokeWidth={1.1} strokeOpacity={0.9} filter={`url(#${id}-glow)`} />

        {/* órgãos comprometidos: contorno brilhante e leve tom do elemento */}
        {il.organs.map((o) => {
          const hit = organScore.get(o.organ);
          if (!hit) return null;
          const color = ELEMENT_COLOR[hit.element];
          return (
            <g key={o.organ} filter={`url(#${id}-glow)`} className={hit.intensity > 0.99 ? 'holo-organ-top' : undefined}>
              <title>{`${o.organ}: ${hit.pct}%`}</title>
              <path d={loopsPath(o.loops)} fillRule="evenodd" fill={color} fillOpacity={0.05 + 0.15 * hit.intensity}
                stroke={shade(color, 1.4)} strokeWidth={1.1} strokeLinejoin="round" />
            </g>
          );
        })}

        {body.points.filter((p) => p.def.view === view).map((p) => (
          <g key={p.code} className="holo-point" onClick={() => onSelect(selected === p.code ? null : p.code)}>
            <title>{`${p.code} — ${p.def.region}`}</title>
            {(il.pontos[p.code] ?? []).map((pos, i) => {
              const isSelected = selected === p.code;
              const color = isSelected ? POINT_SELECTED : POINT;
              return (
                <g key={i}>
                  {isSelected && (
                    <circle className="holo-point-ring" cx={pos[0]} cy={pos[1]} r={7} fill="none" stroke={POINT_SELECTED} strokeWidth={1.5} />
                  )}
                  <circle cx={pos[0]} cy={pos[1]} r={isSelected ? 4.2 : 2.6} fill={color} stroke="#3a1a10" strokeWidth={0.5} filter={`url(#${id}-glow)`} />
                  {i === 0 && (
                    <text x={pos[0] + (isSelected ? 8 : 4)} y={pos[1] + 2.5} fontSize={isSelected ? 9 : 7} fontWeight={700} fill={color}
                      stroke="#0a1d29" strokeWidth={2} paintOrder="stroke">
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

function View({ view, body, corpo, selected, onSelect }: {
  view: BodyView;
  body: BodyResult;
  corpo: Corpo;
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const organScore = new Map(body.organs.map((o) => [o.organ, o]));
  const id = `holo-${view}`;
  const realOrgans = organs2d(corpo).filter((o) => o.view === view);
  const img = organsImage(corpo, view);
  const outline = bodyOutline(corpo);

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
          <clipPath id={`${id}-clip`}><polygon points={pts(outline)} /></clipPath>
        </defs>

        {/* grade de fundo */}
        {Array.from({ length: 23 }, (_, i) => (
          <line key={i} x1={-12} x2={BODY_W + 12} y1={i * 20} y2={i * 20} stroke={CYAN} strokeOpacity={0.07} />
        ))}

        <polygon points={pts(outline)} fill={`url(#${id}-body)`} stroke={CYAN} strokeWidth={1.3} filter={`url(#${id}-glow)`} />

        {/* linha dos seios (corpo feminino, de frente) */}
        {corpo === 'feminino' && view === 'front' && BREAST_LINES.map((l, i) => (
          <polyline key={i} points={pts(l)} fill="none" stroke={CYAN} strokeOpacity={0.55} strokeWidth={0.9} strokeLinecap="round" />
        ))}

        {/* linhas de "energia" internas */}
        <g clipPath={`url(#${id}-clip)`} stroke={CYAN} strokeOpacity={0.25} fill="none">
          <line x1={100} y1={view === 'back' ? 66 : 60} x2={100} y2={262} strokeDasharray={view === 'back' ? '3 3' : undefined} />
          <rect className="holo-scan" x={-12} y={0} width={BODY_W + 24} height={6} fill={CYAN} fillOpacity={0.18} stroke="none" />
        </g>

        {/* ilustração realista dos órgãos (gerada a partir do 3D) */}
        {img && (
          <image href={img.src} x={img.x} y={img.y} width={img.w} height={img.h} preserveAspectRatio="none" opacity={0.96} />
        )}

        {/* órgãos com o formato real: com a ilustração, só os comprometidos
            ganham contorno e um leve tom na cor do elemento */}
        {realOrgans.map((o) => {
          const hit = organScore.get(o.organ);
          const color = hit ? ELEMENT_COLOR[hit.element] : CYAN;
          const opacity = img ? (hit ? 0.12 + 0.3 * hit.intensity : 0) : hit ? 0.35 + 0.6 * hit.intensity : 0.1;
          return (
            <g key={o.organ} filter={hit ? `url(#${id}-glow)` : undefined} className={hit && hit.intensity > 0.99 ? 'holo-organ-top' : undefined}>
              <title>{hit ? `${o.organ}: ${hit.pct}%` : o.organ}</title>
              <path d={loopsPath(o.loops)} fillRule="evenodd" fill={color} fillOpacity={opacity}
                stroke={hit ? shade(color, 1.4) : CYAN} strokeOpacity={hit ? 0.95 : img ? 0 : 0.45}
                strokeWidth={img ? 1.1 : 0.7} strokeLinejoin="round" />
            </g>
          );
        })}

        {/* reserva: formas simples, se as silhuetas não existirem */}
        {!realOrgans.length && ORGANS.filter((o) => o.view === view).map((o) => {
          const hit = organScore.get(o.organ);
          const color = hit ? ELEMENT_COLOR[hit.element] : CYAN;
          const opacity = hit ? 0.35 + 0.6 * hit.intensity : 0.12;
          return (
            <g key={o.organ} filter={hit ? `url(#${id}-glow)` : undefined} className={hit && hit.intensity > 0.99 ? 'holo-organ-top' : undefined}>
              <title>{hit ? `${o.organ}: ${hit.pct}%` : o.organ}</title>
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
export default function BodyHologram({ body, sex }: { body: BodyResult; sex: Sex }) {
  const [selected, setSelected] = useState<string | null>(null);
  // corpo pelo sexo do paciente; se não informado, o terapeuta escolhe
  const [escolha, setEscolha] = useState<Corpo>('masculino');
  const corpo: Corpo = sex === 'F' ? 'feminino' : sex === 'M' ? 'masculino' : escolha;
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [no3d, setNo3d] = useState(false);

  return (
    <div>
      <div className="holo-mode">
        {!body.organs.length && (
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Marque os sintomas acima para ver os órgãos e pontos no corpo.</p>
        )}
        {!sex && (
          <div className="body3d-row">
            {(['masculino', 'feminino'] as Corpo[]).map((c) => (
              <button key={c} type="button" className={'body3d-chip' + (corpo === c ? ' on' : '')} aria-pressed={corpo === c} onClick={() => setEscolha(c)}>
                Corpo {c}
              </button>
            ))}
          </div>
        )}
        {!no3d && (
          <button type="button" className="secondary small" onClick={() => setMode((m) => (m === '3d' ? '2d' : '3d'))}>
            {mode === '3d' ? 'Ver em 2D (frente e costas)' : 'Ver em 3D'}
          </button>
        )}
      </div>

      {mode === '3d' && !no3d ? (
        <Body3D key={corpo} corpo={corpo} body={body} selected={selected} onSelect={setSelected} onFail={() => setNo3d(true)} />
      ) : (
        <div className="holo">
          {(['front', 'back'] as const).map((v) => illustrated(corpo, v)
            ? <IllustratedView key={v} view={v} body={body} corpo={corpo} selected={selected} onSelect={setSelected} />
            : <View key={v} view={v} body={body} corpo={corpo} selected={selected} onSelect={setSelected} />)}
        </div>
      )}

      <div className="holo-legend">
        {body.organs.length > 0 && <h4>Órgãos mais comprometidos <small>(% de todos os sinais marcados, como no ciclo dos 5 elementos)</small></h4>}
        {body.organs.map((o, i) => (
          <Fragment key={o.organ}>
            {o.element !== body.organs[i - 1]?.element && (
              <div className="organ-el" style={{ color: ELEMENT_COLOR[o.element] }}>
                {o.element} <span>{body.organs.filter((x) => x.element === o.element).reduce((t, x) => t + x.pct, 0)}%</span>
              </div>
            )}
            <div className="organ-bar">
              <span className="organ-name">{o.organ}</span>
              <span className="bar"><span style={{ width: `${o.pct}%`, background: ELEMENT_COLOR[o.element] }} /></span>
              <span className="organ-pct">{o.pct}%</span>
            </div>
          </Fragment>
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
        {(mode === '2d' || no3d) && illustrated(corpo, 'front') && (
          <p className="ear-credit" style={{ marginTop: 12 }}>
            Ilustração: músculos, ossos, vasos e órgãos do BodyParts3D, © The Database Center for Life Science, licença CC BY 4.0, encaixados no corpo MakeHuman (CC0).{corpo === 'feminino' && ' Útero, trompas e ovários: “Pelvic Organs from MRI”, por audreybyrd (Sketchfab), licença CC BY 4.0.'}
          </p>
        )}
        {mode === '3d' && !no3d && (
          <p className="ear-credit" style={{ marginTop: 12 }}>
            Corpo 3D: MakeHuman (CC0). Órgãos: BodyParts3D, © The Database Center for Life Science, licença CC BY 4.0.{corpo === 'feminino' && ' Útero, trompas e ovários: “Pelvic Organs from MRI”, por audreybyrd (Sketchfab), licença CC BY 4.0.'}
          </p>
        )}
      </div>
    </div>
  );
}
