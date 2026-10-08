import type { Elemento, Zona } from '@/lib/facial';

// Rostos desenhados (SVG próprio, sem fotos): um para cada tipo dos 5
// Elementos, com os traços marcantes de cada um, e um rosto neutro para os
// mapas das áreas do rosto. Quadro 200 x 240.

type Params = {
  outline: string;
  hair: string;
  curls?: boolean;
  hairColor: string;
  skin: string;
  shade: string;
  eyeY: number;
  eyeDX: number;
  eyeRX: number;
  eyeRY: number;
  brow: 'reto' | 'arco' | 'subindo' | 'suave';
  browT: number;
  noseLen: number;
  noseW: number;
  mouthY: number;
  mouthW: number;
  lipT: number;
  earX: number;
  earH: number;
  earW: number;
  blush?: string;
  olheiras?: boolean;
  dimples?: boolean;
  cheekbones?: boolean;
};

const P: Record<Elemento | 'neutro', Params> = {
  Madeira: {
    outline: 'M100 30 C130 30 150 40 152 70 L152 160 C152 196 130 220 100 222 C70 220 48 196 48 160 L48 70 C50 40 70 30 100 30 Z',
    hair: 'M44 92 C38 28 70 8 100 8 C130 8 162 28 156 92 C152 58 134 42 100 44 C66 42 48 58 44 92 Z',
    hairColor: '#3b3326', skin: '#e3d6b4', shade: '#c7b88f',
    eyeY: 112, eyeDX: 25, eyeRX: 12, eyeRY: 4.5, brow: 'subindo', browT: 3.2,
    noseLen: 48, noseW: 13, mouthY: 184, mouthW: 32, lipT: 3.5,
    earX: 52, earH: 34, earW: 11,
  },
  Fogo: {
    outline: 'M100 36 C124 36 146 50 156 84 C162 110 156 140 140 170 C126 196 112 214 100 218 C88 214 74 196 60 170 C44 140 38 110 44 84 C54 50 76 36 100 36 Z',
    hair: 'M44 88 C44 40 72 24 100 24 C128 24 156 40 156 88 C148 60 128 48 100 49 C72 48 52 60 44 88 Z',
    curls: true,
    hairColor: '#7a3b22', skin: '#efc6ae', shade: '#d9a68c',
    eyeY: 114, eyeDX: 26, eyeRX: 11, eyeRY: 6.5, brow: 'arco', browT: 2,
    noseLen: 36, noseW: 12, mouthY: 168, mouthW: 30, lipT: 4,
    earX: 57, earH: 26, earW: 9, blush: '#e0705a', dimples: true,
  },
  Terra: {
    outline: 'M100 36 C140 36 166 66 166 118 C166 172 136 206 100 208 C64 206 34 172 34 118 C34 66 60 36 100 36 Z',
    hair: 'M32 104 C28 40 64 20 100 20 C136 20 172 40 168 104 C160 64 136 50 100 52 C64 50 40 64 32 104 Z',
    hairColor: '#4a3a24', skin: '#ecd09a', shade: '#d2b072',
    eyeY: 118, eyeDX: 28, eyeRX: 11, eyeRY: 6, brow: 'suave', browT: 2.8,
    noseLen: 38, noseW: 21, mouthY: 172, mouthW: 48, lipT: 8,
    earX: 66, earH: 32, earW: 12,
  },
  Metal: {
    outline: 'M100 36 C132 36 152 46 154 72 L156 150 C156 180 146 200 124 208 L100 212 L76 208 C54 200 44 180 44 150 L46 72 C48 46 68 36 100 36 Z',
    hair: 'M42 90 C40 36 70 20 100 20 C132 20 160 36 158 90 C152 60 140 46 118 46 L70 50 C56 54 46 66 42 90 Z',
    hairColor: '#2e2c2a', skin: '#f1e5d8', shade: '#dac9b8',
    eyeY: 114, eyeDX: 25, eyeRX: 12, eyeRY: 5, brow: 'reto', browT: 3.6,
    noseLen: 40, noseW: 14, mouthY: 174, mouthW: 36, lipT: 4.5,
    earX: 55, earH: 30, earW: 10, cheekbones: true,
  },
  Água: {
    outline: 'M100 28 C145 28 168 55 166 100 C165 135 160 165 145 188 C130 206 115 212 100 212 C85 212 70 206 55 188 C40 165 35 135 34 100 C32 55 55 28 100 28 Z',
    hair: 'M28 128 C18 40 58 10 100 10 C142 10 182 40 172 128 C166 74 140 44 100 46 C60 44 34 74 28 128 Z',
    hairColor: '#2a2422', skin: '#d5bfae', shade: '#b39a87',
    eyeY: 114, eyeDX: 27, eyeRX: 12, eyeRY: 6, brow: 'suave', browT: 3,
    noseLen: 40, noseW: 18, mouthY: 172, mouthW: 40, lipT: 6,
    earX: 66, earH: 42, earW: 14, olheiras: true,
  },
  neutro: {
    outline: 'M100 34 C132 34 152 46 154 76 C157 112 154 150 144 176 C132 202 116 212 100 212 C84 212 68 202 56 176 C46 150 43 112 46 76 C48 46 68 34 100 34 Z',
    hair: 'M42 90 C40 36 70 18 100 18 C130 18 160 36 158 90 C152 60 132 46 100 47 C68 46 48 60 42 90 Z',
    hairColor: '#5b5047', skin: '#efe0cf', shade: '#d8c4ae',
    eyeY: 114, eyeDX: 25, eyeRX: 11, eyeRY: 5, brow: 'suave', browT: 2.6,
    noseLen: 40, noseW: 15, mouthY: 174, mouthW: 34, lipT: 4.5,
    earX: 56, earH: 30, earW: 10,
  },
};

function brow(cx: number, y: number, side: -1 | 1, shape: Params['brow']) {
  const w = 15;
  const x0 = cx - w * side; // perto do nariz
  const x1 = cx + w * side; // para fora
  switch (shape) {
    case 'reto': return `M${x0} ${y} L${x1} ${y - 1}`;
    case 'arco': return `M${x0} ${y + 1} Q${cx} ${y - 8} ${x1} ${y + 2}`;
    case 'subindo': return `M${x0} ${y + 2} Q${cx + 4 * side} ${y - 3} ${x1} ${y - 6}`;
    default: return `M${x0} ${y + 1} Q${cx} ${y - 4} ${x1} ${y + 2}`;
  }
}

// Formas das zonas do mapa (no rosto neutro).
type Forma = { cx: number; cy: number; rx: number; ry: number };
const ZONAS: Record<string, Forma[]> = {
  testa: [{ cx: 100, cy: 72, rx: 36, ry: 15 }],
  nariz: [{ cx: 100, cy: 136, rx: 9, ry: 20 }],
  'bochecha-esq': [{ cx: 132, cy: 150, rx: 15, ry: 13 }],
  'bochecha-dir': [{ cx: 68, cy: 150, rx: 15, ry: 13 }],
  queixo: [{ cx: 100, cy: 199, rx: 17, ry: 9 }],
  'ls-testa': [{ cx: 100, cy: 64, rx: 28, ry: 9 }],
  'ls-glabela-alta': [{ cx: 100, cy: 86, rx: 6, ry: 6 }],
  'ls-yintang': [{ cx: 100, cy: 101, rx: 6, ry: 5.5 }],
  'ls-raiz-nariz': [{ cx: 100, cy: 116, rx: 5, ry: 5 }],
  'ls-dorso-nariz': [{ cx: 100, cy: 131, rx: 4.5, ry: 6 }],
  'ls-lado-dorso': [{ cx: 92, cy: 131, rx: 3, ry: 5 }, { cx: 108, cy: 131, rx: 3, ry: 5 }],
  'ls-ponta-nariz': [{ cx: 100, cy: 150, rx: 6, ry: 5 }],
  'ls-asas-nariz': [{ cx: 89, cy: 154, rx: 4, ry: 4 }, { cx: 111, cy: 154, rx: 4, ry: 4 }],
  'ls-bochecha-interna': [{ cx: 80, cy: 138, rx: 6, ry: 6 }, { cx: 120, cy: 138, rx: 6, ry: 6 }],
  'ls-bochecha-centro': [{ cx: 69, cy: 152, rx: 7, ry: 7 }, { cx: 131, cy: 152, rx: 7, ry: 7 }],
  'ls-bochecha-externa': [{ cx: 56, cy: 140, rx: 5, ry: 8 }, { cx: 144, cy: 140, rx: 5, ry: 8 }],
  'ls-filtro': [{ cx: 100, cy: 164, rx: 5, ry: 5 }],
};

type Props = {
  tipo: Elemento | 'neutro';
  zonas?: Zona[];
  selecionada?: string | null;
  onZona?: (id: string) => void;
  cores?: Record<string, string>; // cor de cada elemento
  titulo?: string;
};

export default function FaceIllustration({ tipo, zonas, selecionada, onZona, cores, titulo }: Props) {
  const p = P[tipo];
  const tipY = p.eyeY + p.noseLen;
  const id = `face-${tipo}`;
  const eyes = ([-1, 1] as const).map((s) => {
    const cx = 100 + s * p.eyeDX;
    return (
      <g key={s}>
        {p.olheiras && <ellipse cx={cx} cy={p.eyeY + p.eyeRY + 4} rx={p.eyeRX} ry={4} fill="#3b2a22" opacity={0.35} />}
        <path d={`M${cx - p.eyeRX} ${p.eyeY} Q${cx} ${p.eyeY - p.eyeRY * 2} ${cx + p.eyeRX} ${p.eyeY} Q${cx} ${p.eyeY + p.eyeRY * 2} ${cx - p.eyeRX} ${p.eyeY} Z`} fill="#fbf8f2" stroke="#3a2e26" strokeWidth={1.2} />
        <circle cx={cx} cy={p.eyeY} r={p.eyeRY * 0.95} fill="#5a3f2b" />
        <circle cx={cx} cy={p.eyeY} r={p.eyeRY * 0.45} fill="#1a1411" />
        <circle cx={cx + 1.4} cy={p.eyeY - 1.4} r={1} fill="#fff" />
        <path d={brow(cx, p.eyeY - 14, s, p.brow)} stroke={p.hairColor} strokeWidth={p.browT} strokeLinecap="round" fill="none" />
      </g>
    );
  });

  return (
    <svg viewBox="0 0 200 240" className="face-svg" role="img" aria-label={titulo ?? `Rosto do tipo ${tipo}`}>
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={p.skin} />
          <stop offset="100%" stopColor={p.shade} />
        </radialGradient>
      </defs>
      {/* pescoço e orelhas (atrás do rosto) */}
      <path d={`M78 190 L78 240 L122 240 L122 190 Z`} fill={p.shade} />
      {([-1, 1] as const).map((s) => (
        <g key={s}>
          <ellipse cx={100 + s * p.earX} cy={p.eyeY + 8} rx={p.earW} ry={p.earH / 2} fill={p.shade} stroke="#8a6f5a" strokeWidth={0.8} />
          <path d={`M${100 + s * (p.earX + 2)} ${p.eyeY + 8 - p.earH / 3} q${s * 5} ${p.earH / 3} 0 ${p.earH / 1.6}`} stroke="#8a6f5a" strokeWidth={0.8} fill="none" />
        </g>
      ))}
      {/* rosto */}
      <path d={p.outline} fill={`url(#${id}-g)`} stroke="#8a6f5a" strokeWidth={1} />
      {p.blush && ([-1, 1] as const).map((s) => (
        <ellipse key={s} cx={100 + s * 30} cy={p.eyeY + 28} rx={14} ry={8} fill={p.blush} opacity={0.35} />
      ))}
      {p.cheekbones && ([-1, 1] as const).map((s) => (
        <path key={s} d={`M${100 + s * 44} ${p.eyeY + 12} Q${100 + s * 40} ${p.eyeY + 30} ${100 + s * 30} ${p.eyeY + 40}`} stroke="#c2ad99" strokeWidth={1.2} fill="none" />
      ))}
      {/* cabelo */}
      <path d={p.hair} fill={p.hairColor} />
      {p.curls && [52, 64, 77, 90, 103, 116, 129, 142].map((x, i) => (
        <circle key={x} cx={x + 3} cy={i % 2 ? 30 : 38} r={9} fill={p.hairColor} />
      ))}
      {eyes}
      {/* nariz */}
      <path d={`M${100 - 3} ${p.eyeY + 6} Q${100 - 6} ${p.eyeY + p.noseLen * 0.6} ${100 - p.noseW / 2 + 1} ${tipY - 2}`} stroke="#9a7a63" strokeWidth={1} fill="none" />
      <path d={`M${100 - p.noseW / 2} ${tipY - 2} C${100 - p.noseW / 2 - 4} ${tipY + 5} ${100 - 4} ${tipY + 7} ${100} ${tipY + 4} C${100 + 4} ${tipY + 7} ${100 + p.noseW / 2 + 4} ${tipY + 5} ${100 + p.noseW / 2} ${tipY - 2}`} stroke="#8a6a54" strokeWidth={1.2} fill="none" />
      {/* boca */}
      <path d={`M${100 - p.mouthW / 2} ${p.mouthY} Q${100 - p.mouthW / 4} ${p.mouthY - p.lipT} ${100} ${p.mouthY - p.lipT * 0.5} Q${100 + p.mouthW / 4} ${p.mouthY - p.lipT} ${100 + p.mouthW / 2} ${p.mouthY} Q${100} ${p.mouthY + p.lipT * 1.6} ${100 - p.mouthW / 2} ${p.mouthY} Z`} fill="#c0675b" stroke="#8d4a40" strokeWidth={0.8} />
      <path d={`M${100 - p.mouthW / 2} ${p.mouthY} Q100 ${p.mouthY + 2} ${100 + p.mouthW / 2} ${p.mouthY}`} stroke="#7a3d35" strokeWidth={0.8} fill="none" />
      {p.dimples && ([-1, 1] as const).map((s) => (
        <path key={s} d={`M${100 + s * (p.mouthW / 2 + 5)} ${p.mouthY - 4} q${s * 2} 4 0 8`} stroke="#c08670" strokeWidth={1} fill="none" />
      ))}
      {/* zonas do mapa */}
      {zonas?.map((z) => (ZONAS[z.id] ?? []).map((f, i) => {
        const cor = (z.elemento && cores?.[z.elemento]) || '#6b675c';
        const on = selecionada === z.id;
        return (
          <ellipse key={z.id + i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={cor} fillOpacity={on ? 0.75 : 0.38}
            stroke={on ? '#1d1a19' : cor} strokeWidth={on ? 1.6 : 1} style={{ cursor: onZona ? 'pointer' : undefined }}
            onClick={onZona ? () => onZona(z.id) : undefined}>
            <title>{`${z.nome}: ${z.orgao}`}</title>
          </ellipse>
        );
      }))}
    </svg>
  );
}
