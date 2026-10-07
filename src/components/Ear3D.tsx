'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createEarScene, VIEWS, type EarScene, type Visual } from '@/lib/ear3d';
import { MODELO, type Lado } from '@/lib/auriculo';

type Props = {
  lado: Lado;
  visual: Visual;
  selected: string | null;
  highlighted: Set<string> | null; // pontos do filtro/busca (null = todos)
  onSelect: (code: string | null) => void;
  onFail: () => void; // aparelho sem 3D (WebGL): volta para o mapa 2D
};

type Api = {
  scene: EarScene;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  focus: (target: THREE.Vector3, dir: THREE.Vector3, dist: number) => void;
  rebuildLabels: () => void;
};

// Carrega a orelha (comprimida com meshopt) e devolve uma malha comum em
// milímetros, com a posição do nó já aplicada.
async function loadEar(): Promise<THREE.BufferGeometry> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(MODELO.arquivo);
  gltf.scene.updateMatrixWorld(true);
  let mesh: THREE.Mesh | null = null;
  gltf.scene.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
  if (!mesh) throw new Error('modelo sem malha');
  const m = mesh as THREE.Mesh;
  const src = m.geometry.getAttribute('position');
  const pos = new Float32Array(src.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < src.count; i++) {
    v.fromBufferAttribute(src, i).applyMatrix4(m.matrixWorld);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(m.geometry.getIndex());
  geo.computeVertexNormals();
  m.geometry.dispose();
  return geo;
}

const V = (a: [number, number, number]) => new THREE.Vector3(...a);

export default function Ear3D({ lado, visual, selected, highlighted, onSelect, onFail }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const cb = useRef({ onSelect, onFail, selected, highlighted, lado });
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hint, setHint] = useState(true);
  const shownLado = useRef<Lado>('esquerda'); // o modelo é uma orelha esquerda

  useEffect(() => {
    cb.current = { onSelect, onFail, selected, highlighted, lado };
  });

  // Monta a cena uma vez.
  useEffect(() => {
    const stage = stageRef.current!;
    const labelsEl = labelsRef.current!;
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      cb.current.onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    stage.prepend(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    const world = new THREE.Scene();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 35;
    controls.maxDistance = 400;
    controls.autoRotateSpeed = 2;
    const f0 = VIEWS.frente;
    controls.target.copy(V(f0.target));
    camera.position.copy(V(f0.target).addScaledVector(V(f0.dir).normalize(), f0.dist));

    // Voo suave da câmera até um enquadramento.
    let flight: null | { t0: number; fromT: THREE.Vector3; toT: THREE.Vector3; fromDir: THREE.Vector3; q: THREE.Quaternion; fromD: number; toD: number } = null;
    const focus = (target: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
      const off = camera.position.clone().sub(controls.target);
      const fromDir = off.clone().normalize();
      flight = {
        t0: performance.now(),
        fromT: controls.target.clone(),
        toT: target.clone(),
        fromDir,
        q: new THREE.Quaternion().setFromUnitVectors(fromDir, dir.clone().normalize()),
        fromD: off.length(),
        toD: dist,
      };
    };
    controls.addEventListener('start', () => {
      flight = null;
      setAutoRotate(false);
      setHint(false);
    });

    let scene: EarScene | null = null;
    let labels: { el: HTMLButtonElement; code: string }[] = [];

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // Toque/clique sem arrastar: escolhe o ponto mais próximo da câmera.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!scene || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hits = ray.intersectObjects(scene.pointHits, false).filter((h) => {
        const pt = scene!.points.find((p) => p.p.codigo === h.object.userData.code)!;
        return facing(pt);
      });
      const code = hits[0]?.object.userData.code as string | undefined;
      if (code) cb.current.onSelect(cb.current.selected === code ? null : code);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const tmp = new THREE.Vector3();
    const facing = (pt: EarScene['points'][number]) => {
      const wp = scene!.worldPos(pt);
      return tmp.copy(camera.position).sub(wp).dot(scene!.worldNormal(pt)) > 0;
    };

    // Só desenha quando a orelha está visível na tela (poupa bateria).
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    io.observe(stage);

    const proj = new THREE.Vector3();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden) return;
      if (flight) {
        const k = Math.min(1, (now - flight.t0) / 900);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        controls.target.lerpVectors(flight.fromT, flight.toT, e);
        const dir = flight.fromDir.clone().applyQuaternion(new THREE.Quaternion().slerp(flight.q, e));
        camera.position.copy(controls.target).addScaledVector(dir, flight.fromD + (flight.toD - flight.fromD) * e);
        if (k === 1) flight = null;
      }
      controls.update();
      if (!scene) return;
      scene.tick(now / 1000);
      renderer.render(world, camera);

      const w = stage.clientWidth;
      const h = stage.clientHeight;
      for (const l of labels) {
        const pt = scene.points.find((p) => p.p.codigo === l.code)!;
        proj.copy(scene.worldPos(pt)).project(camera);
        const visible = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && (l.code === cb.current.selected || facing(pt));
        l.el.style.display = visible ? '' : 'none';
        if (visible) l.el.style.transform = `translate(${((proj.x + 1) / 2) * w + 6}px, ${((1 - proj.y) / 2) * h - 8}px)`;
      }
    };
    raf = requestAnimationFrame(loop);

    const rebuildLabels = () => {
      labelsEl.replaceChildren();
      labels = [];
      if (!scene) return;
      const { selected: sel, highlighted: hl } = cb.current;
      for (const pt of scene.points) {
        const code = pt.p.codigo;
        if (code !== sel && !(hl && hl.has(code) && hl.size <= 30)) continue;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'body3d-label' + (code === sel ? ' active' : '');
        el.textContent = code === sel ? `${code} · ${pt.p.nome}` : pt.p.nome;
        el.title = `${code} — ${pt.p.nome}`;
        el.onclick = () => cb.current.onSelect(cb.current.selected === code ? null : code);
        labelsEl.appendChild(el);
        labels.push({ el, code });
      }
    };

    loadEar()
      .then((geo) => {
        if (disposed) { geo.dispose(); return; }
        scene = createEarScene(geo);
        world.add(scene.root);
        api.current = { scene, controls, camera, focus, rebuildLabels };
        setReady(true);
      })
      .catch(() => cb.current.onFail());

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelsEl.replaceChildren();
      api.current = null;
    };
  }, []);

  const rebuild = () => api.current?.rebuildLabels();

  useEffect(() => {
    api.current?.scene.setVisual(visual);
  }, [visual, ready]);

  // Trocar de orelha: espelha e mantém o enquadramento do outro lado.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.scene.setLado(lado);
    if (shownLado.current === lado) return;
    shownLado.current = lado;
    const flip = (v: THREE.Vector3) => v.set(-v.x, v.y, v.z);
    flip(a.controls.target);
    flip(a.camera.position);
  }, [lado, ready]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.scene.setHighlighted(highlighted);
    rebuild();
  }, [highlighted, ready]);

  // Ponto escolhido (na orelha ou na lista): destaca e leva a câmera até ele.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.scene.setSelected(selected);
    rebuild();
    const pt = selected ? a.scene.points.find((p) => p.p.codigo === selected) : null;
    if (pt) {
      setAutoRotate(false);
      const n = a.scene.worldNormal(pt);
      const back = pt.p.regiao === 'P' || pt.p.regiao === 'R';
      // pontos da frente: olha mais de lado (de fora), para as dobras não taparem
      const dir = back ? n : n.multiplyScalar(0.6).add(new THREE.Vector3(0, 0, 1)).normalize();
      a.focus(a.scene.worldPos(pt), dir, 95);
    }
  }, [selected, ready]);

  useEffect(() => {
    if (api.current) api.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  const frame = (key: keyof typeof VIEWS) => {
    const a = api.current;
    if (!a) return;
    const f = VIEWS[key];
    const s = lado === 'direita' ? -1 : 1;
    setAutoRotate(false);
    a.focus(new THREE.Vector3(f.target[0] * s, f.target[1], f.target[2]), new THREE.Vector3(f.dir[0] * s, f.dir[1], f.dir[2]), f.dist);
  };

  return (
    <div className="body3d">
      <div className="body3d-stage ear3d-stage" ref={stageRef}>
        <div className="body3d-labels" ref={labelsRef} />
        {!ready && <div className="ear3d-wait">Carregando a orelha em 3D…</div>}
        {hint && ready && (
          <div className="body3d-hint">
            Arraste para girar · roda do mouse ou dois dedos para aproximar · toque num ponto
          </div>
        )}
      </div>
      <div className="body3d-toolbar">
        <div className="body3d-row">
          <span className="body3d-row-title">Ver</span>
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
            <button key={k} type="button" className="body3d-chip" onClick={() => frame(k)}>{VIEWS[k].label}</button>
          ))}
          <button
            type="button"
            className={'body3d-chip' + (autoRotate ? ' on' : '')}
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
          >
            Girar sozinho
          </button>
        </div>
      </div>
    </div>
  );
}
