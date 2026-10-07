'use client';

import { PONTOS, REGIAO, uv2d, type Lado } from '@/lib/auriculo';

const POINT = '#FFE27A';
const POINT_SELECTED = '#FF3B3B';

type Props = {
  face: 'frente' | 'dorso';
  lado: Lado;
  selected: string | null;
  highlighted: Set<string> | null;
  onSelect: (code: string | null) => void;
};

// Mapa 2D: foto (renderização) da orelha 3D, de frente ou de costas, com
// os pontos por cima. Ponto tracejado = fica numa dobra/face escondida
// nesta vista (ex.: face interna do trago, fundo da escafa).
export default function Ear2D({ face, lado, selected, highlighted, onSelect }: Props) {
  const id = `ear2d-${face}`;
  // centro e raios (em unidades 0–100) do recorte de pele em volta da orelha
  const fade = face === 'frente' ? { cx: lado === 'direita' ? 54.1 : 45.9, cy: 48, r: 39, sy: 1.56 } : { cx: 50, cy: 50, r: 50, sy: 1.1 };
  const points = PONTOS.filter((p) => (p.regiao === 'P' || p.regiao === 'R') === (face === 'dorso'));
  const showLabel = (code: string) => code === selected || (!!highlighted && highlighted.has(code) && highlighted.size <= 30);

  return (
    <figure className="ear2d-view">
      <svg viewBox="0 0 100 100" role="img" aria-label={`Orelha ${lado}, ${face === 'frente' ? 'face lateral' : 'dorso'}`}>
        <defs>
          <radialGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" cx={fade.cx} cy={fade.cy} r={fade.r}
            gradientTransform={`translate(${fade.cx} ${fade.cy}) scale(1 ${fade.sy}) translate(${-fade.cx} ${-fade.cy})`}>
            <stop offset="0.68" stopColor="#fff" />
            <stop offset="0.97" stopColor="#000" />
          </radialGradient>
          <mask id={`${id}-m`}><rect x="0" y="0" width="100" height="100" fill={`url(#${id}-g)`} /></mask>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g mask={`url(#${id}-m)`} transform={lado === 'direita' ? 'translate(100 0) scale(-1 1)' : undefined}>
          <image href={`/auriculo/${face}.webp`} x="0" y="0" width="100" height="100" />
        </g>

        {points.map((p) => {
          const v = uv2d(p, face, lado);
          const on = p.codigo === selected;
          const lit = !highlighted || highlighted.has(p.codigo);
          const color = on ? POINT_SELECTED : highlighted && lit ? REGIAO[p.regiao].cor : POINT;
          const [x, y] = v.uv;
          return (
            <g key={p.codigo} className="holo-point" opacity={lit || on ? 1 : 0.22}
              onClick={() => onSelect(on ? null : p.codigo)}>
              <title>{`${p.codigo} — ${p.nome}${v.visivel ? '' : ' (numa dobra escondida nesta vista)'}`}</title>
              <circle cx={x} cy={y} r={2.2} fill="transparent" />
              {on && <circle className="holo-point-ring" cx={x} cy={y} r={2.4} fill="none" stroke={POINT_SELECTED} strokeWidth={0.45} />}
              {v.visivel ? (
                <circle cx={x} cy={y} r={on ? 1.15 : 0.8} fill={color} stroke="#3a2a10" strokeWidth={0.15} filter={`url(#${id}-glow)`} />
              ) : (
                <circle cx={x} cy={y} r={on ? 1.15 : 0.8} fill="none" stroke={color} strokeWidth={0.35} strokeDasharray="0.6 0.4" />
              )}
              {showLabel(p.codigo) && (
                <text x={x + 1.6} y={y + 0.9} fontSize={on ? 2.8 : 2.2} fontWeight={700} fill={on ? '#fff' : color}
                  stroke="#06121a" strokeWidth={0.5} paintOrder="stroke">
                  {on ? `${p.codigo} · ${p.nome}` : p.nome}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption>{face === 'frente' ? 'FACE LATERAL' : 'DORSO'}</figcaption>
    </figure>
  );
}
