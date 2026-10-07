// Leva coordenadas do mapa 2D do corpo (quadro 200 x 440, ver body-map.ts)
// para o corpo 3D realista (masculino ou feminino), usando referências
// anatômicas medidas no modelo: alturas (alto da cabeça, queixo, C7,
// mamilos, umbigo, púbis), larguras do tronco e as cadeias do braço
// (ombro, cotovelo, punho, ponta do dedo) e da perna (quadril, joelho,
// tornozelo, sola). As tabelas são geradas por scripts/corpo-real.mjs.
//
// O resultado fica no mesmo espaço do 3D antigo: X = lado (lado esquerdo
// do paciente positivo na vista de frente), Y = altura (pés em ~3, cabeça
// em ~434), Z = para a frente.

export type Chain = {
  a2: [number, number][]; // juntas no mapa 2D (lado com x > 100)
  a3: [number, number, number][]; // as mesmas juntas no 3D (lado X > 0)
  // larguras (lado de fora, lado de dentro) ao longo da cadeia; t vai de
  // 0 a (juntas - 1), uma linha a cada 0,25
  w2: [number, number][];
  w3: [number, number][];
};

export type Warp = {
  torso: {
    knots: [number, number][]; // [y no 2D, Y no 3D]
    rows: [number, number, number, number][]; // [y no 2D, meia largura 2D, meia largura 3D, centro Z 3D]
  };
  arm: Chain;
  leg: Chain;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function interp(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1];
      const [x1, y1] = table[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0 || 1));
    }
  }
  return table[table.length - 1][1];
}

function row(w: Warp, y: number) {
  const r = w.torso.rows;
  if (y <= r[0][0]) return r[0];
  for (let i = 1; i < r.length; i++) {
    if (y <= r[i][0]) {
      const t = (y - r[i - 1][0]) / (r[i][0] - r[i - 1][0] || 1);
      return r[i - 1].map((v, k) => lerp(v, r[i][k], t)) as [number, number, number, number];
    }
  }
  return r[r.length - 1];
}

// Borda do tronco no mapa 2D (lado x > 100): à direita dela fica o braço.
const TORSO_EDGE: [number, number][] = [[84, 126], [100, 133], [118, 137], [140, 135], [170, 132], [196, 130], [220, 134], [244, 137], [262, 150], [320, 150]];

export type Region = 'torso' | 'arm' | 'leg';

export function regionOf(x: number, y: number): Region {
  const dx = 100 + Math.abs(x - 100);
  if (y >= 84 && y <= 320 && dx > interp(TORSO_EDGE, y)) return 'arm';
  if (y >= 262) return 'leg';
  return 'torso';
}

// Projeta (x, y) na cadeia 2D: parâmetro t e distância com sinal
// (positivo = para fora do corpo).
function onChain2(c: Chain, x: number, y: number) {
  let best = { t: 0, d: Infinity, side: 1 };
  for (let i = 0; i + 1 < c.a2.length; i++) {
    const [ax, ay] = c.a2[i];
    const [bx, by] = c.a2[i + 1];
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy;
    const u = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2));
    const px = ax + vx * u;
    const py = ay + vy * u;
    const dist = Math.hypot(x - px, y - py);
    if (dist < Math.abs(best.d)) {
      // normal "para fora": perpendicular ao segmento, apontando para x maior
      let nx = vy;
      let ny = -vx;
      if (nx < 0) { nx = -nx; ny = -ny; }
      const side = (x - px) * nx + (y - py) * ny >= 0 ? 1 : -1;
      best = { t: i + u, d: side * dist, side };
    }
  }
  return best;
}

function widthAt(table: [number, number][], t: number, side: number) {
  const i = Math.min(table.length - 1, Math.max(0, t * 4));
  const k = Math.floor(i);
  const f = i - k;
  const a = table[k];
  const b = table[Math.min(table.length - 1, k + 1)];
  return side > 0 ? lerp(a[0], b[0], f) : lerp(a[1], b[1], f);
}

function chain3(c: Chain, t: number) {
  const k = Math.min(c.a3.length - 2, Math.floor(t));
  const f = t - k;
  const a = c.a3[k];
  const b = c.a3[k + 1];
  const p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)] as [number, number, number];
  // perpendicular no plano frontal, apontando para fora (X maior)
  let nx = b[1] - a[1];
  let ny = -(b[0] - a[0]);
  const n = Math.hypot(nx, ny) || 1;
  nx /= n;
  ny /= n;
  if (nx < 0) { nx = -nx; ny = -ny; }
  return { p, nx, ny };
}

function warpChain(c: Chain, x: number, y: number, z: number): [number, number, number] {
  const dx = 100 + Math.abs(x - 100);
  const { t, d, side } = onChain2(c, dx, y);
  const w2 = widthAt(c.w2, t, side) || 1;
  const w3 = widthAt(c.w3, t, side);
  const u = Math.min(0.92, Math.abs(d) / w2); // nunca passa da borda do membro
  const { p, nx, ny } = chain3(c, t);
  return [p[0] + nx * side * u * w3, p[1] + ny * side * u * w3, p[2] + z];
}

// (x, y) do mapa 2D + z do 3D antigo -> posição no corpo realista.
export function warp(w: Warp, x: number, y: number, z = 0): [number, number, number] {
  const s = x > 100 ? 1 : x < 100 ? -1 : 0;
  const reg = regionOf(x, y);
  if (reg === 'torso') {
    const [, h2, h3, zc] = row(w, y);
    return [((x - 100) / (h2 || 1)) * h3, interp(w.torso.knots, y), zc + z];
  }
  const [X, Y, Z] = warpChain(reg === 'arm' ? w.arm : w.leg, x, y, z);
  return [s === 0 ? 0 : s * X, Y, Z];
}
