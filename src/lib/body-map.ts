import type { FichaData } from './ficha-types';
import type { Pt } from './radar3d';

// Mapa do corpo para o resultado: contorno (frente/costas), órgãos e
// pontos de acupuntura. Coordenadas num quadro de 200 x 440 por vista,
// corpo em posição anatômica (palmas para a frente).
// ATENÇÃO: as posições são ILUSTRATIVAS (aproximadas) — servem para
// orientar a leitura, não substituem a localização anatômica.

export const BODY_W = 200;
export const BODY_H = 440;

export type BodyView = 'front' | 'back';

// Metade direita da tela (lado esquerdo do paciente na vista de frente),
// do alto da cabeça até o períneo. A outra metade é o espelho.
const HALF: Pt[] = [
  [100, 6], [113, 9], [121, 20], [123, 36], [119, 51], [111, 60], [110, 70],
  [122, 76], [140, 81], [150, 90], [156, 110], [160, 140], [165, 172], [171, 208],
  [177, 244], [181, 264], [188, 278], [191, 296], [186, 310], [178, 308], [175, 294],
  [171, 280], [166, 266], [158, 232], [150, 198], [144, 168], [140, 140], [137, 118],
  [135, 140], [132, 170], [130, 196], [134, 220], [137, 244], [138, 272], [136, 300],
  [133, 330], [132, 360], [130, 392], [129, 412], [136, 424], [138, 433], [130, 437],
  [112, 437], [109, 426], [107, 410], [106, 380], [106, 350], [105, 330], [104, 300],
  [102, 275], [100, 264],
];

// Curva suave (Catmull-Rom) passando pelos pontos de um contorno fechado.
function smoothClosed(points: Pt[], steps = 5): Pt[] {
  const out: Pt[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

function mirrorClose(half: Pt[]): Pt[] {
  const left = half.slice(1, -1).reverse().map(([x, y]) => [BODY_W - x, y] as Pt);
  return smoothClosed([...half, ...left]);
}

// Contorno neutro (usado quando o sexo não é informado).
export const BODY_OUTLINE: Pt[] = mirrorClose(HALF);

// Variações do contorno por sexo: só o tronco muda (ombros, cintura,
// quadril); cabeça, braços, pernas e os 71 pontos ficam iguais.
const AJUSTE: Record<'masculino' | 'feminino', Record<string, Pt>> = {
  masculino: {
    '110,70': [111, 70], '122,76': [124, 76], '140,81': [143, 81], '150,90': [153, 91], '156,110': [158, 111],
    '135,140': [136, 140], '134,220': [133, 220], '137,244': [135, 244], '138,272': [137, 272],
  },
  feminino: {
    '140,81': [137, 82], '150,90': [147, 91], '156,110': [154, 111],
    '135,140': [134, 140], '132,170': [130, 170], '130,196': [129, 195], '134,220': [136, 222],
    '137,244': [141, 246], '138,272': [141, 272], '136,300': [137, 300],
  },
};

const OUTLINES = {
  masculino: mirrorClose(HALF.map((p) => AJUSTE.masculino[p.join(',')] ?? p)),
  feminino: mirrorClose(HALF.map((p) => AJUSTE.feminino[p.join(',')] ?? p)),
};

export function bodyOutline(corpo?: 'masculino' | 'feminino' | null): Pt[] {
  return corpo ? OUTLINES[corpo] : BODY_OUTLINE;
}

// Linha dos seios no corpo feminino (vista de frente): uma curva de cada lado.
export const BREAST_LINES: Pt[][] = [
  [[105, 123], [109, 131], [115, 134], [121, 132], [125, 126]],
  [[95, 123], [91, 131], [85, 134], [79, 132], [75, 126]],
];

export type OrganShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'band'; pts: Pt[]; width: number }; // faixa (intestino grosso)

export const ORGANS: { organ: string; view: BodyView; shapes: OrganShape[] }[] = [
  { organ: 'Pulmão', view: 'front', shapes: [
    { kind: 'ellipse', cx: 84, cy: 116, rx: 15, ry: 24 },
    { kind: 'ellipse', cx: 116, cy: 116, rx: 15, ry: 24 },
  ] },
  { organ: 'Coração', view: 'front', shapes: [{ kind: 'ellipse', cx: 105, cy: 128, rx: 10, ry: 9 }] },
  { organ: 'Fígado', view: 'front', shapes: [{ kind: 'ellipse', cx: 85, cy: 152, rx: 21, ry: 11 }] },
  { organ: 'Vesícula Biliar', view: 'front', shapes: [{ kind: 'ellipse', cx: 92, cy: 163, rx: 5, ry: 4 }] },
  { organ: 'Estômago', view: 'front', shapes: [{ kind: 'ellipse', cx: 114, cy: 156, rx: 13, ry: 8 }] },
  { organ: 'Baço-Pâncreas', view: 'front', shapes: [
    { kind: 'ellipse', cx: 128, cy: 150, rx: 6, ry: 10 },
    { kind: 'ellipse', cx: 109, cy: 168, rx: 13, ry: 4 },
  ] },
  { organ: 'Intestino Grosso', view: 'front', shapes: [
    { kind: 'band', pts: [[80, 226], [80, 180], [120, 180], [120, 226]], width: 7 },
  ] },
  { organ: 'Intestino Delgado', view: 'front', shapes: [{ kind: 'ellipse', cx: 100, cy: 202, rx: 15, ry: 13 }] },
  { organ: 'Bexiga', view: 'front', shapes: [{ kind: 'ellipse', cx: 100, cy: 240, rx: 10, ry: 7 }] },
  { organ: 'Rim', view: 'back', shapes: [
    { kind: 'ellipse', cx: 88, cy: 196, rx: 7, ry: 11 },
    { kind: 'ellipse', cx: 112, cy: 196, rx: 7, ry: 11 },
  ] },
];

type PointDef = { view: BodyView; x: number; y: number; region: string };

// x > 100 = um dos lados; pontos com x != 100 são bilaterais (espelhados).
export const POINTS: Record<string, PointDef> = {
  // Vaso Concepção (linha média anterior)
  VC3: { view: 'front', x: 100, y: 238, region: 'baixo ventre, 4 cun abaixo do umbigo' },
  VC4: { view: 'front', x: 100, y: 226, region: 'baixo ventre, 3 cun abaixo do umbigo' },
  VC6: { view: 'front', x: 100, y: 208, region: 'abdome, 1,5 cun abaixo do umbigo' },
  VC8: { view: 'front', x: 100, y: 190, region: 'centro do umbigo' },
  VC10: { view: 'front', x: 100, y: 178, region: 'abdome, 2 cun acima do umbigo' },
  VC12: { view: 'front', x: 100, y: 165, region: 'abdome, 4 cun acima do umbigo' },
  VC13: { view: 'front', x: 100, y: 159, region: 'abdome, 5 cun acima do umbigo' },
  VC14: { view: 'front', x: 100, y: 152, region: 'abdome, 6 cun acima do umbigo' },
  VC15: { view: 'front', x: 100, y: 146, region: 'abaixo do apêndice xifoide' },
  VC17: { view: 'front', x: 100, y: 118, region: 'centro do peito, entre os mamilos' },
  // Vaso Governador (linha média posterior / cabeça)
  VG4: { view: 'back', x: 100, y: 200, region: 'coluna, abaixo de L2' },
  VG14: { view: 'back', x: 100, y: 78, region: 'coluna, abaixo de C7' },
  VG16: { view: 'back', x: 100, y: 50, region: 'nuca, abaixo do occipital' },
  VG20: { view: 'back', x: 100, y: 9, region: 'alto da cabeça (vértex)' },
  VG24: { view: 'front', x: 100, y: 14, region: 'testa, na linha do cabelo' },
  VG26: { view: 'front', x: 100, y: 51, region: 'sulco entre nariz e lábio' },
  // Estômago
  E25: { view: 'front', x: 112, y: 190, region: 'abdome, 2 cun ao lado do umbigo' },
  E36: { view: 'front', x: 123, y: 346, region: 'perna, 3 cun abaixo do joelho' },
  E37: { view: 'front', x: 123, y: 362, region: 'perna, 6 cun abaixo do joelho' },
  E39: { view: 'front', x: 123, y: 378, region: 'perna, 9 cun abaixo do joelho' },
  E40: { view: 'front', x: 128, y: 371, region: 'perna, 8 cun abaixo do joelho (lateral)' },
  E44: { view: 'front', x: 121, y: 433, region: 'pé, entre o 2º e o 3º dedo' },
  E45: { view: 'front', x: 124, y: 437, region: 'pé, ponta do 2º dedo' },
  // Baço-Pâncreas
  BP1: { view: 'front', x: 112, y: 435, region: 'hálux, canto medial da unha' },
  BP3: { view: 'front', x: 112, y: 429, region: 'pé, borda medial (1º metatarso)' },
  BP4: { view: 'front', x: 112, y: 424, region: 'pé, borda medial (base do 1º metatarso)' },
  BP6: { view: 'front', x: 109, y: 399, region: 'perna, 3 cun acima do maléolo medial' },
  BP9: { view: 'front', x: 108, y: 340, region: 'perna, abaixo do côndilo medial da tíbia' },
  BP10: { view: 'front', x: 111, y: 316, region: 'coxa, 2 cun acima da patela (medial)' },
  // Fígado
  F2: { view: 'front', x: 116, y: 434, region: 'pé, entre o 1º e o 2º dedo' },
  F3: { view: 'front', x: 117, y: 428, region: 'dorso do pé, entre 1º e 2º metatarsos' },
  F5: { view: 'front', x: 110, y: 388, region: 'perna, 5 cun acima do maléolo medial' },
  F8: { view: 'front', x: 106, y: 330, region: 'joelho, prega medial' },
  // Rim
  R1: { view: 'back', x: 116, y: 433, region: 'planta do pé' },
  R3: { view: 'front', x: 108, y: 413, region: 'tornozelo, atrás do maléolo medial' },
  R6: { view: 'front', x: 111, y: 419, region: 'tornozelo, abaixo do maléolo medial' },
  R7: { view: 'front', x: 107, y: 404, region: 'perna, 2 cun acima de R3' },
  // Vesícula Biliar
  VB20: { view: 'back', x: 112, y: 54, region: 'nuca, abaixo do occipital (lateral)' },
  VB34: { view: 'front', x: 132, y: 342, region: 'perna, abaixo da cabeça da fíbula' },
  VB39: { view: 'front', x: 130, y: 398, region: 'perna, 3 cun acima do maléolo lateral' },
  VB40: { view: 'front', x: 132, y: 417, region: 'tornozelo, à frente do maléolo lateral' },
  VB43: { view: 'front', x: 131, y: 434, region: 'pé, entre o 4º e o 5º dedo' },
  // Bexiga
  B12: { view: 'back', x: 111, y: 93, region: 'costas, 1,5 cun ao lado de T2' },
  B13: { view: 'back', x: 111, y: 102, region: 'costas, 1,5 cun ao lado de T3' },
  B15: { view: 'back', x: 111, y: 120, region: 'costas, 1,5 cun ao lado de T5' },
  B17: { view: 'back', x: 111, y: 138, region: 'costas, 1,5 cun ao lado de T7' },
  B18: { view: 'back', x: 111, y: 156, region: 'costas, 1,5 cun ao lado de T9' },
  B19: { view: 'back', x: 111, y: 165, region: 'costas, 1,5 cun ao lado de T10' },
  B20: { view: 'back', x: 111, y: 174, region: 'costas, 1,5 cun ao lado de T11' },
  B21: { view: 'back', x: 111, y: 183, region: 'costas, 1,5 cun ao lado de T12' },
  B23: { view: 'back', x: 111, y: 200, region: 'lombar, 1,5 cun ao lado de L2' },
  B25: { view: 'back', x: 111, y: 216, region: 'lombar, 1,5 cun ao lado de L4' },
  B28: { view: 'back', x: 111, y: 240, region: 'sacro, ao nível do 2º forame' },
  B43: { view: 'back', x: 123, y: 111, region: 'costas, 3 cun ao lado de T4' },
  B52: { view: 'back', x: 123, y: 200, region: 'lombar, 3 cun ao lado de L2' },
  B66: { view: 'front', x: 135, y: 431, region: 'pé, borda lateral (5º dedo)' },
  // Pulmão
  P5: { view: 'front', x: 160, y: 187, region: 'prega do cotovelo, lado radial' },
  P7: { view: 'front', x: 181, y: 258, region: 'antebraço, 1,5 cun acima do punho' },
  P9: { view: 'front', x: 182, y: 268, region: 'prega do punho, lado radial' },
  P10: { view: 'front', x: 185, y: 283, region: 'eminência tenar (palma)' },
  P11: { view: 'front', x: 190, y: 298, region: 'polegar, canto da unha' },
  // Pericárdio
  CS5: { view: 'front', x: 175, y: 246, region: 'antebraço, 3 cun acima do punho' },
  CS6: { view: 'front', x: 176, y: 253, region: 'antebraço, 2 cun acima do punho' },
  CS8: { view: 'front', x: 180, y: 290, region: 'centro da palma' },
  // Coração
  C5: { view: 'front', x: 171, y: 262, region: 'antebraço, 1 cun acima do punho (ulnar)' },
  C7: { view: 'front', x: 172, y: 269, region: 'prega do punho, lado ulnar' },
  C8: { view: 'front', x: 175, y: 295, region: 'palma, entre 4º e 5º metacarpos' },
  // Intestino Grosso
  IG4: { view: 'back', x: 186, y: 286, region: 'dorso da mão, entre polegar e indicador' },
  IG11: { view: 'front', x: 167, y: 180, region: 'cotovelo, fim lateral da prega' },
  // Intestino Delgado
  ID2: { view: 'back', x: 173, y: 301, region: 'dedo mínimo, lado ulnar' },
  ID5: { view: 'back', x: 170, y: 271, region: 'punho, lado ulnar (dorso)' },
};

const POINT_RE = /\b(VG|VC|BP|IG|ID|VB|TA|CS|E|B|R|F|C|P)\s?(\d{1,2})\b/g;

export function pointCodes(text: string): string[] {
  return [...new Set([...text.matchAll(POINT_RE)].map((m) => m[1] + m[2]))];
}

export type BodyResult = {
  organs: { organ: string; score: number; intensity: number; element: string }[]; // mais comprometido primeiro
  points: { code: string; def: PointDef; syndromes: string[] }[];
};

// Junta, a partir das síndromes identificadas, quanto cada órgão está
// comprometido e quais pontos foram sugeridos (e por quais síndromes).
export function buildBodyResult(
  data: FichaData,
  syndromeScores: Record<string, number>,
  topCodes: string[]
): BodyResult {
  const organMap = new Map<string, { score: number; element: string }>();
  for (const [code, score] of Object.entries(syndromeScores)) {
    if (!score) continue;
    const info = data.syndromes[code];
    if (!info) continue;
    const cur = organMap.get(info.organ_name) ?? { score: 0, element: info.element };
    cur.score += score;
    organMap.set(info.organ_name, cur);
  }
  const max = Math.max(1, ...[...organMap.values()].map((o) => o.score));
  const organs = [...organMap.entries()]
    .map(([organ, o]) => ({ organ, score: o.score, intensity: o.score / max, element: o.element }))
    .sort((a, b) => b.score - a.score);

  const pointMap = new Map<string, string[]>();
  for (const code of topCodes) {
    const note = data.clinical_notes[code];
    if (!note) continue;
    const name = data.syndromes[code]?.name || code;
    for (const p of pointCodes(note.pontos)) {
      if (!POINTS[p]) continue;
      pointMap.set(p, [...(pointMap.get(p) ?? []), name]);
    }
  }
  const points = [...pointMap.entries()]
    .map(([code, syndromes]) => ({ code, def: POINTS[code], syndromes }))
    .sort((a, b) => b.syndromes.length - a.syndromes.length || a.code.localeCompare(b.code));

  return { organs, points };
}

// Posições onde desenhar um ponto (uma ou duas, se bilateral).
export function pointPositions(def: PointDef): Pt[] {
  return def.x === 100 ? [[def.x, def.y]] : [[def.x, def.y], [BODY_W - def.x, def.y]];
}
