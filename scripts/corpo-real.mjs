// Gera os corpos 3D realistas (masculino e feminino) a partir do
// MakeHuman (malha base, alvos de gênero e esqueleto, licença CC0) e
// leva os pontos do mapa 2D (src/lib/body-map.ts) para eles.
//
// Saídas:
//   public/corpo/masculino.glb, public/corpo/feminino.glb
//   src/data/corpo-3d.json  (tabelas de correspondência 2D -> 3D e a
//                            posição de cada ponto na pele)
//
// Uso: npm run corpo:gerar
// Os arquivos do MakeHuman são baixados do GitHub na 1ª vez e guardados em
// scripts/.makehuman/ (fora do git).

import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { fileURLToPath } from 'node:url';
import { BODY_OUTLINE, POINTS, pointPositions } from '../src/lib/body-map.ts';
import { warp, regionOf } from '../src/lib/body-warp.ts';
import { ORGAOS, loadAtlas, makeFit, simplify } from './orgaos-bp3d.mjs';

const ROOT = new URL('..', import.meta.url);
const CACHE = new URL('scripts/.makehuman/', ROOT);
const MH = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/';
const RACES = ['african', 'asian', 'caucasian'];

async function mh(path) {
  const file = new URL(path.replace(/\//g, '_'), CACHE);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CACHE, { recursive: true });
    const res = await fetch(MH + path);
    if (!res.ok) throw new Error(`não consegui baixar ${path}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file, 'utf8');
}

// ------------------------------------------------------------ malha base

const V = [];
const faces = [];
{
  let group = '';
  for (const l of (await mh('3dobjs/base.obj')).split('\n')) {
    if (l.startsWith('v ')) V.push(l.slice(2).trim().split(/\s+/).map(Number));
    else if (l.startsWith('g ')) group = l.slice(2).trim();
    else if (l.startsWith('f ') && group === 'body') faces.push(l.slice(2).trim().split(/\s+/).map((t) => parseInt(t) - 1));
  }
}
const targets = {};
for (const r of RACES) for (const g of ['male', 'female']) {
  targets[`${r}-${g}`] = (await mh(`targets/macrodetails/${r}-${g}-young.target`))
    .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.trim().split(/\s+/).map(Number));
}
const skel = JSON.parse(await mh('rigs/default.mhskel'));
const W = JSON.parse(await mh('rigs/default_weights.mhw')).weights;
const children = {};
for (const [n, b] of Object.entries(skel.bones)) if (b.parent) (children[b.parent] ||= []).push(n);
const descend = (n) => [n, ...(children[n] || []).flatMap(descend)];

function joint(P, name) {
  const ids = skel.joints[name];
  const v = new THREE.Vector3();
  for (const i of ids) v.add(new THREE.Vector3(...P[i]));
  return v.divideScalar(ids.length);
}
function weightOf(bones) {
  const w = new Float32Array(V.length);
  for (const b of bones) for (const [i, x] of W[b] || []) w[i] += x;
  return w;
}
function rotate(P, w, pivot, q) {
  const v = new THREE.Vector3();
  for (let i = 0; i < P.length; i++) {
    if (!w[i]) continue;
    v.set(...P[i]).sub(pivot).applyQuaternion(q).add(pivot);
    const k = Math.min(1, w[i]);
    P[i] = [P[i][0] + (v.x - P[i][0]) * k, P[i][1] + (v.y - P[i][1]) * k, P[i][2] + (v.z - P[i][2]) * k];
  }
}

// Adulto jovem, mistura igual das três etnias do MakeHuman.
function bodyShape(sex) {
  const P = V.map((v) => [...v]);
  for (const r of RACES) for (const [i, x, y, z] of targets[`${r}-${sex}`]) {
    P[i][0] += x / 3; P[i][1] += y / 3; P[i][2] += z / 3;
  }
  return P;
}

// Posição anatômica: braços junto ao corpo, cotovelos esticados, palmas
// para a frente e punhos retos.
function anatomical(P) {
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1;
    const armW = weightOf(descend(`upperarm01.${side}`));
    const sh = joint(P, `upperarm01.${side}____head`);
    const wr = joint(P, `lowerarm02.${side}____tail`);
    const cur = Math.atan2(Math.abs(wr.x - sh.x), sh.y - wr.y);
    rotate(P, armW, sh, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * (cur - (12 * Math.PI) / 180)));
    const el0 = joint(P, `lowerarm01.${side}____head`);
    rotate(P, armW, sh, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(el0.z - sh.z, sh.y - el0.y)));
    const sh1 = joint(P, `upperarm01.${side}____head`);
    const el1 = joint(P, `lowerarm01.${side}____head`);
    const wr1 = joint(P, `lowerarm02.${side}____tail`);
    rotate(P, weightOf(descend(`lowerarm01.${side}`)), el1,
      new THREE.Quaternion().setFromUnitVectors(wr1.clone().sub(el1).normalize(), el1.clone().sub(sh1).normalize()));
    const el = joint(P, `lowerarm01.${side}____head`);
    const wr2 = joint(P, `lowerarm02.${side}____tail`);
    const tw = new Float32Array(V.length);
    const add = (bones, f) => { for (const b of bones) for (const [i, x] of W[b] || []) tw[i] += x * f; };
    add([`lowerarm01.${side}`], 0.35);
    add([`lowerarm02.${side}`], 0.8);
    add((children[`lowerarm02.${side}`] || []).flatMap(descend), 1);
    rotate(P, tw, el, new THREE.Quaternion().setFromAxisAngle(wr2.clone().sub(el).normalize(), (-s * 90 * Math.PI) / 180));
    const wj = joint(P, `lowerarm02.${side}____tail`);
    const tip = joint(P, `finger3-3.${side}____tail`);
    rotate(P, weightOf((children[`lowerarm02.${side}`] || []).flatMap(descend)), wj,
      new THREE.Quaternion().setFromUnitVectors(tip.clone().sub(wj).normalize(), wj.clone().sub(el).normalize()));
  }
  return P;
}

// ------------------------------------------------------------ 2D (mapa)

// Interseção de um raio com o contorno 2D (distância até a borda).
function outlineHit(ox, oy, dx, dy, max = 60) {
  let best = Infinity;
  const n = BODY_OUTLINE.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = BODY_OUTLINE[i];
    const [bx, by] = BODY_OUTLINE[(i + 1) % n];
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t > 0.01 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best <= max ? best : null;
}

const ARM2 = [[139, 92], [157, 185], [175, 268], [182, 310]];
const LEG2 = [[117, 250], [119, 335], [118, 415], [121, 437]];

function widths2(chain) {
  const out = [];
  for (let t = 0; t <= chain.length - 1 + 1e-9; t += 0.25) {
    const k = Math.min(chain.length - 2, Math.floor(t));
    const f = t - k;
    const [ax, ay] = chain[k];
    const [bx, by] = chain[k + 1];
    const px = ax + (bx - ax) * f;
    const py = ay + (by - ay) * f;
    let nx = by - ay;
    let ny = -(bx - ax);
    const n = Math.hypot(nx, ny);
    nx /= n; ny /= n;
    if (nx < 0) { nx = -nx; ny = -ny; }
    const lat = outlineHit(px, py, nx, ny) ?? 10;
    const med = outlineHit(px, py, -nx, -ny, Math.max(14, lat * 1.6)) ?? lat;
    out.push([+lat.toFixed(2), +med.toFixed(2)]);
  }
  return out;
}

function half2(y) {
  if (y < 84) {
    let m = 0;
    for (const [x, yy] of BODY_OUTLINE) if (Math.abs(yy - y) < 3) m = Math.max(m, x - 100);
    return m || 20;
  }
  const E = [[84, 126], [100, 133], [118, 137], [140, 135], [170, 132], [196, 130], [220, 134], [244, 137], [262, 138], [272, 138]];
  for (let i = 1; i < E.length; i++) if (y <= E[i][0]) {
    const t = (y - E[i - 1][0]) / (E[i][0] - E[i - 1][0]);
    return E[i - 1][1] + (E[i][1] - E[i - 1][1]) * t - 100;
  }
  return 38;
}

// ------------------------------------------------------------ 3D

function build(sex) {
  const P = anatomical(bodyShape(sex));
  // usa só a pele do corpo; escala para o quadro do mapa (altura 431)
  const used = new Map();
  const list = [];
  for (const f of faces) for (const i of f) if (!used.has(i)) { used.set(i, list.length); list.push(i); }
  let ymin = Infinity, ymax = -Infinity;
  for (const i of list) { ymin = Math.min(ymin, P[i][1]); ymax = Math.max(ymax, P[i][1]); }
  const S = 431 / (ymax - ymin);
  const F = (p) => [p[0] * S, (p[1] - ymin) * S + 3, p[2] * S];
  const Q = P.map(F);
  const J = (name) => new THREE.Vector3(...F(joint(P, name).toArray()));

  const armW = weightOf(['L', 'R'].flatMap((s) => descend(`upperarm01.${s}`)));
  const legW = weightOf(['L', 'R'].flatMap((s) => descend(`upperleg01.${s}`)));
  const verts = list.map((i) => ({ i, p: Q[i], arm: armW[i], leg: legW[i] }));

  // referências de altura
  const headTop = Math.max(...verts.map((v) => v.p[1]));
  const chin = J('jaw____tail').y;
  const c7 = J('neck01____head').y;
  const nipple = J('breast.L____tail').y;
  const center = verts.filter((v) => Math.abs(v.p[0]) < 1.2);
  const crotch = Math.min(...center.filter((v) => v.leg < 0.9 && v.p[1] > 120).map((v) => v.p[1]));
  // umbigo: o ponto mais "fundo" da linha média da barriga
  const front = center.filter((v) => v.p[1] > crotch + 0.35 * (nipple - crotch) && v.p[1] < crotch + 0.8 * (nipple - crotch) && v.p[2] > 0);
  const navelY = (() => {
    const bins = new Map();
    for (const v of front) { const b = Math.round(v.p[1]); bins.set(b, Math.max(bins.get(b) ?? -Infinity, v.p[2])); }
    const ys = [...bins.keys()].sort((a, b) => a - b);
    let best = ys[0], bestDepth = -Infinity;
    for (let k = 2; k < ys.length - 2; k++) {
      const z = bins.get(ys[k]);
      const around = (bins.get(ys[k - 2]) + bins.get(ys[k + 2])) / 2;
      if (around - z > bestDepth) { bestDepth = around - z; best = ys[k]; }
    }
    return best;
  })();
  const knots = [[6, headTop], [58, chin], [78, c7], [118, nipple], [190, navelY], [264, crotch], [437, 3]].map(([a, b]) => [a, +b.toFixed(2)]);

  const torsoVerts = verts.filter((v) => v.arm < 0.3);
  const rows = [];
  for (let y = 0; y <= 272; y += 4) {
    const Y = interp(knots, y);
    const slab = torsoVerts.filter((v) => Math.abs(v.p[1] - Y) < 2.5 && (y < 250 || v.leg < 0.7 || Math.abs(v.p[0]) < 25));
    if (!slab.length) continue;
    const h3 = Math.max(...slab.map((v) => Math.abs(v.p[0])));
    const zs = slab.map((v) => v.p[2]);
    rows.push([y, +half2(y).toFixed(2), +h3.toFixed(2), +((Math.min(...zs) + Math.max(...zs)) / 2).toFixed(2)]);
  }

  const chain3 = (names, filt) => {
    const a3 = names.map((n) => (Array.isArray(n) ? n : J(n).toArray()));
    const vs = verts.filter((v) => v.p[0] > 0 && filt(v));
    const w3 = [];
    for (let t = 0; t <= a3.length - 1 + 1e-9; t += 0.25) {
      const k = Math.min(a3.length - 2, Math.floor(t));
      const f = t - k;
      const A = new THREE.Vector3(...a3[k]);
      const B = new THREE.Vector3(...a3[k + 1]);
      const p = A.clone().lerp(B, f);
      const D = B.clone().sub(A); D.z = 0; D.normalize();
      const N = new THREE.Vector3(D.y, -D.x, 0);
      if (N.x < 0) N.negate();
      let lat = 0, med = 0;
      for (const v of vs) {
        const d = new THREE.Vector3(...v.p).sub(p); d.z = 0;
        if (Math.abs(d.dot(D)) > 2.2) continue;
        const o = d.dot(N);
        if (Math.abs(o) > 45) continue;
        lat = Math.max(lat, o);
        med = Math.max(med, -o);
      }
      w3.push([+lat.toFixed(2), +med.toFixed(2)]);
    }
    return { a3: a3.map((p) => p.map((x) => +x.toFixed(2))), w3 };
  };
  const arm = chain3(['upperarm01.L____head', 'lowerarm01.L____head', 'lowerarm02.L____tail', 'finger3-3.L____tail'], (v) => v.arm > 0.5);
  const ankle = J('foot.L____head');
  const footZ = verts.filter((v) => v.p[0] > 0 && v.p[1] < 12).reduce((s, v, _, a) => s + v.p[2] / a.length, 0);
  const leg = chain3(['upperleg01.L____head', 'lowerleg01.L____head', 'foot.L____head', [ankle.x, 3, footZ]], (v) => v.leg > 0.5);

  const warpTable = {
    torso: { knots, rows },
    arm: { a2: ARM2, a3: arm.a3, w2: widths2(ARM2), w3: arm.w3 },
    leg: { a2: LEG2, a3: leg.a3, w2: widths2(LEG2), w3: leg.w3 },
  };

  // malha final (só pele), já no quadro
  const pos = list.flatMap((i) => Q[i]);
  const idx = [];
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) idx.push(used.get(f[0]), used.get(f[k]), used.get(f[k + 1]));

  // pontos: leva (x, y) do mapa para o corpo e "atira" um raio de frente
  // (ou de costas) até a pele
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  // pele de cada parte: ponto do braço só encosta no braço, da perna na perna
  const part = (keep) => {
    const sub = [];
    for (let k = 0; k < idx.length; k += 3) {
      const tri = [idx[k], idx[k + 1], idx[k + 2]];
      if (tri.every((j) => keep(verts[j]))) sub.push(...tri);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geo.getAttribute('position'));
    g.setIndex(sub);
    return new THREE.Mesh(g, mesh.material);
  };
  const meshes = { torso: mesh, arm: part((v) => v.arm > 0.4), leg: part((v) => v.leg > 0.4) };
  const ray = new THREE.Raycaster();
  let target = mesh;
  const cast = (X, Y, front) => {
    const dir = new THREE.Vector3(0, 0, front ? -1 : 1);
    ray.set(new THREE.Vector3(X, Y, front ? 500 : -500), dir);
    const h = ray.intersectObject(target, false)[0];
    if (!h) return null;
    const n = h.face.normal.clone();
    if (n.dot(dir) > 0) n.negate();
    return [...h.point.toArray(), ...n.toArray()].map((x) => +x.toFixed(2));
  };
  const pontos = {};
  const problems = [];
  for (const [code, def] of Object.entries(POINTS)) {
    pontos[code] = pointPositions(def).map(([x, y]) => {
      const [X, Y] = warp(warpTable, x, y);
      target = meshes[regionOf(x, y)];
      let hit = cast(X, Y, def.view === 'front');
      for (let r = 1; !hit && r <= 8; r++) for (let a = 0; a < 8 && !hit; a++) {
        hit = cast(X + Math.cos((a * Math.PI) / 4) * r, Y + Math.sin((a * Math.PI) / 4) * r, def.view === 'front');
      }
      if (!hit) { problems.push(`${sex}: ${code} (${regionOf(x, y)}) não tocou a pele`); return [X, Y, 0, 0, 0, 1]; }
      return hit;
    });
  }
  const jugular = (J('clavicle.L____head').y + J('clavicle.R____head').y) / 2;
  const torso = verts.filter((v) => v.arm < 0.3).map((v) => v.p);
  return { pos, idx, warp: warpTable, pontos, problems, torso, alturas: { headTop, chin, c7, nipple, navelY, crotch, jugular, soles: 3 } };
}

function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) {
    const [x0, y0] = table[i - 1];
    const [x1, y1] = table[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[table.length - 1][1];
}

// Grava um GLB com uma malha por nome ({ nome: { pos, idx } }).
async function writeGlb(file, meshes) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene();
  for (const [name, { pos, idx }] of Object.entries(meshes)) {
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buf));
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  }
  await new NodeIO().write(fileURLToPath(file), doc);
}

const out = {
  fonte: 'Corpos gerados com MakeHuman (malha base, alvos e esqueleto, licença CC0 1.0): adulto jovem, mistura igual das etnias, em posição anatômica. Órgãos: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International (simplificados e encaixados em cada corpo).',
};
fs.mkdirSync(new URL('public/corpo/', ROOT), { recursive: true });
let problems = [];
const atlas = await loadAtlas();
const parts = Object.fromEntries(ORGAOS.map((o) => [o.key, atlas.part(o.parts)]));
for (const [sex, nome] of [['male', 'masculino'], ['female', 'feminino']]) {
  const b = build(sex);
  await writeGlb(new URL(`public/corpo/${nome}.glb`, ROOT), { corpo: { pos: b.pos, idx: b.idx } });
  // órgãos do atlas encaixados neste corpo
  const fit = makeFit(atlas, b);
  const orgaos = {};
  for (const o of ORGAOS) {
    if (o.sexo && o.sexo !== sex) continue;
    const src = parts[o.key];
    orgaos[o.key] = await simplify(src.P.map(fit), src.F, o.tris);
  }
  await writeGlb(new URL(`public/corpo/orgaos-${nome}.glb`, ROOT), orgaos);
  console.log(nome, 'órgãos:', Object.entries(orgaos).map(([k, v]) => `${k} ${v.idx.length / 3}`).join(', '));
  out[nome] = { warp: b.warp, pontos: b.pontos };
  problems = problems.concat(b.problems);
  console.log(nome, 'alturas', Object.fromEntries(Object.entries(b.alturas).map(([k, v]) => [k, +v.toFixed(1)])));
}
fs.writeFileSync(new URL('src/data/corpo-3d.json', ROOT), JSON.stringify(out) + '\n');
console.log('Corpos e pontos gerados.');
if (problems.length) { console.log('PROBLEMAS:\n- ' + problems.join('\n- ')); process.exitCode = 1; }
