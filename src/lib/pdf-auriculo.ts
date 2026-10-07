import type { jsPDF } from 'jspdf';
import { REGIAO, uv2d, type PontoAuricular } from './auriculo';
import { LADO_LABEL, type LadoSessao } from './auriculo-sugestao';

// Página de auriculoterapia do PDF da ficha: as imagens 2D da orelha
// (frente e dorso) com os pontos escolhidos e a lista com a localização.

export type EarImages = { frente: string; dorso: string; espelhada: boolean };

export type AuriculoPdf = {
  lado: LadoSessao;
  observacao: string;
  pontos: PontoAuricular[];
  imagens: EarImages;
};

// Converte as imagens da orelha (fundo transparente) em JPEG com fundo
// branco e a pele em volta esmaecendo, já espelhadas para a orelha direita.
export async function loadEarImages(direita: boolean): Promise<EarImages | null> {
  const one = async (face: 'frente' | 'dorso') => {
    const img = new Image();
    img.src = `/auriculo/${face}.webp`;
    await img.decode();
    const size = 700;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.save();
    if (direita) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();
    // esmaece a borda do recorte de pele (mesmas medidas do mapa 2D)
    const f = face === 'frente' ? { cx: direita ? 0.541 : 0.459, cy: 0.48, r: 0.39, sy: 1.56 } : { cx: 0.5, cy: 0.5, r: 0.5, sy: 1.1 };
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.translate(f.cx * size, f.cy * size);
    ctx.scale(1, f.sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * size);
    g.addColorStop(0.68, 'rgba(0,0,0,1)');
    g.addColorStop(0.97, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.85);
  };
  try {
    return { frente: await one('frente'), dorso: await one('dorso'), espelhada: direita };
  } catch {
    return null;
  }
}

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Desenha a seção a partir de y; devolve o novo y. `ensure` abre página
// nova se faltar espaço (e devolve o y atualizado).
export function drawAuriculoSection(
  doc: jsPDF,
  a: AuriculoPdf,
  y: number,
  opts: { margin: number; contentW: number; safe: (s: string) => string; ensure: (y: number, h: number) => number; title: (t: string, y: number) => void }
): number {
  const { margin, contentW, safe } = opts;
  opts.title('Auriculoterapia - pontos escolhidos', y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(safe(`${LADO_LABEL[a.lado]}. ${a.pontos.length} pontos.${a.lado === 'ambas' ? ' (Figura: orelha esquerda; na direita os pontos ficam no lugar espelhado.)' : ''}`), margin, y);
  y += 4;

  const lado = a.imagens.espelhada ? 'direita' : 'esquerda';
  const back = (p: PontoAuricular) => p.regiao === 'P' || p.regiao === 'R';
  // só mostra o dorso se algum ponto escolhido estiver nele
  const comDorso = a.pontos.some(back);
  const size = comDorso ? 84 : 110;
  const faces: ['frente' | 'dorso', number][] = comDorso
    ? [['frente', margin + 2], ['dorso', margin + contentW - size - 2]]
    : [['frente', margin + (contentW - size) / 2]];
  for (const [face, x] of faces) {
    doc.addImage(a.imagens[face], 'JPEG', x, y, size, size);
    doc.setFontSize(6.5);
    for (const p of a.pontos.filter((pt) => back(pt) === (face === 'dorso'))) {
      const v = uv2d(p, face, lado);
      const px = x + (v.uv[0] / 100) * size;
      const py = y + (v.uv[1] / 100) * size;
      doc.setFillColor(...hex(REGIAO[p.regiao].cor));
      doc.setDrawColor(60, 40, 20);
      doc.setLineWidth(0.2);
      if (v.visivel) doc.circle(px, py, 0.9, 'FD');
      else {
        doc.setLineDashPattern([0.4, 0.3], 0);
        doc.circle(px, py, 0.9, 'S');
        doc.setLineDashPattern([], 0);
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(p.codigo, px + 1.3, py + 0.8);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 103, 92);
    doc.text(face === 'frente' ? 'FACE LATERAL' : 'DORSO', x + size / 2, y + size + 3.5, { align: 'center' });
  }
  doc.setTextColor(38, 38, 32);
  y += size + 9;

  for (const p of a.pontos) {
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(safe(`${p.nome} - ${p.localizacao}`), contentW - 16) as string[];
    y = opts.ensure(y, lines.length * 3.8 + 1.5);
    doc.setFillColor(...hex(REGIAO[p.regiao].cor));
    doc.rect(margin, y - 2.6, 2.6, 2.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(p.codigo, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 16, y);
    y += lines.length * 3.8 + 1.5;
  }
  if (a.observacao.trim()) {
    const lines = doc.splitTextToSize(safe(`Observações: ${a.observacao.trim()}`), contentW) as string[];
    y = opts.ensure(y, lines.length * 4 + 3);
    y += 2;
    doc.setFontSize(9);
    doc.text(lines, margin, y);
    y += lines.length * 4;
  }
  return y;
}
