import * as THREE from 'three';

// Material "holograma" e brilho dos pontos, usados pelo corpo 3D e pela
// orelha 3D.

export type HoloOpts = { base: number; rim: number; power?: number; scan?: number; flow?: number; repeat?: number; opacity?: number };

const VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  varying vec2 vUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * wp;
    vY = wp.y;
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uRim;
  uniform float uPower;
  uniform float uScan;
  uniform float uFlow;
  uniform float uRepeat;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  varying vec2 vUv;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    float a = uBase + uRim * f;
    // faixas horizontais finas + uma faixa de "varredura" que sobe
    float lines = 0.5 + 0.5 * sin(vY * 1.2);
    float band = 1.0 - clamp(abs(mod(vY - uTime * 60.0, 520.0) - 8.0) / 8.0, 0.0, 1.0);
    a += uScan * (0.05 * lines + 0.45 * band);
    // pulso correndo ao longo dos tubos (sangue, impulso nervoso...)
    float pulse = pow(0.5 + 0.5 * sin(vUv.x * uRepeat - uTime * 3.0), 6.0);
    a *= mix(1.0, 0.45 + 1.1 * pulse, uFlow);
    gl_FragColor = vec4(uColor * (0.75 + 0.6 * f), a * uOpacity);
  }
`;

export function holoMaterial(color: string, time: { value: number }, o: HoloOpts) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBase: { value: o.base },
      uRim: { value: o.rim },
      uPower: { value: o.power ?? 2.2 },
      uScan: { value: o.scan ?? 0 },
      uFlow: { value: o.flow ?? 0 },
      uRepeat: { value: o.repeat ?? 20 },
      uOpacity: { value: o.opacity ?? 1 },
      uTime: time,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

let glowTexture: THREE.Texture | null = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}
