import * as THREE from 'three';
import { BODY_H, ORGANS, pointPositions, type BodyResult } from './body-map';
import { ELEMENT_COLOR } from './ficha-logic';
import { shade } from './radar3d';
import { getGlowTexture, holoMaterial } from './holo';

// Corpo 3D estilizado ("holograma") para o resultado da ficha.
// Tudo é montado com formas simples (sem modelos externos). As medidas
// seguem o mesmo quadro de 200 x 440 do mapa 2D (body-map.ts): x da tela
// vira X (centro em 0), y da tela vira altura (Y para cima) e Z aponta
// para a frente do paciente. Assim os pontos aprovados no 2D caem no
// mesmo lugar do corpo 3D. Posições ILUSTRATIVAS, como no 2D.

export type LayerKey = 'pele' | 'ossos' | 'orgaos' | 'circulacao' | 'nervos' | 'respiracao' | 'digestao' | 'urinario' | 'pontos';

export const LAYERS: { key: LayerKey; label: string; color: string; on: boolean }[] = [
  { key: 'pele', label: 'Pele', color: '#5CE1E6', on: true },
  { key: 'ossos', label: 'Ossos', color: '#EDE6D6', on: false },
  { key: 'orgaos', label: 'Órgãos', color: '#7FE3B0', on: true },
  { key: 'circulacao', label: 'Circulação', color: '#FF4D5E', on: false },
  { key: 'nervos', label: 'Nervos', color: '#FFD54A', on: false },
  { key: 'respiracao', label: 'Respiração', color: '#9FE8FF', on: false },
  { key: 'digestao', label: 'Digestão', color: '#FFA552', on: false },
  { key: 'urinario', label: 'Urinário', color: '#5CFFB0', on: false },
  { key: 'pontos', label: 'Pontos', color: '#FFE27A', on: true },
];

const CYAN = '#5CE1E6';
const POINT = '#FFE27A';
const POINT_SELECTED = '#FF3B3B';

// Converte coordenadas do mapa 2D (tela) para o espaço 3D.
const P = (x: number, y: number, z = 0) => new THREE.Vector3(x - 100, BODY_H - y, z);
const mirror = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, v.z);

// ---------------------------------------------------------------- geometrias

const SPHERE = new THREE.SphereGeometry(1, 32, 20);

function ellipsoid(c: THREE.Vector3, rx: number, ry: number, rz: number, mat: THREE.Material, rotZ = 0, rotY = 0) {
  const m = new THREE.Mesh(SPHERE, mat);
  m.position.copy(c);
  m.scale.set(rx, ry, rz);
  m.rotation.set(0, rotY, rotZ);
  return m;
}

function tube(points: THREE.Vector3[], r: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, Math.max(24, points.length * 14), r, 10, false);
  return new THREE.Mesh(geo, mat);
}

// Superfície "esticada" ao longo de um caminho de cima para baixo, com
// seções elípticas (ou quase retangulares, se e < 1). Usada para tronco,
// pescoço, braços e pernas (pontas abertas: ficam escondidas dentro da
// parte vizinha). key = [x, y, z, raioX, raioZ] em coords de tela.
type Key = [number, number, number, number, number];

function loft(keys: Key[], e = 1, seg = 36, steps = 8) {
  const centers = keys.map(([x, y, z]) => P(x, y, z));
  const curve = new THREE.CatmullRomCurve3(centers);
  const n = (keys.length - 1) * steps;
  const pos: number[] = [];
  const rings: THREE.Vector3[] = [];
  const zAxis = new THREE.Vector3(0, 0, 1);
  const sp = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k = Math.min(keys.length - 2, Math.floor(t * (keys.length - 1)));
    const local = t * (keys.length - 1) - k;
    const s = local * local * (3 - 2 * local);
    const rx = keys[k][3] + (keys[k + 1][3] - keys[k][3]) * s;
    const rz = keys[k][4] + (keys[k + 1][4] - keys[k][4]) * s;
    const c = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const xAxis = new THREE.Vector3().crossVectors(tan, zAxis).normalize();
    const zA = new THREE.Vector3().crossVectors(xAxis, tan).normalize();
    rings.push(c);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const v = c.clone()
        .addScaledVector(xAxis, rx * sp(Math.cos(a)))
        .addScaledVector(zA, rz * sp(Math.sin(a)));
      pos.push(v.x, v.y, v.z);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // Garante que as faces apontem para fora (senão o brilho da borda some).
  const nrm = geo.getAttribute('normal');
  const mid = Math.floor(n / 2) * seg;
  const out = new THREE.Vector3(pos[mid * 3], pos[mid * 3 + 1], pos[mid * 3 + 2]).sub(rings[Math.floor(n / 2)]);
  if (out.dot(new THREE.Vector3(nrm.getX(mid), nrm.getY(mid), nrm.getZ(mid))) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  return geo;
}

const mirrorKeys = (keys: Key[]): Key[] => keys.map(([x, y, z, rx, rz]) => [200 - x, y, z, rx, rz]);

function named<T extends THREE.Object3D>(obj: T, label: string): T {
  obj.userData.label = label;
  return obj;
}

// Adiciona o objeto e a cópia espelhada (lado esquerdo/direito).
function both(group: THREE.Group, make: (m: (v: THREE.Vector3) => THREE.Vector3, sign: 1 | -1) => THREE.Object3D) {
  group.add(make((v) => v, 1));
  group.add(make(mirror, -1));
}

// ---------------------------------------------------------------- partes

const TORSO: Key[] = [
  [100, 68, -2, 11, 10], [100, 76, -2, 22, 13], [100, 82, -1, 31, 16], [100, 92, 0, 37, 19],
  [100, 118, 1, 36, 22], [100, 140, 1, 34, 21], [100, 170, 1, 31, 18], [100, 196, 1, 29.5, 17],
  [100, 220, 0, 33, 19], [100, 244, -1, 36, 20], [100, 264, -1, 33, 18], [100, 276, -1, 14, 9],
];
const NECK: Key[] = [[100, 50, -3, 10, 10], [100, 64, -3, 10.5, 10.5], [100, 76, -3, 12, 11]];
const ARM: Key[] = [
  [138, 86, -2, 12, 12], [146, 112, -2, 10.5, 10.5], [150, 140, -2, 10, 10], [154, 172, -2, 10, 9.5],
  [160, 200, -1, 9.5, 8.5], [167, 235, 0, 8.5, 7], [173, 264, 0, 7, 4.5], [176, 276, 0, 6, 3.5],
];
const LEG: Key[] = [
  [115, 222, -1, 15, 14], [118, 246, -1, 19, 18], [120, 272, 0, 18, 17], [120, 300, 0, 16, 15], [119, 330, 1, 13, 12],
  [119, 350, -1, 13, 13], [118, 375, -1, 11.5, 11], [118, 392, -1, 11, 10], [118, 412, -1, 9, 8],
  [118, 426, -3, 7, 7],
];

function buildSkin(time: { value: number }) {
  const g = new THREE.Group();
  const mat = holoMaterial(CYAN, time, { base: 0.025, rim: 0.55, power: 2.4, scan: 1 });
  const add = (geo: THREE.BufferGeometry) => g.add(named(new THREE.Mesh(geo, mat), 'Pele'));
  add(loft(TORSO, 0.9));
  add(loft(NECK));
  add(loft(ARM));
  add(loft(mirrorKeys(ARM)));
  add(loft(LEG));
  add(loft(mirrorKeys(LEG)));
  g.add(named(ellipsoid(P(100, 33, 1), 23, 27, 25, mat), 'Pele'));
  g.add(named(ellipsoid(P(100, 44, 23), 3, 6, 4, mat), 'Pele'));
  both(g, (m) => named(ellipsoid(m(P(123, 36, 0)), 3, 7, 5, mat), 'Pele'));
  // mãos (palmas para a frente) e polegares
  both(g, (m, s) => named(ellipsoid(m(P(179, 286, 0)), 8.5, 24, 4.2, mat, 0.26 * s), 'Pele'));
  both(g, (m, s) => named(ellipsoid(m(P(188, 286, 2)), 3, 9, 3, mat, 0.6 * s), 'Pele'));
  // pés (apontando para a frente)
  both(g, (m) => named(ellipsoid(m(P(122, 430, 9)), 12, 7, 19, mat), 'Pele'));
  return g;
}

function spineZ(y: number) {
  const k: [number, number][] = [[50, -6], [78, -9], [110, -16], [150, -16], [190, -12], [225, -12], [262, -16]];
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i][0]) {
      const t = (y - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
    }
  }
  return k[k.length - 1][1];
}

function torsoHalfWidth(y: number) {
  for (let i = 1; i < TORSO.length; i++) {
    if (y <= TORSO[i][1]) {
      const t = (y - TORSO[i - 1][1]) / (TORSO[i][1] - TORSO[i - 1][1]);
      return TORSO[i - 1][3] + (TORSO[i][3] - TORSO[i - 1][3]) * t;
    }
  }
  return TORSO[TORSO.length - 1][3];
}

function buildBones(time: { value: number }) {
  const g = new THREE.Group();
  const mat = holoMaterial('#EDE6D6', time, { base: 0.12, rim: 0.7, power: 1.6 });
  const T = (pts: THREE.Vector3[], r: number, label: string) => named(tube(pts, r, mat), label);
  const E = (c: THREE.Vector3, rx: number, ry: number, rz: number, label: string, rotZ = 0, rotY = 0) =>
    named(ellipsoid(c, rx, ry, rz, mat, rotZ, rotY), label);

  // cabeça
  g.add(E(P(100, 31, 0), 20, 24, 22, 'Crânio'));
  g.add(T([P(83, 44, 4), P(89, 57, 15), P(100, 61, 19), P(111, 57, 15), P(117, 44, 4)], 2.4, 'Mandíbula'));

  // coluna: vértebras com o processo espinhoso atrás
  const vGeo = new THREE.CylinderGeometry(1, 1, 1, 14);
  for (let y = 54; y <= 250; y += 6.5) {
    const r = y < 78 ? 3.5 : y < 190 ? 4.5 : 5.5;
    const label = y < 78 ? 'Coluna cervical' : y < 190 ? 'Coluna torácica' : y < 235 ? 'Coluna lombar' : 'Sacro';
    const v = named(new THREE.Mesh(vGeo, mat), label);
    v.position.copy(P(100, y, spineZ(y)));
    v.scale.set(r, 4.2, r * 0.85);
    g.add(v);
    g.add(E(P(100, y + 1, spineZ(y) - r - 2), 1.2, 2, 2.5, label));
  }

  // costelas (10 pares), esterno e clavículas
  for (let i = 0; i < 10; i++) {
    const y0 = 94 + i * 8;
    const hw = torsoHalfWidth(y0 + 8) * 0.9;
    const zs = spineZ(y0);
    const end = i < 7 ? P(104, y0 + 18, 20) : P(100 + hw * 0.45, y0 + 24, 17);
    both(g, (m) => T([P(103, y0, zs + 2), P(100 + hw * 0.55, y0 + 2, -15), P(100 + hw * 0.95, y0 + 8, -2),
      P(100 + hw * 0.62, y0 + 14, 15), end].map(m), 1.3, 'Costela'));
  }
  g.add(E(P(100, 126, 20), 3.5, 22, 1.6, 'Esterno'));
  both(g, (m) => T([P(103, 80, 13), P(118, 79, 14), P(134, 84, 3)].map(m), 1.7, 'Clavícula'));
  both(g, (m, s) => E(m(P(121, 108, -18)), 10, 17, 1.8, 'Escápula', 0.15 * s));

  // bacia
  both(g, (m, s) => E(m(P(119, 226, -4)), 13, 12, 3, 'Osso do quadril (ílio)', 0, 0.55 * s));
  g.add(E(P(100, 246, -14), 8, 14, 3, 'Sacro'));
  g.add(T([P(118, 242, -2), P(112, 256, 8), P(100, 260, 12), P(88, 256, 8), P(82, 242, -2)], 2.4, 'Púbis'));

  // braços e mãos
  both(g, (m) => {
    const arm = new THREE.Group();
    arm.add(E(m(P(139, 90, -2)), 5, 5, 5, 'Úmero (osso do braço)'));
    arm.add(T([P(139, 90, -2), P(147, 140, -2), P(156, 190, -2)].map(m), 2.6, 'Úmero (osso do braço)'));
    arm.add(T([P(158, 194, 0), P(168, 232, 1), P(177, 262, 1)].map(m), 1.8, 'Rádio (antebraço)'));
    arm.add(T([P(154, 196, -1), P(162, 232, -1), P(169, 262, -1)].map(m), 1.6, 'Ulna (antebraço)'));
    for (let f = 0; f < 4; f++) {
      arm.add(T([P(171 + f * 2.5, 270, 0), P(173 + f * 3.2, 285, 0), P(175 + f * 3.6, 306 - Math.abs(f - 1.5) * 3, 0)].map(m), 0.9, 'Ossos da mão'));
    }
    arm.add(T([P(180, 268, 1), P(186, 282, 2), P(190, 296, 2)].map(m), 0.9, 'Ossos da mão (polegar)'));
    return arm;
  });

  // pernas e pés
  both(g, (m) => {
    const leg = new THREE.Group();
    leg.add(E(m(P(114, 250, -2)), 5, 5, 5, 'Fêmur (osso da coxa)'));
    leg.add(T([P(114, 250, -2), P(122, 262, -2), P(121, 300, -1), P(119, 328, -1)].map(m), 3.2, 'Fêmur (osso da coxa)'));
    leg.add(E(m(P(119, 330, 12)), 4, 5, 1.6, 'Patela (rótula)'));
    leg.add(T([P(118, 336, 2), P(117, 375, 2), P(116, 412, 0)].map(m), 2.6, 'Tíbia'));
    leg.add(T([P(127, 338, -3), P(127, 375, -3), P(126, 414, -2)].map(m), 1.4, 'Fíbula'));
    for (let i = 0; i < 5; i++) {
      leg.add(T([P(121, 432, -6), P(116 + i * 3, 431, 10), P(112 + i * 5.5, 434, 26)].map(m), 1, 'Ossos do pé'));
    }
    return leg;
  });
  return g;
}

// Profundidade (Z) e espessura de cada órgão; x/y vêm do mapa 2D.
const ORGAN_DEPTH: Record<string, { z: number; rz: number }> = {
  'Pulmão': { z: -1, rz: 15 },
  'Coração': { z: 9, rz: 8 },
  'Fígado': { z: 4, rz: 13 },
  'Vesícula Biliar': { z: 12, rz: 4 },
  'Estômago': { z: 8, rz: 7 },
  'Baço-Pâncreas': { z: 0, rz: 6 },
  'Intestino Grosso': { z: 6, rz: 4 },
  'Intestino Delgado': { z: 7, rz: 9 },
  'Bexiga': { z: 8, rz: 6 },
  'Rim': { z: -11, rz: 5 },
};

function buildOrgans(time: { value: number }) {
  const g = new THREE.Group();
  const meshes = new Map<string, THREE.Mesh[]>();
  for (const o of ORGANS) {
    const d = ORGAN_DEPTH[o.organ] ?? { z: 0, rz: 6 };
    const list: THREE.Mesh[] = [];
    for (const s of o.shapes) {
      const mat = holoMaterial(CYAN, time, { base: 0.06, rim: 0.35, power: 1.8 });
      const mesh = s.kind === 'ellipse'
        ? ellipsoid(P(s.cx, s.cy, d.z), s.rx, s.ry, d.rz, mat)
        : tube(s.pts.map(([x, y]) => P(x, y, d.z)), s.width / 2 + 1, mat);
      named(mesh, o.organ);
      mesh.userData.organ = o.organ;
      list.push(mesh);
      g.add(mesh);
    }
    meshes.set(o.organ, list);
  }
  return { group: g, meshes };
}

function buildSystems(time: { value: number }) {
  const flow = (color: string, repeat = 22) => holoMaterial(color, time, { base: 0.35, rim: 0.6, power: 1.4, flow: 1, repeat });
  const solid = (color: string) => holoMaterial(color, time, { base: 0.1, rim: 0.7, power: 1.8 });

  // --- circulação: artérias (vermelho) e veias (azul)
  const circ = new THREE.Group();
  const art = flow('#FF4D5E');
  const vein = flow('#4D7CFF');
  const T = (g: THREE.Group, pts: THREE.Vector3[], r: number, mat: THREE.Material, label: string) => g.add(named(tube(pts, r, mat), label));
  T(circ, [P(104, 124, 6), P(103, 108, 2), P(97, 104, -4), P(97, 118, -9), P(97, 170, -8), P(98, 226, -6)], 2.6, art, 'Aorta');
  T(circ, [P(110, 40, 0), P(108, 70, 0), P(106, 104, -1), P(107, 124, 3)], 2, vein, 'Veia cava superior / jugular');
  T(circ, [P(107, 132, 0), P(105, 170, -6), P(103, 226, -5)], 2.4, vein, 'Veia cava inferior');
  const legArt = [P(98, 226, -6), P(110, 240, -2), P(114, 262, 4), P(116, 300, 4), P(117, 330, -6), P(117, 370, -4), P(117, 410, -2), P(120, 428, 16)];
  const armArt = [P(99, 104, -3), P(118, 86, 0), P(136, 92, 0), P(146, 120, 1), P(152, 160, 2), P(158, 190, 3), P(166, 230, 2), P(173, 262, 2), P(180, 286, 2)];
  const shift = (pts: THREE.Vector3[], dx: number, dz: number) => pts.map((v) => new THREE.Vector3(v.x + dx, v.y, v.z + dz));
  both(circ, (m) => named(tube(legArt.map(m), 1.6, art), 'Artéria femoral'));
  both(circ, (m) => named(tube(shift(legArt, 3, -1.5).slice(1).map(m), 1.6, vein), 'Veia femoral'));
  both(circ, (m) => named(tube(armArt.map(m), 1.3, art), 'Artéria do braço'));
  both(circ, (m) => named(tube(shift(armArt, 2.5, -1.5).slice(1).map(m), 1.3, vein), 'Veia do braço'));
  both(circ, (m) => named(tube([P(101, 106, -2), P(94, 90, 0), P(92, 70, 2), P(90, 50, 2), P(90, 30, 0)].map(m), 1.3, art), 'Artéria carótida'));

  // --- sistema nervoso
  const nerv = new THREE.Group();
  const nmat = flow('#FFD54A', 30);
  both(nerv, (m) => named(ellipsoid(m(P(108, 26, -1)), 9, 14, 19, solid('#FFD54A')), 'Cérebro'));
  nerv.add(named(ellipsoid(P(100, 46, -12), 9, 6, 7, solid('#FFD54A')), 'Cerebelo'));
  const cord: THREE.Vector3[] = [];
  for (let y = 48; y <= 236; y += 12) cord.push(P(100, y, spineZ(y) - 0.5));
  T(nerv, cord, 1.6, nmat, 'Medula espinhal');
  both(nerv, (m) => named(tube([P(103, 80, -8), P(118, 84, -4), P(137, 94, -3), P(148, 130, -1), P(155, 180, 1), P(165, 230, 1), P(174, 264, 1), P(180, 290, 1)].map(m), 0.9, nmat), 'Nervos do braço (plexo braquial)'));
  both(nerv, (m) => named(tube([P(103, 240, -14), P(112, 252, -12), P(120, 275, -10), P(120, 320, -8), P(119, 340, -5), P(118, 410, -3), P(122, 432, 10)].map(m), 1.2, nmat), 'Nervo ciático'));
  for (let i = 0; i < 6; i++) {
    const y = 104 + i * 12;
    both(nerv, (m) => named(tube([P(102, y, spineZ(y)), P(100 + torsoHalfWidth(y) * 0.9, y + 8, -2), P(100 + torsoHalfWidth(y) * 0.55, y + 14, 16)].map(m), 0.5, nmat), 'Nervo intercostal'));
  }

  // --- respiração
  const resp = new THREE.Group();
  const rmat = flow('#9FE8FF', 14);
  resp.add(named(ellipsoid(P(100, 60, 9), 4, 5, 3, solid('#9FE8FF')), 'Laringe'));
  T(resp, [P(100, 56, 8), P(100, 80, 7), P(100, 106, 3)], 2.6, rmat, 'Traqueia');
  both(resp, (m) => named(tube([P(100, 106, 3), P(92, 114, 1), P(84, 120, -1), P(80, 134, -1)].map(m), 1.6, rmat), 'Brônquio'));
  both(resp, (m) => named(tube([P(92, 114, 1), P(84, 104, 0), P(80, 96, 0)].map(m), 1, rmat), 'Brônquio'));
  both(resp, (m) => named(tube([P(86, 119, -1), P(76, 124, 4), P(72, 132, 6)].map(m), 0.8, rmat), 'Bronquíolos'));

  // --- digestão
  const dig = new THREE.Group();
  const dmat = flow('#FFA552', 16);
  T(dig, [P(100, 58, 4), P(100, 90, -4), P(101, 130, -6), P(106, 148, 0), P(112, 152, 6)], 1.8, dmat, 'Esôfago');
  T(dig, [P(102, 158, 6), P(95, 165, 4), P(100, 172, 4)], 1.6, dmat, 'Duodeno');
  T(dig, [P(120, 226, 6), P(110, 240, -2), P(100, 250, -8), P(100, 262, -10)], 2.5, dmat, 'Reto (fim do intestino)');

  // --- urinário
  const uri = new THREE.Group();
  const umat = flow('#5CFFB0', 12);
  both(uri, (m) => named(tube([P(90, 204, -9), P(93, 220, -4), P(96, 236, 4)].map(m), 1, umat), 'Ureter'));
  T(uri, [P(100, 246, 8), P(100, 262, 6)], 1, umat, 'Uretra');

  return { circulacao: circ, nervos: nerv, respiracao: resp, digestao: dig, urinario: uri };
}

// ---------------------------------------------------------------- pontos

export type PlacedPoint = {
  code: string;
  label: string; // região
  positions: { pos: THREE.Vector3; normal: THREE.Vector3; labelled: boolean }[];
  objects: { core: THREE.Mesh; glow: THREE.Sprite; hit: THREE.Mesh }[];
};

const HIT_GEO = new THREE.SphereGeometry(6, 8, 6);
const CORE_GEO = new THREE.SphereGeometry(1, 16, 12);

// Coloca o ponto na superfície da pele: "atira" um raio de frente (ou de
// costas) na posição x/y do mapa 2D. Se o raio passar ao lado do corpo
// (pontos bem na borda do braço/perna), tenta pela lateral e depois por
// perto.
function placeOnSkin(skin: THREE.Object3D[], x: number, y: number, front: boolean) {
  const ray = new THREE.Raycaster();
  const dirZ = front ? -1 : 1;
  const tryRay = (o: THREE.Vector3, d: THREE.Vector3) => {
    ray.set(o, d.normalize());
    const hit = ray.intersectObjects(skin, false)[0];
    if (!hit || !hit.face) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (normal.dot(d) > 0) normal.negate();
    return { pos: hit.point.clone(), normal };
  };
  const X = x - 100;
  const Y = BODY_H - y;
  let r = tryRay(new THREE.Vector3(X, Y, -dirZ * 500), new THREE.Vector3(0, 0, dirZ));
  if (!r && X !== 0) r = tryRay(new THREE.Vector3(Math.sign(X) * 400, Y, front ? 3 : -3), new THREE.Vector3(-Math.sign(X), 0, 0));
  for (let rad = 3; !r && rad <= 12; rad += 3) {
    for (let a = 0; a < 8 && !r; a++) {
      const ang = (a / 8) * Math.PI * 2;
      r = tryRay(new THREE.Vector3(X + Math.cos(ang) * rad, Y + Math.sin(ang) * rad, -dirZ * 500), new THREE.Vector3(0, 0, dirZ));
    }
  }
  return r ?? { pos: new THREE.Vector3(X, Y, front ? 15 : -15), normal: new THREE.Vector3(0, 0, -dirZ) };
}

// ---------------------------------------------------------------- cena

export type BodyScene = {
  root: THREE.Group;
  layers: Record<LayerKey, THREE.Group>;
  points: PlacedPoint[];
  pointHits: THREE.Mesh[];
  setResult: (body: BodyResult) => void;
  setSelected: (code: string | null) => void;
  tick: (t: number) => void;
  dispose: () => void;
};

export function createBodyScene(): BodyScene {
  const time = { value: 0 };
  const root = new THREE.Group();

  const skin = buildSkin(time);
  const bones = buildBones(time);
  const organs = buildOrgans(time);
  const systems = buildSystems(time);
  const pointsGroup = new THREE.Group();

  const layers: Record<LayerKey, THREE.Group> = {
    pele: skin,
    ossos: bones,
    orgaos: organs.group,
    ...systems,
    pontos: pointsGroup,
  };
  for (const l of LAYERS) {
    layers[l.key].visible = l.on;
    root.add(layers[l.key]);
  }
  root.updateMatrixWorld(true);
  const skinMeshes = skin.children;

  const scene: BodyScene = {
    root,
    layers,
    points: [],
    pointHits: [],
    setResult,
    setSelected,
    tick,
    dispose,
  };

  let selected: string | null = null;
  const organPulse: THREE.Mesh[] = [];
  const heart = organs.meshes.get('Coração') ?? [];
  const heartScale = heart.map((m) => m.scale.clone());

  function setResult(body: BodyResult) {
    // órgãos: acendem na cor do elemento, conforme o comprometimento
    const hit = new Map(body.organs.map((o) => [o.organ, o]));
    organPulse.length = 0;
    for (const [organ, list] of organs.meshes) {
      const h = hit.get(organ);
      for (const m of list) {
        const u = (m.material as THREE.ShaderMaterial).uniforms;
        u.uColor.value.set(h ? shade(ELEMENT_COLOR[h.element] ?? CYAN, 1.35) : CYAN);
        u.uBase.value = h ? 0.12 + 0.4 * h.intensity : 0.05;
        u.uRim.value = h ? 0.6 + 0.4 * h.intensity : 0.3;
        u.uOpacity.value = 1;
        m.userData.label = h ? `${organ} — ${Math.round(h.intensity * 100)}% (${h.element})` : `${organ} — sem alteração`;
        if (h && h.intensity > 0.99) organPulse.push(m);
      }
    }

    // pontos: refaz todos
    for (const p of scene.points) {
      for (const o of p.objects) {
        (o.core.material as THREE.Material).dispose();
        o.glow.material.dispose();
        pointsGroup.remove(o.core, o.glow, o.hit);
      }
    }
    scene.points = [];
    scene.pointHits = [];
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    for (const p of body.points) {
      const front = p.def.view === 'front';
      const positions = pointPositions(p.def).map(([x, y], i) => {
        const s = placeOnSkin(skinMeshes, x, y, front);
        return { pos: s.pos.addScaledVector(s.normal, 0.8), normal: s.normal, labelled: i === 0 };
      });
      const objects = positions.map(({ pos }) => {
        const core = new THREE.Mesh(CORE_GEO, new THREE.MeshBasicMaterial({ color: POINT, transparent: true, depthWrite: false }));
        core.position.copy(pos);
        core.scale.setScalar(1.8);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTexture(), color: POINT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.position.copy(pos);
        glow.scale.setScalar(10);
        const hitMesh = new THREE.Mesh(HIT_GEO, hitMat);
        hitMesh.position.copy(pos);
        hitMesh.userData.code = p.code;
        pointsGroup.add(core, glow, hitMesh);
        scene.pointHits.push(hitMesh);
        return { core, glow, hit: hitMesh };
      });
      scene.points.push({ code: p.code, label: p.def.region, positions, objects });
    }
    setSelected(selected);
  }

  function setSelected(code: string | null) {
    selected = code;
    for (const p of scene.points) {
      const on = p.code === code;
      for (const o of p.objects) {
        (o.core.material as THREE.MeshBasicMaterial).color.set(on ? POINT_SELECTED : POINT);
        o.glow.material.color.set(on ? POINT_SELECTED : POINT);
        o.core.scale.setScalar(on ? 2.8 : 1.8);
        o.glow.userData.base = on ? 18 : 10;
      }
    }
  }

  function tick(t: number) {
    time.value = t;
    const beat = Math.pow(Math.max(0, Math.sin(t * 7.5)), 8);
    heart.forEach((m, i) => m.scale.copy(heartScale[i]).multiplyScalar(1 + 0.08 * beat));
    const glow = 0.5 + 0.5 * Math.sin(t * 4);
    for (const m of organPulse) (m.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.65 + 0.35 * glow;
    for (const p of scene.points) {
      const on = p.code === selected;
      for (const o of p.objects) {
        const base = (o.glow.userData.base as number) ?? 10;
        o.glow.scale.setScalar(on ? base * (1 + 0.35 * glow) : base);
      }
    }
  }

  function dispose() {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        if (obj.geometry !== SPHERE && obj.geometry !== HIT_GEO && obj.geometry !== CORE_GEO) obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }

  return scene;
}

// Enquadramentos prontos da câmera: [alvo, direção de onde olhar, distância]
export const FOCUS: Record<string, { label: string; target: [number, number, number]; dir: [number, number, number]; dist: number }> = {
  corpo: { label: 'Corpo todo', target: [0, 215, 0], dir: [0, 0.08, 1], dist: 780 },
  cabeca: { label: 'Cabeça', target: [0, 400, 0], dir: [0.3, 0.1, 1], dist: 220 },
  tronco: { label: 'Tronco', target: [0, 270, 0], dir: [0.2, 0.05, 1], dist: 420 },
  maos: { label: 'Mãos', target: [80, 160, 0], dir: [0.35, 0.05, 1], dist: 190 },
  pes: { label: 'Pés', target: [0, 30, 10], dir: [0.25, 0.55, 1], dist: 230 },
};
