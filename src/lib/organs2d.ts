import data from '@/data/orgaos-2d.json';
import imgMeta from '@/data/orgaos-2d-img.json';
import type { BodyView } from './body-map';
import type { Pt } from './radar3d';

// Silhuetas dos órgãos reais no quadro 2D do corpo (200 x 440), geradas a
// partir dos órgãos 3D por scripts/orgaos-2d.mjs. Usadas no mapa 2D e no PDF.

export type Organ2D = { organ: string; view: BodyView; z: number; loops: Pt[][] };

const all = data as unknown as Record<'masculino' | 'feminino', Organ2D[]>;

// Já vêm na ordem de pintura (do mais ao fundo para o mais à frente).
export function organs2d(corpo: 'masculino' | 'feminino'): Organ2D[] {
  return all[corpo] ?? [];
}

// Ilustração realista dos órgãos (PNG gerado a partir do 3D com iluminação e
// cores naturais) e a área que ela ocupa no quadro 2D.
export function organsImage(corpo: 'masculino' | 'feminino', view: BodyView) {
  const name = `orgaos2d-${corpo}-${view}`;
  const b = (imgMeta as unknown as Record<string, [number, number, number, number]>)[name];
  if (!b) return null;
  const [x0, y0, x1, y1] = b;
  return { src: `/corpo/${name}.png`, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Carrega as ilustrações (frente e costas) como data URL, para o PDF.
export async function loadOrganImages(corpo: 'masculino' | 'feminino'): Promise<Partial<Record<BodyView, string>>> {
  const out: Partial<Record<BodyView, string>> = {};
  for (const view of ['front', 'back'] as const) {
    const area = organsImage(corpo, view);
    if (!area) continue;
    try {
      const res = await fetch(area.src);
      if (!res.ok) continue;
      const blob = await res.blob();
      out[view] = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      // sem a imagem, o PDF usa as silhuetas coloridas
    }
  }
  return out;
}

// Contornos -> caminho SVG (usar com fillRule="evenodd" para os buracos,
// como o do intestino grosso).
export function loopsPath(loops: Pt[][]): string {
  return loops
    .map((l) => 'M' + l.map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
    .join('');
}
