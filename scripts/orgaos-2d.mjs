// Gera as silhuetas 2D dos órgãos reais para o mapa 2D do corpo (e o PDF).
//
// Lê public/corpo/orgaos-{masculino,feminino}.glb (órgãos do BodyParts3D já
// encaixados no corpo realista, no espaço do 3D), projeta cada órgão de
// frente (ou de costas, para os rins), desfaz a correspondência do
// body-warp.ts (3D -> quadro 2D de 200 x 440, o mesmo dos 71 pontos) e
// tira o contorno. Resultado: src/data/orgaos-2d.json.
//
// Uso: npm run corpo:orgaos2d (rodar de novo sempre que os .glb mudarem).

import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { rasterize, close, contours, area, simplifyClosed, chaikin } from './contorno.mjs';

const ROOT = new URL('..', import.meta.url);
const corpo3d = JSON.parse(fs.readFileSync(new URL('src/data/corpo-3d.json', ROOT), 'utf8'));

// órgãos vistos de costas no mapa 2D; os demais aparecem na vista de frente
const DE_COSTAS = new Set(['Rim']);
const CELL = 0.35; // tamanho da célula da grade de rasterização (unidades do quadro 2D)

const lerp = (a, b, t) => a + (b - a) * t;

// --- inverso da correspondência do tronco (ver body-warp.ts) -------------
function makeInverse(warp) {
  // knots: [y 2D, Y 3D] com Y decrescente; para inverter, ordena por Y
  const byY = [...warp.torso.knots].map(([y2, y3]) => [y3, y2]).sort((a, b) => a[0] - b[0]);
  const interp = (table, x) => {
    if (x <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        const [x0, y0] = table[i - 1];
        const [x1, y1] = table[i];
        return lerp(y0, y1, (x - x0) / (x1 - x0 || 1));
      }
    }
    return table[table.length - 1][1];
  };
  const rows = warp.torso.rows;
  const row = (y) => {
    if (y <= rows[0][0]) return rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (y <= rows[i][0]) {
        const t = (y - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0] || 1);
        return rows[i - 1].map((v, k) => lerp(v, rows[i][k], t));
      }
    }
    return rows[rows.length - 1];
  };
  // (X, Y) do 3D -> (x, y) do quadro 2D, vista de frente
  return (X, Y) => {
    const y = interp(byY, Y);
    const [, h2, h3] = row(y);
    return [100 + (X * h2) / (h3 || 1), y];
  };
}

// --- leitura dos órgãos ----------------------------------------------------
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const out = { fonte: 'Silhuetas geradas por scripts/orgaos-2d.mjs a partir dos órgãos 3D (BodyParts3D, CC BY 4.0; útero/ovários: "Pelvic Organs from MRI", CC BY 4.0).' };

for (const corpo of ['masculino', 'feminino']) {
  const toAtlas = makeInverse(corpo3d[corpo].warp);
  const doc = await io.read(fileURLToPathSafe(new URL(`public/corpo/orgaos-${corpo}.glb`, ROOT)));
  const organs = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const name = node.getName().replace(/_/g, ' ');
    const back = DE_COSTAS.has(name);
    const M = node.getWorldMatrix();
    const tris = [];
    let zSum = 0;
    let zN = 0;
    let bounds = [Infinity, Infinity, -Infinity, -Infinity];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      const v = [];
      const t = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, t);
        // aplica a matriz do nó (normalmente identidade)
        const X = M[0] * t[0] + M[4] * t[1] + M[8] * t[2] + M[12];
        const Y = M[1] * t[0] + M[5] * t[1] + M[9] * t[2] + M[13];
        const Z = M[2] * t[0] + M[6] * t[1] + M[10] * t[2] + M[14];
        let [x, y] = toAtlas(X, Y);
        if (back) x = 200 - x; // de costas, o lado esquerdo do paciente fica à esquerda
        v.push([x, y]);
        zSum += Z;
        zN++;
        bounds = [Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y)];
      }
      const n = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i + 2 < n; i += 3) {
        const a = idx ? idx.getScalar(i) : i;
        const b = idx ? idx.getScalar(i + 1) : i + 1;
        const c = idx ? idx.getScalar(i + 2) : i + 2;
        tris.push([v[a], v[b], v[c]]);
      }
    }
    const { grid, W, H, ox, oy } = rasterize(tris, bounds, CELL);
    const closed = close(grid, W, H);
    const loops = contours(closed, W, H)
      .map((l) => l.map(([gx, gy]) => [ox + gx * CELL, oy + gy * CELL]))
      .filter((l) => Math.abs(area(l)) > 2) // descarta pedacinhos
      .map((l) => chaikin(simplifyClosed(l, 0.45), 2).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
    organs.push({ organ: name, view: back ? 'back' : 'front', z: Math.round((zSum / zN) * 100) / 100, loops });
    console.log(`${corpo} · ${name}: ${loops.length} contorno(s), ${loops.reduce((s, l) => s + l.length, 0)} pontos`);
  }
  // ordem de pintura: do mais ao fundo para o mais à frente
  organs.sort((a, b) => (a.view === 'back' ? b.z - a.z : a.z - b.z));
  out[corpo] = organs;
}

fs.writeFileSync(new URL('src/data/orgaos-2d.json', ROOT), JSON.stringify(out) + '\n');
console.log('\nGravado src/data/orgaos-2d.json');

function fileURLToPathSafe(u) {
  return decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
}
