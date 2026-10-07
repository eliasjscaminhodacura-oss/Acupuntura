// Coloca os pontos de auriculoterapia na superfície da orelha 3D.
//
// Cada ponto de src/data/auriculo.json tem uma "vista" e uma posição uv
// (0–100) na imagem dessa vista (câmera ortográfica, centro 0, meia
// largura = modelo.meio mm, "para cima" = +Y). O script "atira" um raio
// dessa câmera e grava onde ele toca a pele, a direção da pele (normal) e
// a posição do ponto nas imagens 2D (frente e dorso) em
// src/data/auriculo-3d.json. Pontos de vista "raio" usam origem/direção
// próprias (faces internas do trago e do antítrago).
//
// Uso: npm run auriculo:posicionar

import { readFileSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';

const ROOT = new URL('..', import.meta.url);
const data = JSON.parse(readFileSync(new URL('src/data/auriculo.json', ROOT), 'utf8'));
const M = data.modelo;
const HALF = M.meio;

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(new URL('public' + M.arquivo, ROOT).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// Junta a malha (já com a matriz do nó aplicada, por causa da quantização).
const pos = [];
const idx = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = new THREE.Matrix4().fromArray(node.getWorldMatrix());
  for (const prim of mesh.listPrimitives()) {
    const a = prim.getAttribute('POSITION');
    const base = pos.length / 3;
    const v = new THREE.Vector3();
    const el = [];
    for (let i = 0; i < a.getCount(); i++) {
      a.getElement(i, el);
      v.set(el[0], el[1], el[2]).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
    }
    for (const i of prim.getIndices().getArray()) idx.push(base + i);
  }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
geo.setIndex(idx);
geo.computeVertexNormals();
const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
mesh.updateMatrixWorld(true);

function camera(dir) {
  const d = new THREE.Vector3(...dir).normalize();
  const cam = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 0.1, 1000);
  cam.position.copy(d).multiplyScalar(200);
  cam.up.set(0, 1, 0);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}
const cams = Object.fromEntries(Object.entries(M.vistas).map(([k, v]) => [k, camera(v.dir)]));

const ray = new THREE.Raycaster();
const uvToNdc = ([u, v]) => new THREE.Vector2(u / 50 - 1, 1 - v / 50);
const ndcToUv = (p) => [+((p.x + 1) * 50).toFixed(2), +((1 - p.y) * 50).toFixed(2)];

function hitFrom(origin, dir) {
  ray.set(origin, dir.clone().normalize());
  const h = ray.intersectObject(mesh, false)[0];
  if (!h) return null;
  const n = h.face.normal.clone();
  if (n.dot(dir) > 0) n.negate(); // a normal aponta para quem olha
  return { p: h.point, n };
}

// Posição do ponto na imagem de uma vista e se ele aparece (não fica
// escondido atrás de outra dobra da orelha).
function project(cam, p) {
  const ndc = p.clone().project(cam);
  ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), cam);
  const h = ray.intersectObject(mesh, false)[0];
  const visible = !!h && h.point.distanceTo(p) < 0.6;
  return { uv: ndcToUv(ndc), visible };
}

const out = {};
const problems = [];
for (const pt of data.pontos) {
  let hit;
  if (pt.vista === 'raio') {
    const [u, v, z] = pt.raio.o;
    hit = hitFrom(new THREE.Vector3((u - 50) * HALF / 50, (50 - v) * HALF / 50, z), new THREE.Vector3(...pt.raio.d));
  } else {
    const cam = cams[pt.vista];
    if (!cam) { problems.push(`${pt.codigo}: vista desconhecida "${pt.vista}"`); continue; }
    ray.setFromCamera(uvToNdc(pt.uv), cam);
    const h = ray.intersectObject(mesh, false)[0];
    if (h) {
      const n = h.face.normal.clone();
      if (n.dot(ray.ray.direction) > 0) n.negate();
      hit = { p: h.point, n };
    }
  }
  if (!hit) { problems.push(`${pt.codigo}: o raio não tocou a orelha`); continue; }
  const r = (v) => v.toArray().map((x) => +x.toFixed(2));
  const lat = project(cams.lateral, hit.p);
  const post = project(cams.posterior, hit.p);
  out[pt.codigo] = {
    pos: r(hit.p),
    normal: r(hit.n.normalize()),
    frente: { uv: lat.uv, visivel: lat.visible },
    dorso: { uv: post.uv, visivel: post.visible },
  };
}

writeFileSync(new URL('src/data/auriculo-3d.json', ROOT), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length} pontos posicionados.`);
const hidden = Object.entries(out).filter(([, v]) => !v.frente.visivel && !v.dorso.visivel).map(([k]) => k);
if (hidden.length) console.log('Escondidos nas duas imagens 2D (aparecem tracejados):', hidden.join(', '));
if (problems.length) { console.log('PROBLEMAS:\n- ' + problems.join('\n- ')); process.exitCode = 1; }
