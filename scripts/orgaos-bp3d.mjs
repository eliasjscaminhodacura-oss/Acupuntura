// Órgãos com anatomia real a partir do BodyParts3D
// ("BodyParts3D, © The Database Center for Life Science licensed under CC
// Attribution 4.0 International"), um atlas feito com dados de um homem
// adulto real (medidas em mm; X = lado esquerdo do paciente, Y negativo =
// frente, Z = altura).
//
// Os órgãos são encaixados no corpo realista comparando a pele do atlas
// com a pele do corpo, fatia por fatia de altura (largura, frente e
// costas do tronco). Usado por scripts/corpo-real.mjs.
//
// Na 1ª vez baixa o atlas (~140 MB) para scripts/.bodyparts3d/ (fora do git).

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';

const ROOT = new URL('..', import.meta.url);
const CACHE = new URL('scripts/.bodyparts3d/', ROOT);
const SRC = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const OBJ_DIR = new URL('isa_BP3D_4.0_obj_99/', CACHE);

// órgão do app -> partes do atlas (nome em inglês) e quantos triângulos
// manter depois de simplificar
export const ORGAOS = [
  { key: 'Coração', parts: ['heart'], tris: 5000 },
  { key: 'Pulmão', parts: ['right lung', 'left lung'], tris: 6000, envelope: true },
  { key: 'Fígado', parts: ['liver'], tris: 4000 },
  { key: 'Vesícula Biliar', parts: ['gallbladder'], tris: 700 },
  { key: 'Estômago', parts: ['stomach'], tris: 1800 },
  { key: 'Baço-Pâncreas', parts: ['spleen', 'pancreas'], tris: 2000 },
  { key: 'Intestino Delgado', parts: ['duodenum', 'jejunum', 'ileum'], tris: 6000 },
  { key: 'Intestino Grosso', parts: ['cecum', 'appendix', 'ascending colon', 'transverse colon', 'descending colon', 'rectum'], tris: 3500 },
  { key: 'Rim', parts: ['right kidney', 'left kidney'], tris: 1800 },
  { key: 'Bexiga', parts: ['urinary bladder'], tris: 700 },
  { key: 'Próstata', parts: ['prostate'], tris: 500, sexo: 'male' },
];

async function download(name) {
  const file = new URL(name, CACHE);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CACHE, { recursive: true });
    console.log(`baixando ${name} do BodyParts3D…`);
    const res = await fetch(SRC + name);
    if (!res.ok) throw new Error(`não consegui baixar ${name}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

function readObj(id) {
  const P = [];
  const F = [];
  for (const l of fs.readFileSync(new URL(`${id}.obj`, OBJ_DIR), 'utf8').split('\n')) {
    if (l.startsWith('v ')) P.push(l.slice(2).trim().split(/\s+/).map(Number));
    else if (l.startsWith('f ')) F.push(l.slice(2).trim().split(/\s+/).map((t) => parseInt(t) - 1));
  }
  return { P, F };
}

export async function loadAtlas() {
  const zip = await download('isa_BP3D_4.0_obj_99.zip');
  if (!fs.existsSync(OBJ_DIR)) {
    console.log('descompactando o atlas…');
    // no Windows usa o tar do sistema (o do Git Bash confunde "C:" com um servidor)
    const tar = process.platform === 'win32' ? `${process.env.SystemRoot}\\System32\\tar.exe` : 'tar';
    execFileSync(tar, ['-xf', fileURLToPath(zip), '-C', fileURLToPath(CACHE)]);
  }
  const elements = new Map();
  for (const list of ['isa_element_parts.txt', 'partof_element_parts.txt']) {
    for (const l of fs.readFileSync(await download(list), 'utf8').split('\n').slice(1)) {
      const [, name, id] = l.trim().split('\t');
      if (!name || !id) continue;
      const k = name.toLowerCase();
      if (!elements.has(k)) elements.set(k, new Set());
      elements.get(k).add(id);
    }
  }
  const part = (names) => {
    const ids = new Set(names.flatMap((n) => [...(elements.get(n) ?? [])]));
    if (!ids.size) throw new Error(`parte não encontrada no atlas: ${names.join(', ')}`);
    const P = [];
    const F = [];
    for (const id of ids) {
      const o = readObj(id);
      const base = P.length;
      P.push(...o.P);
      for (const f of o.F) F.push(f.map((i) => i + base));
    }
    return { P, F };
  };
  // pulmões: superfície gerada em volta dos brônquios (cada lado separado)
  const heart = part(['heart']).P;
  const lungs = () => {
    const P = [];
    const F = [];
    for (const side of ['right lung', 'left lung']) {
      const e = envelope(part([side]).P, heart);
      const base = P.length;
      P.push(...e.P);
      for (const f of e.F) F.push(f.map((i) => i + base));
    }
    return { P, F };
  };
  return { part: (names) => (names.join() === 'right lung,left lung' ? lungs() : part(names)), skin: part(['skin']) };
}

// Fatias do tronco: para cada altura, extensão lateral (direita/esquerda),
// frente e costas. "pts" = vértices [x, y(altura), profundidade, …] já no
// formato [lado, altura, frente(+)].
export function torsoSlices(pts, heights, band, gap) {
  return heights.map((h) => {
    const s = pts.filter((p) => Math.abs(p[1] - h) < band);
    if (!s.length) return null;
    // só o tronco: a partir do centro, para no primeiro vão (braço solto)
    const xs = s.map((p) => p[0]).sort((a, b) => a - b);
    let i0 = xs.findIndex((x) => x >= 0);
    if (i0 < 0) i0 = xs.length - 1;
    let r = i0;
    while (r + 1 < xs.length && xs[r + 1] - xs[r] < gap) r++;
    let l = i0;
    while (l - 1 >= 0 && xs[l] - xs[l - 1] < gap) l--;
    const right = xs[l];
    const left = xs[r];
    const tor = s.filter((p) => p[0] >= right && p[0] <= left);
    const zs = tor.map((p) => p[2]);
    return { h, right, left, front: Math.max(...zs), back: Math.min(...zs) };
  });
}

function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) {
    const [x0, y0] = table[i - 1];
    const [x1, y1] = table[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return table[table.length - 1][1];
}

// Simplifica uma malha (solda vértices iguais antes).
export async function simplify(P, F, tris) {
  await MeshoptSimplifier.ready;
  const key = new Map();
  const pos = [];
  const remap = P.map((p) => {
    const k = p.map((v) => v.toFixed(2)).join(',');
    if (!key.has(k)) { key.set(k, pos.length / 3); pos.push(...p); }
    return key.get(k);
  });
  const idx = [];
  for (const f of F) for (let k = 1; k + 1 < f.length; k++) idx.push(remap[f[0]], remap[f[k]], remap[f[k + 1]]);
  const positions = new Float32Array(pos);
  const target = Math.min(idx.length, tris * 3);
  const [out] = MeshoptSimplifier.simplify(new Uint32Array(idx), positions, 3, target, 0.02, ['LockBorder']);
  // tira os vértices que sobraram sem uso
  const used = new Map();
  const P2 = [];
  const I2 = [];
  for (const i of out) {
    if (!used.has(i)) { used.set(i, P2.length / 3); P2.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]); }
    I2.push(used.get(i));
  }
  return { pos: P2, idx: I2 };
}

// Monta a função que leva um ponto do atlas (mm) para dentro do corpo.
// body: { torso: [[X, Y, Z], …] vértices do tronco do corpo, alturas
// { soles, crotch, jugular, headTop } }
// opts.clampFloor (padrão true): nada desce abaixo do períneo (bom para os
// órgãos); o corpo ilustrado desliga para seguir pela virilha.
export function makeFit(atlas, body, { clampFloor = true } = {}) {
  const skin = atlas.skin.P.map(([x, y, z]) => [x, z, -y]); // [lado, altura, frente]
  const zs = skin.map((p) => p[1]);
  const soles = Math.min(...zs);
  const headTop = Math.max(...zs);
  // períneo: ~2 cm abaixo da parte mais baixa do osso do quadril (ísquios).
  // (Pela pele não dá: no atlas as coxas encostam uma na outra.)
  const crotch = Math.min(...atlas.part(['hip bone']).P.map((p) => p[2])) - 20;
  const manubrium = atlas.part(['manubrium']).P;
  const jugular = Math.max(...manubrium.map((p) => p[2]));
  const knots = [[soles, body.alturas.soles], [crotch, body.alturas.crotch], [jugular, body.alturas.jugular], [headTop, body.alturas.headTop]];
  const toY = (z) => interp(knots, z);

  const hs = [];
  for (let h = crotch + 5; h <= jugular + 40; h += 10) hs.push(h);
  const A = torsoSlices(skin, hs, 8, 25);
  const B = torsoSlices(body.torso, hs.map(toY), 2.5, 6);
  // suaviza (mediana de 7 fatias): no atlas os braços encostam no quadril
  // e atrapalham algumas fatias
  const median = (list) => list.map((r, i) => {
    if (!r) return r;
    const win = list.slice(Math.max(0, i - 3), i + 4).filter(Boolean);
    const out = { h: r.h };
    for (const k of ['right', 'left', 'front', 'back']) {
      const v = win.map((w) => w[k]).sort((a, b) => a - b);
      out[k] = v[Math.floor(v.length / 2)];
    }
    return out;
  });
  const As = median(A);
  const Bs = median(B);
  const rows = hs.map((h, i) => [h, As[i], Bs[i]]).filter(([, a, b]) => a && b);
  const lerpRow = (h) => {
    if (h <= rows[0][0]) return rows[0];
    for (let i = 1; i < rows.length; i++) if (h <= rows[i][0]) {
      const t = (h - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]);
      const mix = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));
      return [h, mix(rows[i - 1][1], rows[i][1]), mix(rows[i - 1][2], rows[i][2])];
    }
    return rows[rows.length - 1];
  };
  // nada desce abaixo do períneo (o fim do reto fica entre as nádegas)
  const floor = crotch + 5;
  return ([x, y, z0]) => {
    const z = clampFloor ? Math.max(z0, floor) : z0;
    const [, a, b] = lerpRow(z);
    const X = x >= 0 ? (x / a.left) * b.left : (x / a.right) * b.right;
    const t = Math.max(-0.1, Math.min(1.1, (-y - a.back) / (a.front - a.back)));
    return [X, toY(z), b.back + t * (b.front - b.back)];
  };
}

// O atlas não tem a superfície dos pulmões, só a árvore dos brônquios e os
// vasos (que preenchem o pulmão). A "casca" é gerada envolvendo essa
// árvore: um campo de densidade em voxels (5 mm), suavizado, de onde se
// extrai a superfície (surface nets). O coração é "escavado" do campo.
export function envelope(points, carve, { voxel = 5, radius = 24, isoFrac = 0.18, blur = 6 } = {}) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
  for (let k = 0; k < 3; k++) { min[k] -= radius * 2; max[k] += radius * 2; }
  const n = min.map((m, k) => Math.ceil((max[k] - m) / voxel) + 1);
  const [nx, ny, nz] = n;
  let F = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  const splat = (p, R, w) => {
    const c = p.map((v, k) => (v - min[k]) / voxel);
    const r = Math.ceil(R / voxel);
    for (let k = Math.max(0, Math.floor(c[2] - r)); k <= Math.min(nz - 1, Math.ceil(c[2] + r)); k++)
      for (let j = Math.max(0, Math.floor(c[1] - r)); j <= Math.min(ny - 1, Math.ceil(c[1] + r)); j++)
        for (let i = Math.max(0, Math.floor(c[0] - r)); i <= Math.min(nx - 1, Math.ceil(c[0] + r)); i++) {
          const d = Math.hypot(i - c[0], j - c[1], k - c[2]) * voxel;
          if (d < R) F[id(i, j, k)] += w * (1 - d / R);
        }
  };
  for (const p of points) splat(p, radius, 1);
  for (const p of carve) splat(p, 14, -6);
  for (let b = 0; b < blur; b++) {
    const G = new Float32Array(F.length);
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      let s = 0;
      for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += F[id(i + di, j + dj, k + dk)];
      G[id(i, j, k)] = s / 27;
    }
    F = G;
  }
  // nível da superfície: fração do valor alto típico do campo
  const vals = [...F].filter((v) => v > 0).sort((a, b) => a - b);
  const iso = vals[Math.floor(vals.length * 0.95)] * isoFrac;
  // surface nets
  const P = [];
  const cell = new Int32Array(nx * ny * nz).fill(-1);
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = corner.map(([a, b, c]) => F[id(i + a, j + b, k + c)] - iso);
    if (v.every((x) => x > 0) || v.every((x) => x <= 0)) continue;
    const acc = [0, 0, 0];
    let cnt = 0;
    for (const [a, b] of edges) {
      if ((v[a] > 0) === (v[b] > 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      for (let q = 0; q < 3; q++) acc[q] += corner[a][q] + t * (corner[b][q] - corner[a][q]);
      cnt++;
    }
    cell[id(i, j, k)] = P.length;
    P.push([min[0] + (i + acc[0] / cnt) * voxel, min[1] + (j + acc[1] / cnt) * voxel, min[2] + (k + acc[2] / cnt) * voxel]);
  }
  const Fc = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const inside = F[id(i, j, k)] > iso;
    // aresta em X, Y e Z saindo deste vértice da grade
    const quads = [
      [[i, j - 1, k - 1], [i, j, k - 1], [i, j, k], [i, j - 1, k], F[id(i + 1, j, k)] > iso],
      [[i - 1, j, k - 1], [i - 1, j, k], [i, j, k], [i, j, k - 1], F[id(i, j + 1, k)] > iso],
      [[i - 1, j - 1, k], [i, j - 1, k], [i, j, k], [i - 1, j, k], F[id(i, j, k + 1)] > iso],
    ];
    for (const [a, b, c, d, other] of quads) {
      if (inside === other) continue;
      const q = [a, b, c, d].map(([x, y, z]) => cell[id(x, y, z)]);
      if (q.some((x) => x < 0)) continue;
      Fc.push(inside ? [q[0], q[1], q[2], q[3]] : [q[3], q[2], q[1], q[0]]);
    }
  }
  // fica só com a maior peça (tira pedaços soltos)
  const parent = P.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (const q of Fc) for (let k = 1; k < 4; k++) parent[root(q[k])] = root(q[0]);
  const size = new Map();
  for (const q of Fc) size.set(root(q[0]), (size.get(root(q[0])) ?? 0) + 1);
  const big = [...size.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { P, F: Fc.filter((q) => root(q[0]) === big) };
}

// Órgãos femininos: o BodyParts3D é de um homem, então útero, trompas e
// ovários vêm de "Pelvic Organs from MRI" (audreybyrd, Sketchfab, CC BY 4.0
// — ressonância de uma mulher de 25 anos). O arquivo GLB baixado fica em
// scripts/.pelve/pelvic_organs_from_mri.glb (fora do git).
// Encaixe: escala pelo tamanho real do útero com o colo (~9 cm), base da
// vulva no períneo do corpo e bexiga logo atrás da parede da barriga.
export const PELVE = new URL('scripts/.pelve/pelvic_organs_from_mri.glb', ROOT);

export async function femalePelvis(NodeIO, THREE, body) {
  if (!fs.existsSync(PELVE)) return null;
  const doc = await new NodeIO().read(fileURLToPath(PELVE));
  // keep = false: só mede (mínimos/máximos), sem guardar os vértices
  const group = (name, keep = true) => {
    const g = doc.getRoot().listNodes().find((n) => n.getName().startsWith(name));
    const P = [];
    const F = [];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const n of g.listChildren()) {
      const m = new THREE.Matrix4().fromArray(n.getWorldMatrix());
      for (const p of n.getMesh().listPrimitives()) {
        const a = p.getAttribute('POSITION');
        const base = P.length;
        const el = [];
        const v = new THREE.Vector3();
        for (let i = 0; i < a.getCount(); i++) {
          a.getElement(i, el);
          v.set(el[0], el[1], el[2]).applyMatrix4(m);
          for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v.getComponent(k)); max[k] = Math.max(max[k], v.getComponent(k)); }
          if (keep) P.push([v.x, v.y, v.z]);
        }
        if (!keep) continue;
        const idx = p.getIndices().getArray();
        for (let i = 0; i < idx.length; i += 3) F.push([base + idx[i], base + idx[i + 1], base + idx[i + 2]]);
      }
    }
    return { P, F, min, max };
  };
  const uterus = group('uterus-and-tubes');
  const ovaries = group('ovaries');
  const vulva = group('vulva', false);
  const bladder = group('bladder', false);
  const unit = body.mmPerUnit;
  // escala: os dois ovários ocupam ~12 cm de largura
  const s = 120 / unit / (ovaries.max[0] - ovaries.min[0]);
  const cx = (uterus.min[0] + uterus.max[0]) / 2;
  const bladderFront = bladder.max[2];
  const ty = body.alturas.crotch + 2 - s * vulva.min[1];
  // frente do corpo na altura da bexiga
  const yb = ty + s * ((bladder.min[1] + bladder.max[1]) / 2);
  const front = Math.max(...body.torso.filter((p) => Math.abs(p[0]) < 15 && Math.abs(p[1] - yb) < 4).map((p) => p[2]));
  const tz = front - 18 / unit - s * bladderFront;
  const fit = ([x, y, z]) => [(x - cx) * s, ty + y * s, tz + z * s];
  return {
    'Útero e trompas': { P: uterus.P.map(fit), F: uterus.F, tris: 3000 },
    'Ovários': { P: ovaries.P.map(fit), F: ovaries.F, tris: 900 },
  };
}
