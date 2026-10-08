// Corpo ilustrado (estilo atlas de anatomia) para o mapa 2D e o PDF.
//
// Encaixa músculos, ossos, artérias e veias do BodyParts3D (CC BY 4.0) nos
// corpos realistas (MakeHuman, CC0), masculino e feminino:
//   - tronco, pescoço e cabeça: o mesmo encaixe dos órgãos (makeFit,
//     fatia por fatia de altura);
//   - braços e pernas: pelas juntas (ombro, cotovelo, punho, ponta do dedo;
//     quadril, joelho, tornozelo, sola), medidas nos ossos do atlas e no
//     esqueleto do corpo;
//   - nas emendas (ombro e virilha) as duas formas são misturadas.
//
// Saídas:
//   scripts/.ilustrado/{masculino,feminino}.glb  (malhas para fotografar;
//                                                 fora do git)
//   src/data/corpo-ilustrado.json  (por corpo e vista: contorno do corpo,
//                                   silhuetas dos órgãos e os 71 pontos, no
//                                   plano da imagem)
// As imagens são "fotografadas" depois por scripts/corpo-ilustrado/ (ver
// o LEIA-ME de lá).
//
// Uso: npm run corpo:ilustrado

import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';
import { fileURLToPath } from 'node:url';
import { build } from './corpo-real.mjs';
import { loadAtlas, makeFit, simplify, torsoSlices } from './orgaos-bp3d.mjs';
import { rasterize, close, contours, area, simplifyClosed, chaikin } from './contorno.mjs';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('scripts/.ilustrado/', ROOT);
fs.mkdirSync(OUT, { recursive: true });

// camadas e quantos triângulos manter de cada uma (depois de simplificar)
const CAMADAS = [
  { key: 'Ossos', names: ['bone organ'], tris: 90000 },
  { key: 'Músculos', names: ['muscle organ'], tris: 200000 },
  { key: 'Artérias', names: ['systemic artery'], tris: 50000 },
  { key: 'Veias', names: ['systemic vein'], tris: 45000 },
];

const V3 = (a) => new THREE.Vector3(...a);
// atlas: [x lado, y (negativo = frente), z altura] em mm -> eixos do corpo
// [lado, altura, frente]
const toBodyAxes = ([x, y, z]) => [x, z, -y];

// ---------------------------------------------------------------- juntas

function bounds(P) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of P) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
  return { min, max };
}
const centroid = (P) => P.reduce((s, p) => s.map((v, k) => v + p[k] / P.length), [0, 0, 0]);
const top = (P, mm) => { const z = bounds(P).max[2]; return P.filter((p) => p[2] > z - mm); };
const bottom = (P, mm) => { const z = bounds(P).min[2]; return P.filter((p) => p[2] < z + mm); };

// Juntas do lado esquerdo no atlas, nos eixos do corpo (mm). O atlas foi
// escaneado deitado, com os pés esticados (ponta para baixo): o pé é girado
// no tornozelo até ficar apoiado, com a ponta para a frente.
function atlasChains(atlas) {
  const P = (n) => atlas.part([n]).P.map(toBodyAxes);
  const humerus = P('left humerus');
  const radius = P('left radius');
  const ulna = P('left ulna');
  const tip = P('distal phalanx of left middle finger');
  const femur = P('left femur');
  const tibia = P('left tibia');
  const foot = P('left foot');
  // (eixos do corpo: [lado, altura, frente])
  const topB = (Q, mm) => { const y = Math.max(...Q.map((q) => q[1])); return Q.filter((q) => q[1] > y - mm); };
  const botB = (Q, mm) => { const y = Math.min(...Q.map((q) => q[1])); return Q.filter((q) => q[1] < y + mm); };
  // cabeça do fêmur: a parte mais alta e mais para dentro (o trocânter maior
  // também é alto, mas fica para fora)
  const fTop = topB(femur, 40);
  const xIn = Math.min(...fTop.map((q) => q[0]));
  const head = centroid(fTop.filter((q) => q[0] < xIn + 30));
  const ankle = centroid(botB(tibia, 12));
  // pé: do tornozelo até os dedos (a parte mais baixa do pé, hoje esticada)
  const toes = centroid(botB(foot, 25));
  const axis = V3(toes).sub(V3(ankle)).normalize();
  const footQ = new THREE.Quaternion().setFromUnitVectors(axis, V3([0, -0.36, 0.93]).normalize());
  const rotFoot = (q) => V3(q).sub(V3(ankle)).applyQuaternion(footQ).add(V3(ankle));
  const footR = foot.map((q) => rotFoot(q));
  const sole = [ankle[0], Math.min(...footR.map((v) => v.y)), footR.reduce((s2, v) => s2 + v.z / footR.length, 0)];
  const fingertip = tip.reduce((x, y) => (y[1] < x[1] ? y : x)); // ponta do dedo médio
  const arm = [centroid(topB(humerus, 25)), centroid(botB(humerus, 15)), centroid([...botB(radius, 10), ...botB(ulna, 10)]), fingertip];
  return { arm, leg: [head, centroid(botB(femur, 15)), ankle, sole], ankle, footQ };
}

// Ponto mais próximo numa cadeia de juntas (polilinha 3D).
function onChain(chain, p) {
  let best = { k: 0, u: 0, d: Infinity, c: null };
  for (let k = 0; k + 1 < chain.length; k++) {
    const A = V3(chain[k]);
    const B = V3(chain[k + 1]);
    const AB = B.clone().sub(A);
    const u = Math.max(0, Math.min(1, p.clone().sub(A).dot(AB) / AB.lengthSq()));
    const c = A.clone().addScaledVector(AB, u);
    const d = c.distanceTo(p);
    if (d < best.d) best = { k, u, d, c };
  }
  return best;
}

// Leva um ponto de um membro do atlas para o mesmo membro do corpo:
// posição ao longo da cadeia + deslocamento girado e escalado.
function limbMap(chainA, chainB, pA) {
  const { k, u, c } = onChain(chainA, pA);
  const A0 = V3(chainA[k]);
  const A1 = V3(chainA[k + 1]);
  const B0 = V3(chainB[k]);
  const B1 = V3(chainB[k + 1]);
  const dA = A1.clone().sub(A0);
  const dB = B1.clone().sub(B0);
  const s = dB.length() / (dA.length() || 1);
  const q = new THREE.Quaternion().setFromUnitVectors(dA.clone().normalize(), dB.clone().normalize());
  const off = pA.clone().sub(c).multiplyScalar(s).applyQuaternion(q);
  return B0.lerp(B1, u).add(off);
}

// ---------------------------------------------------------------- encaixe

const smooth = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

// Quanto um ponto (lado esquerdo, eixos do corpo, mm) pertence ao braço: perto
// do eixo dos ossos do braço e não para dentro dele (o tronco fica medial).
function armWeight(chains, m) {
  const { k, u, d, c } = onChain(chains.arm, m);
  const R = [70, 55, 65][k]; // braço, antebraço, mão
  const lateral = m.x - c.x;
  // no braço o tronco está logo ao lado (mais exigente); no antebraço e na mão
  // o tronco já está longe, então aceita até um raio para dentro do eixo
  const inner = k === 0 ? R * 0.6 : R;
  let w = smooth((R + 20 - d) / 20) * smooth((lateral + inner) / 15);
  if (k === 0) w *= smooth(u / 0.3); // emenda no ombro: mistura com o tronco
  return w;
}

function makeFitAll(atlas, b, chains) {
  const mirror = (pB) => V3([Math.abs(pB[0]), pB[1], pB[2]]);
  // encaixe do tronco medido sem os braços (no atlas eles encostam no corpo)
  const skinNoArms = atlas.skin.P.filter((q) => armWeight(chains, mirror(toBodyAxes(q))) < 0.3);
  const torsoFit = makeFit({ skin: { P: skinNoArms }, part: atlas.part }, b, { clampFloor: false });
  // as cadeias do corpo começam onde o encaixe do tronco põe o ombro e o
  // quadril do atlas: assim tronco e membro concordam na emenda
  const atlasPt = (q) => [q[0], -q[2], q[1]]; // eixos do corpo -> atlas
  const armB = [torsoFit(atlasPt(chains.arm[0])), ...b.warp.arm.a3.slice(1)];
  const legB = [torsoFit(atlasPt(chains.leg[0])), ...b.warp.leg.a3.slice(1)];
  const crotch = Math.min(...atlas.part(['hip bone']).P.map((q) => q[2])) - 20;

  // cabeça: escala própria (largura e profundidade da cabeça)
  const jugular = Math.max(...atlas.part(['manubrium']).P.map((q) => q[2]));
  const skinB = atlas.skin.P.map(toBodyAxes);
  const headTopA = Math.max(...skinB.map((q) => q[1]));
  const headA = skinB.filter((q) => q[1] > headTopA - 200);
  const headB = [];
  for (let i = 0; i < b.pos.length; i += 3) if (b.pos[i + 1] > b.alturas.headTop - 200 / b.mmPerUnit) headB.push([b.pos[i], b.pos[i + 1], b.pos[i + 2]]);
  const span = (Q, k) => [Math.min(...Q.map((q) => q[k])), Math.max(...Q.map((q) => q[k]))];
  const [ax0, ax1] = span(headA, 0);
  const [bx0, bx1] = span(headB, 0);
  const [az0, az1] = span(headA, 2);
  const [bz0, bz1] = span(headB, 2);
  const sx = (bx1 - bx0) / (ax1 - ax0);
  const sz = (bz1 - bz0) / (az1 - az0);
  const zcA = (az0 + az1) / 2;
  const zcB = (bz0 + bz1) / 2;

  return ([x, y, z]) => {
    const pB = toBodyAxes([x, y, z]); // [lado, altura, frente] em mm
    const side = pB[0] >= 0 ? 1 : -1;
    let m = mirror(pB);
    // pé: gira no tornozelo (com emenda suave)
    const wFoot = smooth((chains.ankle[1] + 15 - m.y) / 30);
    if (wFoot > 0) {
      const r = m.clone().sub(V3(chains.ankle)).applyQuaternion(chains.footQ).add(V3(chains.ankle));
      m = m.lerp(r, wFoot);
    }
    const T = torsoFit([x, y, z]);
    // cabeça
    const wHead = smooth((pB[1] - (jugular + 60)) / 60);
    const base = wHead > 0
      ? [T[0] + (pB[0] * sx - T[0]) * wHead, T[1], T[2] + (zcB + (pB[2] - zcA) * sz - T[2]) * wHead]
      : T;
    const wArm = armWeight(chains, m);
    // perna: inteira de 2 cm abaixo da virilha para baixo, misturada com o
    // tronco até 4 cm acima; bem no meio (períneo), o que cruza de um lado ao
    // outro fica no tronco, senão seria puxado para as duas pernas
    const band = smooth((crotch + 40 - m.y) / 60);
    const midZone = smooth((m.y - (crotch - 110)) / 50); // some suavemente coxa abaixo
    const mid = 1 + (smooth((m.x - 10) / 25) - 1) * midZone;
    // lateral do quadril (em volta da cabeça do fêmur) acompanha a perna até
    // ~8 cm acima da articulação, senão vira uma "aba" entre tronco e coxa
    const hip = chains.leg[0];
    const lat = smooth((m.x - (hip[0] - 10)) / 30) * smooth((hip[1] + 80 - m.y) / 40);
    const wLegMid = wArm < 0.5 ? Math.max(band, lat) * mid : 0;
    const w = Math.max(wArm, wLegMid);
    if (!w) return base;
    const L = limbMap(wArm >= wLegMid ? chains.arm : chains.leg, wArm >= wLegMid ? armB : legB, m);
    L.x *= side;
    return [base[0] + (L.x - base[0]) * w, base[1] + (L.y - base[1]) * w, base[2] + (L.z - base[2]) * w];
  };
}

// ---------------------------------------------------------------- 2D

const CELL = 0.5;
const toView = (view) => (view === 'front' ? ([X, Y]) => [X, 440 - Y] : ([X, Y]) => [-X, 440 - Y]);

function silhouette(pos, idx, view, eps = 0.5) {
  const f = toView(view);
  const v = [];
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    const p = f([pos[i], pos[i + 1]]);
    v.push(p);
    bb = [Math.min(bb[0], p[0]), Math.min(bb[1], p[1]), Math.max(bb[2], p[0]), Math.max(bb[3], p[1])];
  }
  const tris = [];
  for (let i = 0; i + 2 < idx.length; i += 3) tris.push([v[idx[i]], v[idx[i + 1]], v[idx[i + 2]]]);
  const { grid, W, H, ox, oy } = rasterize(tris, bb, CELL);
  return contours(close(grid, W, H), W, H)
    .map((l) => l.map(([gx, gy]) => [ox + gx * CELL, oy + gy * CELL]))
    .filter((l) => Math.abs(area(l)) > 3)
    .map((l) => chaikin(simplifyClosed(l, eps), 2).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
}

async function readGlbMeshes(file) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(fileURLToPath(file));
  const out = {};
  for (const n of doc.getRoot().listNodes()) {
    const mesh = n.getMesh();
    if (!mesh) continue;
    const prim = mesh.listPrimitives()[0];
    const a = prim.getAttribute('POSITION');
    const pos = [];
    const t = [0, 0, 0];
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, t); pos.push(...t); }
    out[n.getName().replace(/_/g, ' ')] = { pos, idx: Array.from(prim.getIndices().getArray()) };
  }
  return out;
}

async function writeGlb(file, meshes) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene();
  for (const [name, { pos, idx }] of Object.entries(meshes)) {
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  }
  await new NodeIO().write(fileURLToPath(file), doc);
}

// ---------------------------------------------------------------- principal

const atlas = await loadAtlas();
const chains = atlasChains(atlas);
console.log('juntas do atlas (mm):', JSON.stringify(chains, (k, v) => (typeof v === 'number' ? Math.round(v) : v)));
const fontes = Object.fromEntries(CAMADAS.map((c) => [c.key, atlas.part(c.names)]));
for (const c of CAMADAS) console.log(`${c.key}: ${fontes[c.key].F.length} faces no atlas`);

const out = {
  fonte: 'Músculos, ossos, artérias e veias: BodyParts3D, © The Database Center for Life Science, licença CC BY 4.0, encaixados no corpo MakeHuman (CC0). Gerado por scripts/corpo-ilustrado.mjs.',
};

for (const [sex, nome] of [['male', 'masculino'], ['female', 'feminino']]) {
  const b = build(sex);
  const fit = makeFitAll(atlas, b, chains);
  const meshes = {};
  for (const c of CAMADAS) {
    const src = fontes[c.key];
    meshes[c.key] = await simplify(src.P.map(fit), src.F, c.tris);
    console.log(`${nome} · ${c.key}: ${meshes[c.key].idx.length / 3} triângulos`);
  }
  await writeGlb(new URL(`${nome}.glb`, OUT), meshes);

  // 2D: contorno do corpo, órgãos e pontos, em cada vista
  const orgaos = await readGlbMeshes(new URL(`public/corpo/orgaos-${nome}.glb`, ROOT));
  const views = {};
  for (const view of ['front', 'back']) {
    const f = toView(view);
    const organs = Object.entries(orgaos)
      .filter(([k]) => (k === 'Rim') === (view === 'back'))
      .map(([organ, m]) => ({ organ, loops: silhouette(m.pos, m.idx, view, 0.35) }));
    const pontos = {};
    for (const [code, list] of Object.entries(b.pontos)) pontos[code] = list.map((p) => f([p[0], p[1]]).map((v) => Math.round(v * 10) / 10));
    views[view] = { outline: silhouette(b.pos, b.idx, view, 0.5), organs, pontos };
  }
  out[nome] = views;
  console.log(`${nome}: contorno com ${views.front.outline.length} laço(s)`);
}

fs.writeFileSync(new URL('src/data/corpo-ilustrado.json', ROOT), JSON.stringify(out) + '\n');
console.log('\nGravado src/data/corpo-ilustrado.json e scripts/.ilustrado/*.glb');
