import data from '@/data/corpo-ilustrado.json';
import imgMeta from '@/data/corpo-ilustrado-img.json';
import type { BodyView } from './body-map';
import type { Pt } from './radar3d';

// Corpo ilustrado (estilo atlas: músculos, ossos, vasos e órgãos) para o
// mapa 2D e o PDF. Coordenadas no plano da imagem: x = lado (de frente, o
// lado esquerdo do paciente fica à direita), y = 0 no alto da cabeça até
// 440 nos pés. Gerado por scripts/corpo-ilustrado.mjs (+ fotos tiradas por
// scripts/corpo-ilustrado/).

export type Corpo = 'masculino' | 'feminino';

type ViewData = {
  outline: Pt[][];
  organs: { organ: string; loops: Pt[][] }[];
  pontos: Record<string, Pt[]>; // por código: [lado esquerdo do paciente, lado direito]
};

const all = data as unknown as Record<Corpo, Record<BodyView, ViewData>>;
const meta = imgMeta as unknown as Record<string, { box: [number, number, number, number] }>;

export function illustrated(corpo: Corpo, view: BodyView) {
  const d = all[corpo]?.[view];
  const m = meta[`${corpo}-${view}`];
  if (!d || !m) return null;
  const [x0, y0, x1, y1] = m.box;
  return {
    ...d,
    box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    img: `/corpo/ilustrado-${corpo}-${view}.webp`, // tela (fundo transparente)
    pdfImg: `/corpo/ilustrado-${corpo}-${view}.jpg`, // PDF (fundo claro)
  };
}

// Fotos para o PDF, como data URL.
export async function loadIllustrationsForPdf(corpo: Corpo): Promise<Partial<Record<BodyView, string>>> {
  const out: Partial<Record<BodyView, string>> = {};
  for (const view of ['front', 'back'] as const) {
    const il = illustrated(corpo, view);
    if (!il) continue;
    try {
      const res = await fetch(il.pdfImg);
      if (!res.ok) continue;
      const blob = await res.blob();
      out[view] = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      // sem a foto, o PDF usa o mapa antigo
    }
  }
  return out;
}
