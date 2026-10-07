'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBodyScene, FOCUS, LAYERS, type BodyScene, type LayerKey } from '@/lib/body3d';
import type { BodyResult } from '@/lib/body-map';
import type { Warp } from '@/lib/body-warp';
import corpo3d from '@/data/corpo-3d.json';

export type Corpo = 'masculino' | 'feminino';

type CorpoData = { warp: Warp; pontos: Record<string, number[][]> };

// Carrega a pele do corpo realista e os órgãos reais (sem compressão,
// ~320 KB + ~400 KB). Os órgãos têm o nome do órgão no nó do arquivo.
async function loadModel(corpo: Corpo) {
  const loader = new GLTFLoader();
  const [body, org] = await Promise.all([
    loader.loadAsync(`/corpo/${corpo}.glb`),
    loader.loadAsync(`/corpo/orgaos-${corpo}.glb`).catch(() => null),
  ]);
  let skin: THREE.BufferGeometry | null = null;
  body.scene.traverse((o) => { if (!skin && (o as THREE.Mesh).isMesh) skin = (o as THREE.Mesh).geometry; });
  if (!skin) throw new Error('modelo sem malha');
  (skin as THREE.BufferGeometry).computeVertexNormals();
  const organs = new Map<string, THREE.BufferGeometry>();
  org?.scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const name = (o.userData.name as string | undefined) ?? (o.parent?.userData.name as string | undefined) ?? o.name.replace(/_/g, ' ');
    organs.set(name, (o as THREE.Mesh).geometry);
  });
  return { skin: skin as THREE.BufferGeometry, organs };
}

type Props = {
  corpo: Corpo;
  body: BodyResult;
  selected: string | null;
  onSelect: (code: string | null) => void;
  onFail: () => void; // aparelho sem 3D (WebGL): volta para o mapa 2D
};

type Api = {
  scene: BodyScene;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  focus: (target: THREE.Vector3, dir: THREE.Vector3, dist: number) => void;
  rebuildLabels: () => void;
};

const V = (a: [number, number, number]) => new THREE.Vector3(...a);

// Corpo humano 3D estilizado: gira com o mouse/dedo, aproxima, liga e
// desliga camadas (pele, ossos, órgãos, sistemas) e mostra os pontos.
export default function Body3D({ corpo, body, selected, onSelect, onFail }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const cb = useRef({ onSelect, onFail, selected, body });
  const [ready, setReady] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(
    () => Object.fromEntries(LAYERS.map((l) => [l.key, l.on])) as Record<LayerKey, boolean>
  );
  const [autoRotate, setAutoRotate] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [info, setInfo] = useState<{ text: string; x: number; y: number } | null>(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    cb.current = { onSelect, onFail, selected, body };
  });

  // Monta a cena uma vez.
  useEffect(() => {
    const stage = stageRef.current!;
    const labelsEl = labelsRef.current!;

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

    const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
    const world = new THREE.Scene();
    let scene: BodyScene | null = null;
    let disposed = false;

    const grid = new THREE.PolarGridHelper(150, 8, 6, 64, 0x5ce1e6, 0x5ce1e6);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.18;
    world.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 90;
    controls.maxDistance = 1400;
    controls.autoRotateSpeed = 1.5;
    controls.target.copy(V(FOCUS.corpo.target));
    camera.position.copy(V(FOCUS.corpo.target).addScaledVector(V(FOCUS.corpo.dir).normalize(), FOCUS.corpo.dist));

    // Voo suave da câmera até um enquadramento (gira em volta, sem atravessar o corpo).
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

    // Etiquetas (códigos dos pontos) em HTML por cima do 3D.
    let labels: { el: HTMLButtonElement; pos: THREE.Vector3; normal: THREE.Vector3; code: string }[] = [];
    const rebuildLabels = () => {
      labelsEl.replaceChildren();
      labels = [];
      if (!scene) return;
      for (const p of scene.points) {
        p.positions.forEach((pp) => {
          if (!pp.labelled) return;
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'body3d-label' + (p.code === cb.current.selected ? ' active' : '');
          el.textContent = p.code;
          el.title = `${p.code} — ${p.label}`;
          el.onclick = () => cb.current.onSelect(cb.current.selected === p.code ? null : p.code);
          labelsEl.appendChild(el);
          labels.push({ el, pos: pp.pos, normal: pp.normal, code: p.code });
        });
      }
    };

    const tmp = new THREE.Vector3();
    const facing = (pos: THREE.Vector3, normal: THREE.Vector3) => tmp.copy(camera.position).sub(pos).dot(normal) > 0;

    // Toque/clique sem arrastar: ponto > órgão/osso/sistema.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!scene || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ray.setFromCamera(new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1), camera);

      if (scene.layers.pontos.visible) {
        const hit = ray.intersectObjects(scene.pointHits, false).find((h) => {
          const p = scene!.points.find((pt) => pt.code === h.object.userData.code);
          const pp = p?.positions.find((q) => q.pos.distanceTo(h.object.position) < 0.01);
          return pp ? facing(pp.pos, pp.normal) : true;
        });
        if (hit) {
          const code = hit.object.userData.code as string;
          cb.current.onSelect(cb.current.selected === code ? null : code);
          setInfo(null);
          return;
        }
      }
      const targets = (Object.keys(scene.layers) as LayerKey[])
        .filter((k) => k !== 'pele' && k !== 'pontos' && scene!.layers[k].visible)
        .map((k) => scene!.layers[k]);
      const hit = ray.intersectObjects(targets, true).find((h) => h.object.userData.label);
      setInfo(hit ? { text: hit.object.userData.label as string, x, y } : null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

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

    // Só desenha quando o corpo está visível na tela (poupa bateria).
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

      // pontos do lado de lá do corpo ficam apagados
      for (const p of scene.points) {
        p.objects.forEach((o, i) => {
          const f = facing(p.positions[i].pos, p.positions[i].normal);
          (o.core.material as THREE.MeshBasicMaterial).opacity = f ? 1 : 0.25;
          o.glow.material.opacity = f ? 1 : 0.15;
        });
      }
      renderer.render(world, camera);

      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const showLabels = scene.layers.pontos.visible;
      for (const l of labels) {
        proj.copy(l.pos).project(camera);
        const visible = showLabels && proj.z < 1 && facing(l.pos, l.normal);
        l.el.style.display = visible ? '' : 'none';
        if (visible) l.el.style.transform = `translate(${((proj.x + 1) / 2) * w + 6}px, ${((1 - proj.y) / 2) * h - 8}px)`;
      }
    };
    raf = requestAnimationFrame(loop);

    loadModel(corpo)
      .then(({ skin, organs }) => {
        if (disposed) { skin.dispose(); organs.forEach((g) => g.dispose()); return; }
        scene = createBodyScene({ skin, organs, ...(corpo3d as unknown as Record<Corpo, CorpoData>)[corpo] });
        world.add(scene.root);
        scene.setResult(cb.current.body);
        api.current = { scene, controls, camera, focus, rebuildLabels };
        rebuildLabels();
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
      grid.geometry.dispose();
      gridMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelsEl.replaceChildren();
      api.current = null;
    };
  }, []);

  // Resultado mudou (sintomas marcados): recolore órgãos e refaz os pontos.
  useEffect(() => {
    if (!api.current) return;
    api.current.scene.setResult(body);
    api.current.rebuildLabels();
  }, [body, ready]);

  // Ponto escolhido (no corpo ou na lista): destaca e leva a câmera até ele.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.scene.setSelected(selected);
    a.rebuildLabels();
    const p = selected ? a.scene.points.find((pt) => pt.code === selected) : null;
    if (p) {
      const pp = p.positions[0];
      setAutoRotate(false);
      a.focus(pp.pos, pp.normal.clone().add(new THREE.Vector3(0, 0.25, 0)), 170);
    }
  }, [selected, ready]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    for (const l of LAYERS) a.scene.layers[l.key].visible = layers[l.key];
  }, [layers, ready]);

  useEffect(() => {
    if (api.current) api.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  const look = (dir: [number, number, number]) => {
    const a = api.current;
    if (!a) return;
    setAutoRotate(false);
    a.focus(a.controls.target.clone(), V(dir), a.camera.position.distanceTo(a.controls.target));
  };

  const frame = (key: keyof typeof FOCUS) => {
    const a = api.current;
    if (!a) return;
    const f = FOCUS[key];
    if (key !== 'corpo') setAutoRotate(false);
    a.focus(V(f.target), V(f.dir), f.dist);
  };

  return (
    <div className="body3d">
      <div className="body3d-stage" ref={stageRef}>
        <div className="body3d-labels" ref={labelsRef} />
        {!ready && <div className="ear3d-wait">Carregando o corpo em 3D…</div>}
        {info && (
          <div className="body3d-info" style={{ left: info.x, top: info.y }}>
            {info.text}
          </div>
        )}
        {hint && (
          <div className="body3d-hint">
            Arraste para girar · roda do mouse ou dois dedos para aproximar · toque num órgão, osso ou ponto
          </div>
        )}
      </div>

      <div className="body3d-toolbar">
        <div className="body3d-row">
          <span className="body3d-row-title">Camadas</span>
          {LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={'body3d-chip' + (layers[l.key] ? ' on' : '')}
              style={{ '--chip': l.color } as CSSProperties}
              aria-pressed={layers[l.key]}
              onClick={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
            >
              <span className="dot" />
              {l.label}
            </button>
          ))}
        </div>
        <div className="body3d-row">
          <span className="body3d-row-title">Ver</span>
          <button type="button" className="body3d-chip" onClick={() => look([0, 0.08, 1])}>Frente</button>
          <button type="button" className="body3d-chip" onClick={() => look([0, 0.08, -1])}>Costas</button>
          <button type="button" className="body3d-chip" onClick={() => look([1, 0.08, 0])}>Lado</button>
          {(Object.keys(FOCUS) as (keyof typeof FOCUS)[]).map((k) => (
            <button key={k} type="button" className="body3d-chip" onClick={() => frame(k)}>{FOCUS[k].label}</button>
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
