import { ELEMENTS_ORDER, ELEMENT_COLOR, ELEMENT_INFO } from './ficha-logic';
import type { Pt } from './radar3d';

// Geometria do "Ciclo dos 5 Elementos": cada elemento é um círculo cujo
// tamanho acompanha a pontuação; setas pelo contorno mostram o ciclo de
// Geração (Sheng) e setas pela estrela interna o ciclo de Controle (Ke).
// Desenhada na tela (ElementCycle.tsx) e no PDF (pdf-export.ts).

export type CycleNode = {
  el: string;
  at: Pt;
  r: number;
  color: string;
  value: number;
  pct: number; // 0..100
  organ: string;
  alma: string;
  labelAt: Pt; // onde escrever o órgão, do lado de fora
  labelAlign: 'left' | 'center' | 'right';
};

export type CycleArrow = { pts: Pt[]; head: [Pt, Pt, Pt] };

export type Cycle5 = {
  nodes: CycleNode[];
  sheng: CycleArrow[];
  ke: CycleArrow[];
  top: CycleNode | null; // elemento mais comprometido (null se nada marcado)
  total: number;
};

type Options = {
  cx: number;
  cy: number;
  radius: number; // raio do círculo onde ficam os elementos
  rMin: number;
  rMax: number;
  head: number; // tamanho da ponta das setas
  labelGap: number;
};

// Ordem clássica no círculo: Fogo no alto e, no sentido horário,
// Terra, Metal, Água e Madeira (sentido do ciclo de Geração).
const ANGLE_DEG: Record<string, number> = { Fogo: 0, Terra: 72, Metal: 144, Água: 216, Madeira: 288 };
const SHENG = ['Madeira', 'Fogo', 'Terra', 'Metal', 'Água'];

const round2 = (v: number) => Math.round(v * 100) / 100;

function arrowHead(tip: Pt, dirX: number, dirY: number, size: number): [Pt, Pt, Pt] {
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const w = size * 0.55;
  return [tip, [round2(bx - uy * w), round2(by + ux * w)], [round2(bx + uy * w), round2(by - ux * w)]];
}

export function buildCycle5(scores: Record<string, number>, opts: Options): Cycle5 {
  const { cx, cy, radius, rMin, rMax, head, labelGap } = opts;
  const total = ELEMENTS_ORDER.reduce((s, e) => s + (scores[e] || 0), 0);
  const max = Math.max(1, ...ELEMENTS_ORDER.map((e) => scores[e] || 0));
  const rad = (el: string) => (ANGLE_DEG[el] * Math.PI) / 180;
  // arredonda para que servidor e navegador gerem exatamente o mesmo desenho
  const onCircle = (a: number, r = radius): Pt => [round2(cx + r * Math.sin(a)), round2(cy - r * Math.cos(a))];

  const byEl: Record<string, CycleNode> = {};
  const nodes = ELEMENTS_ORDER.map((el) => {
    const value = scores[el] || 0;
    const a = rad(el);
    const r = round2(rMin + (value / max) * (rMax - rMin));
    const s = Math.sin(a);
    const node: CycleNode = {
      el,
      at: onCircle(a),
      r,
      color: ELEMENT_COLOR[el],
      value,
      pct: total ? Math.round((value / total) * 100) : 0,
      organ: ELEMENT_INFO[el].organ,
      alma: ELEMENT_INFO[el].alma,
      labelAt: onCircle(a, radius + rMax + labelGap),
      labelAlign: s > 0.3 ? 'left' : s < -0.3 ? 'right' : 'center',
    };
    byEl[el] = node;
    return node;
  });

  // Geração: arco pelo contorno, de um elemento ao seguinte
  const sheng = SHENG.map((el, i) => {
    const from = byEl[el];
    const to = byEl[SHENG[(i + 1) % SHENG.length]];
    const a1 = rad(from.el) + (from.r + head * 0.4) / radius;
    let a2 = rad(to.el) - (to.r + head * 1.4) / radius;
    if (a2 < a1) a2 += Math.PI * 2;
    const steps = 18;
    const pts: Pt[] = [];
    for (let k = 0; k <= steps; k++) pts.push(onCircle(a1 + ((a2 - a1) * k) / steps));
    // ponta da seta logo depois do fim do arco, na direção da tangente (horário)
    const tip = onCircle(a2 + head / radius);
    return { pts, head: arrowHead(tip, Math.cos(a2), Math.sin(a2), head) };
  });

  // Controle: linha reta pela estrela (cada elemento controla o 2º à frente)
  const ke = SHENG.map((el, i) => {
    const from = byEl[el];
    const to = byEl[SHENG[(i + 2) % SHENG.length]];
    const dx = to.at[0] - from.at[0];
    const dy = to.at[1] - from.at[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const start: Pt = [round2(from.at[0] + ux * (from.r + 2)), round2(from.at[1] + uy * (from.r + 2))];
    const tip: Pt = [round2(to.at[0] - ux * (to.r + 2)), round2(to.at[1] - uy * (to.r + 2))];
    const lineEnd: Pt = [round2(tip[0] - ux * head * 0.8), round2(tip[1] - uy * head * 0.8)];
    return { pts: [start, lineEnd], head: arrowHead(tip, ux, uy, head) };
  });

  const ranked = [...nodes].sort((a, b) => b.value - a.value);
  return { nodes, sheng, ke, top: total ? ranked[0] : null, total };
}
