import { ELEMENTS_ORDER, ELEMENT_COLOR } from './ficha-logic';

// Geometria do gráfico 3D dos 5 elementos: o pentágono fica "deitado" em
// perspectiva e a área do paciente vira um sólido cuja altura em cada
// vértice também acompanha a pontuação. A mesma geometria é desenhada na
// tela (SVG, ElementRadar.tsx) e no PDF (jsPDF, pdf-export.ts).

export type Pt = [number, number];

export type Radar3D = {
  floor: Pt[]; // contorno externo do piso
  rings: Pt[][]; // anéis de 25%, 50%, 75% e 100%
  spokes: [Pt, Pt][]; // raios do centro até cada elemento
  walls: { pts: Pt[]; color: string }[]; // paredes laterais, de trás para frente
  top: Pt[]; // tampa do sólido
  pillars: { floor: Pt; top: Pt; color: string }[];
  vertices: { at: Pt; color: string; el: string }[];
  labels: { at: Pt; text: string; color: string; align: 'left' | 'center' | 'right' }[];
};

export const RADAR_BRICK = '#A63D2F';
export const RADAR_TOP = '#D9A196';
export const RADAR_FLOOR = '#EFEBE1';
export const RADAR_GRID = '#C9C4B5';

type Options = {
  cx: number;
  cy: number;
  radius: number;
  tilt?: number; // achatamento vertical do piso (perspectiva)
  maxHeight: number; // altura do sólido no elemento de maior pontuação
  baseHeight?: number; // espessura mínima do sólido
  labelGap: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// factor < 1 escurece, > 1 clareia (misturando com branco).
export function shade(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (factor <= 1) return rgbToHex(rgb.map((v) => v * factor));
  const t = Math.min(1, factor - 1);
  return rgbToHex(rgb.map((v) => v + (255 - v) * t));
}

export function buildRadar3D(scores: Record<string, number>, opts: Options): Radar3D {
  const { cx, cy, radius, maxHeight, labelGap } = opts;
  const tilt = opts.tilt ?? 0.5;
  const baseHeight = opts.baseHeight ?? maxHeight * 0.1;
  const n = ELEMENTS_ORDER.length;
  const max = Math.max(1, ...ELEMENTS_ORDER.map((e) => scores[e] || 0));
  const angle = (i: number) => ((Math.PI * 2) / n) * i;

  // Coordenadas no plano do piso: x para a direita, "d" para o fundo.
  const plane = (r: number, i: number): [number, number] => [r * Math.sin(angle(i)), r * Math.cos(angle(i))];
  // arredonda para que servidor e navegador gerem exatamente o mesmo desenho
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const project = ([x, d]: [number, number], h = 0): Pt => [r2(cx + x), r2(cy - d * tilt - h)];

  const ring = (r: number) => ELEMENTS_ORDER.map((_, i) => project(plane(r, i)));

  const values = ELEMENTS_ORDER.map((el) => scores[el] || 0);
  const planePts = values.map((v, i) => plane((v / max) * radius, i));
  const heights = values.map((v) => baseHeight + (v / max) * (maxHeight - baseHeight));
  const floorPts = planePts.map((p) => project(p));
  const topPts = planePts.map((p, i) => project(p, heights[i]));

  // Luz vindo da frente-esquerda: paredes viradas para ela ficam mais claras.
  const light: [number, number] = [-0.55, -0.83];
  const walls = ELEMENTS_ORDER.map((_, i) => {
    const j = (i + 1) % n;
    const [x1, d1] = planePts[i];
    const [x2, d2] = planePts[j];
    let nx = d2 - d1;
    let nd = -(x2 - x1);
    const len = Math.hypot(nx, nd) || 1;
    nx /= len;
    nd /= len;
    // garante que a normal aponte para fora do centro
    if (nx * (x1 + x2) + nd * (d1 + d2) < 0) {
      nx = -nx;
      nd = -nd;
    }
    const lit = Math.max(0, nx * light[0] + nd * light[1]);
    return {
      pts: [floorPts[i], floorPts[j], topPts[j], topPts[i]],
      color: shade(RADAR_BRICK, 0.62 + 0.5 * lit),
      depth: d1 + d2, // maior = mais ao fundo
    };
  })
    .sort((a, b) => b.depth - a.depth)
    .map(({ pts, color }) => ({ pts, color }));

  const labels = ELEMENTS_ORDER.map((el, i) => {
    const s = Math.sin(angle(i));
    const [lx, ly] = project(plane(radius + labelGap, i));
    // rótulos do fundo sobem junto com o sólido para não ficarem escondidos
    const lift = Math.cos(angle(i)) > 0.5 ? heights[i] + labelGap * 0.4 : 0;
    const drop = Math.cos(angle(i)) < -0.5 ? labelGap * 0.5 : 0;
    return {
      at: [lx, ly - lift + drop] as Pt,
      text: `${el} (${values[i]})`,
      color: ELEMENT_COLOR[el],
      align: (s > 0.3 ? 'left' : s < -0.3 ? 'right' : 'center') as 'left' | 'center' | 'right',
    };
  });

  return {
    floor: ring(radius),
    rings: [0.25, 0.5, 0.75, 1].map((f) => ring(radius * f)),
    spokes: ELEMENTS_ORDER.map((_, i) => [project([0, 0]), project(plane(radius, i))] as [Pt, Pt]),
    walls,
    top: topPts,
    pillars: ELEMENTS_ORDER.map((el, i) => ({ floor: floorPts[i], top: topPts[i], color: ELEMENT_COLOR[el] })),
    vertices: ELEMENTS_ORDER.map((el, i) => ({ at: topPts[i], color: ELEMENT_COLOR[el], el })),
    labels,
  };
}
