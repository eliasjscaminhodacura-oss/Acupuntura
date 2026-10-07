import * as THREE from 'three';
import { getGlowTexture } from './holo';
import { PONTOS, REGIAO, type Lado, type PontoAuricular } from './auriculo';

// Orelha 3D (escaneamento real) com os pontos de auriculoterapia.
// Dois visuais: "holograma" (translúcido, ciano) e "pele" (realista).
// Medidas em milímetros; o modelo é uma orelha esquerda e a direita é o
// espelho (escala X = -1 no grupo raiz).

export type Visual = 'holograma' | 'pele';

const POINT = '#FFE27A';
const POINT_SELECTED = '#FF3B3B';

// A pele em volta da orelha some aos poucos na borda do recorte elíptico
// (mesmas medidas do recorte feito no modelo).
const FADE = /* glsl */ `
  float fade(vec3 p) {
    vec2 q = vec2((p.x + 2.6) / 25.0, (p.y - 1.3) / 39.0);
    return 1.0 - smoothstep(0.72, 0.98, length(q));
  }
`;

const VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vP = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const HOLO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  ${FADE}
  void main() {
    vec3 n = normalize(vN);
    float f = pow(1.0 - abs(dot(n, normalize(vV))), 2.0);
    float a = 0.05 + 0.75 * f;
    float lines = 0.5 + 0.5 * sin(vP.y * 3.0);
    float band = 1.0 - clamp(abs(mod(vP.y + 45.0 - uTime * 18.0, 110.0) - 3.0) / 3.0, 0.0, 1.0);
    a += 0.05 * lines + 0.35 * band;
    gl_FragColor = vec4(uColor * (0.7 + 0.7 * f), a * fade(vP));
  }
`;

const SKIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  ${FADE}
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    vec3 key = normalize(vec3(-0.45, 0.6, 0.65));
    vec3 fill = normalize(vec3(0.6, -0.25, 0.6));
    float d = max(dot(n, key), 0.0) * 0.85 + max(dot(n, fill), 0.0) * 0.3;
    // luz que "atravessa" a pele nas bordas (tom quente) + brilho suave
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float spec = pow(max(dot(n, normalize(key + v)), 0.0), 24.0) * 0.12;
    vec3 col = uColor * (0.22 + d * 0.95) + vec3(0.5, 0.2, 0.12) * rim * 0.15 + spec;
    gl_FragColor = vec4(col, fade(vP));
    #include <colorspace_fragment>
  }
`;

export type EarPoint = {
  p: PontoAuricular;
  pos: THREE.Vector3; // no espaço do modelo
  normal: THREE.Vector3;
  core: THREE.Mesh;
  glow: THREE.Sprite;
  hit: THREE.Mesh;
};

export type EarScene = {
  root: THREE.Group;
  points: EarPoint[];
  pointHits: THREE.Mesh[];
  setVisual: (v: Visual) => void;
  setLado: (l: Lado) => void;
  setSelected: (code: string | null) => void;
  setHighlighted: (codes: Set<string> | null) => void;
  worldPos: (pt: EarPoint) => THREE.Vector3;
  worldNormal: (pt: EarPoint) => THREE.Vector3;
  tick: (t: number) => void;
  dispose: () => void;
};

const CORE_GEO = new THREE.SphereGeometry(0.75, 14, 10);
const HIT_GEO = new THREE.SphereGeometry(2.4, 8, 6);

export function createEarScene(geometry: THREE.BufferGeometry): EarScene {
  const time = { value: 0 };
  const root = new THREE.Group();

  const holo = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: HOLO_FRAG,
    uniforms: { uColor: { value: new THREE.Color('#5CE1E6') }, uTime: time },
    transparent: true,
    depthWrite: false,
    depthTest: false, // todas as camadas da orelha somam o brilho
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const skin = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SKIN_FRAG,
    uniforms: { uColor: { value: new THREE.Color('#e6bfa8') } },
    transparent: true,
    side: THREE.DoubleSide,
  });
  // No holograma a orelha é transparente, mas os pontos atrás das dobras
  // devem ficar escondidos: uma cópia invisível grava só a profundidade.
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

  const ear = new THREE.Mesh(geometry, holo);
  const earDepth = new THREE.Mesh(geometry, depthOnly);
  earDepth.renderOrder = -1;
  root.add(earDepth, ear);

  const glowMap = getGlowTexture();
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const points: EarPoint[] = PONTOS.map((p) => {
    const normal = new THREE.Vector3(...p.normal).normalize();
    const pos = new THREE.Vector3(...p.pos).addScaledVector(normal, 0.35);
    const core = new THREE.Mesh(CORE_GEO, new THREE.MeshBasicMaterial({ color: POINT, transparent: true }));
    core.position.copy(pos);
    core.renderOrder = 2;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: POINT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.copy(pos).addScaledVector(normal, 1.2);
    glow.scale.setScalar(2.8);
    glow.renderOrder = 3;
    const hit = new THREE.Mesh(HIT_GEO, hitMat);
    hit.position.copy(pos);
    hit.userData.code = p.codigo;
    root.add(core, glow, hit);
    return { p, pos, normal, core, glow, hit };
  });

  let selected: string | null = null;
  let highlighted: Set<string> | null = null;
  let glowLevel = 1; // na pele o brilho fica mais discreto

  function paint() {
    for (const pt of points) {
      const on = pt.p.codigo === selected;
      const lit = !highlighted || highlighted.has(pt.p.codigo);
      const color = on ? POINT_SELECTED : lit && highlighted ? REGIAO[pt.p.regiao].cor : POINT;
      (pt.core.material as THREE.MeshBasicMaterial).color.set(color);
      (pt.core.material as THREE.MeshBasicMaterial).opacity = lit || on ? 1 : 0.18;
      pt.glow.material.color.set(color);
      pt.glow.material.opacity = (lit || on ? 1 : 0.1) * (on ? 1 : glowLevel);
      // o ponto escolhido aparece mesmo atrás de uma dobra
      pt.glow.material.depthTest = !on;
      pt.core.scale.setScalar(on ? 1.6 : 1);
      pt.glow.userData.base = on ? 5.5 : 2.8;
    }
  }
  paint();

  const scene: EarScene = {
    root,
    points,
    pointHits: points.map((p) => p.hit),
    setVisual(v) {
      ear.material = v === 'pele' ? skin : holo;
      earDepth.visible = v === 'holograma';
      glowLevel = v === 'pele' ? 0.35 : 1;
      paint();
    },
    setLado(l) {
      root.scale.x = l === 'direita' ? -1 : 1;
      root.updateMatrixWorld(true);
    },
    setSelected(code) {
      selected = code;
      paint();
    },
    setHighlighted(codes) {
      highlighted = codes;
      paint();
    },
    worldPos: (pt) => pt.pos.clone().applyMatrix4(root.matrixWorld),
    worldNormal: (pt) => pt.normal.clone().multiply(new THREE.Vector3(root.scale.x, 1, 1)).normalize(),
    tick(t) {
      time.value = t;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      for (const pt of points) {
        const base = (pt.glow.userData.base as number) ?? 2.8;
        pt.glow.scale.setScalar(pt.p.codigo === selected ? base * (1 + 0.35 * pulse) : base);
      }
    },
    dispose() {
      geometry.dispose();
      holo.dispose();
      skin.dispose();
      depthOnly.dispose();
      hitMat.dispose();
      for (const pt of points) {
        (pt.core.material as THREE.Material).dispose();
        pt.glow.material.dispose();
      }
    },
  };
  return scene;
}

// Enquadramentos prontos: alvo e direção no espaço da orelha esquerda
// (a orelha direita troca o sinal de X). Distância em mm.
export const VIEWS: Record<string, { label: string; target: [number, number, number]; dir: [number, number, number]; dist: number }> = {
  frente: { label: 'Frente', target: [0, 0, -4], dir: [0, 0.05, 1], dist: 150 },
  dorso: { label: 'Dorso', target: [10, 0, -4], dir: [1, 0.1, -0.15], dist: 150 },
  concha: { label: 'Concha', target: [0, 1, -12], dir: [0.15, 0.1, 1], dist: 95 },
  fossa: { label: 'Fossa e ramos', target: [-2, 17, 0], dir: [0, 0.35, 1], dist: 95 },
  trago: { label: 'Trago', target: [-8, -3, -7], dir: [-0.55, 0, 1], dist: 85 },
  lobulo: { label: 'Antítrago e lóbulo', target: [3, -17, -4], dir: [0, -0.15, 1], dist: 100 },
};
