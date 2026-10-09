import { jsPDF } from 'jspdf';
import type { Answers, FichaData } from './ficha-types';
import {
  computeScores,
  topSyndromes,
  groupQuestionsByCategory,
  groupBySubcat,
  formatDateBR,
  ELEMENT_COLOR,
} from './ficha-logic';
import { combinadosPresentes } from './combinados';
import { shade, type Pt } from './radar3d';
import { buildCycle5 } from './cycle5';
import {
  BREAST_LINES,
  bodyOutline,
  ORGANS,
  buildBodyResult,
  pointPositions,
  type BodyResult,
  type BodyView,
} from './body-map';
import { drawAuriculoSection, type AuriculoPdf } from './pdf-auriculo';
import { organs2d, organsImage } from './organs2d';
import { illustrated } from './corpo-ilustrado';

// Ilustrações dos órgãos já carregadas (data URL PNG), por vista.
export type OrganImages = Partial<Record<BodyView, string>>;

type PatientInfo = {
  name: string;
  sex?: string;
  dob?: string;
  phone?: string;
  address?: string;
  complaint?: string;
  // Registro de atendimentos (textos já formatados)
  openedAt?: string; // "04/10/2026 às 19:20"
  updatedAt?: string;
  returns?: string[]; // um por retorno, do mais antigo ao mais recente
};

const JADE: [number, number, number] = [62, 98, 89];
const BRICK: [number, number, number] = [166, 61, 47];
const INK: [number, number, number] = [38, 38, 32];
const MUTED: [number, number, number] = [107, 103, 92];
const MARGIN = 15;
const PAGE_TOP = 22; // início do conteúdo nas páginas 2+ (abaixo da logo pequena)
const PAGE_BOTTOM = 282;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

// As fontes padrão do PDF não têm o travessão "—"; troca por hífen.
function safe(s: string): string {
  return s.replace(/[—–]/g, '-');
}

function polygon(doc: jsPDF, pts: Pt[], style: 'F' | 'S' | 'FD', closed = true) {
  const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], style, closed);
}

function triangle(doc: jsPDF, [a, b, c]: [Pt, Pt, Pt]) {
  doc.triangle(a[0], a[1], b[0], b[1], c[0], c[1], 'F');
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...JADE);
  doc.text(safe(text), MARGIN, y);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
}

// Ciclo dos 5 Elementos (mesma geometria da tela). Devolve a altura usada.
function drawCycle(doc: jsPDF, cx: number, cy: number, scores: Record<string, number>) {
  const g = buildCycle5(scores, { cx, cy, radius: 31, rMin: 7.5, rMax: 12, head: 2.2, labelGap: 2 });
  const topValue = g.top?.value ?? 0;

  doc.setLineDashPattern([1.2, 1], 0);
  doc.setLineWidth(0.3);
  doc.setDrawColor(...hexToRgb(shade('#A63D2F', 1.45)));
  doc.setFillColor(...hexToRgb(shade('#A63D2F', 1.45)));
  for (const a of g.ke) {
    polygon(doc, a.pts, 'S', false);
    triangle(doc, a.head);
  }
  doc.setLineDashPattern([], 0);

  doc.setLineWidth(0.5);
  doc.setDrawColor(...JADE);
  doc.setFillColor(...JADE);
  for (const a of g.sheng) {
    polygon(doc, a.pts, 'S', false);
    triangle(doc, a.head);
  }

  for (const n of g.nodes) {
    if (topValue > 0 && n.value === topValue) {
      doc.setLineWidth(0.8);
      doc.setDrawColor(...hexToRgb(n.color));
      doc.circle(n.at[0], n.at[1], n.r + 1.8, 'S');
    }
    doc.setLineWidth(0.6);
    doc.setDrawColor(255, 255, 255);
    doc.setFillColor(...hexToRgb(n.color));
    doc.circle(n.at[0], n.at[1], n.r, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(n.el, n.at[0], n.at[1] - 0.6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${n.value} · ${n.pct}%`, n.at[0], n.at[1] + 3, { align: 'center' });
    doc.setTextColor(...INK);
    doc.setFontSize(7);
    doc.text(safe(`${n.organ} (${n.alma})`), n.at[0], n.at[1] + n.r + 3.6, { align: 'center' });
  }

  // legenda
  const ly = cy + 50;
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setLineWidth(0.5);
  doc.setDrawColor(...JADE);
  doc.line(MARGIN, ly, MARGIN + 8, ly);
  doc.text('Geração (Sheng): um elemento nutre o seguinte', MARGIN + 10, ly + 1);
  doc.setLineDashPattern([1.2, 1], 0);
  doc.setLineWidth(0.3);
  doc.setDrawColor(...BRICK);
  doc.line(MARGIN + 95, ly, MARGIN + 103, ly);
  doc.setLineDashPattern([], 0);
  doc.text('Controle (Ke): um elemento freia o outro', MARGIN + 105, ly + 1);
  doc.setTextColor(...INK);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  return g;
}

// Uma vista do corpo (frente ou costas) em versão clara para impressão.
function drawBodyView(
  doc: jsPDF,
  x0: number,
  y0: number,
  scale: number,
  view: BodyView,
  body: BodyResult,
  corpo: 'masculino' | 'feminino',
  organImgs?: OrganImages
) {
  const P = ([x, y]: Pt): Pt => [x0 + x * scale, y0 + y * scale];
  const organScore = new Map(body.organs.map((o) => [o.organ, o]));

  doc.setLineWidth(0.4);
  doc.setDrawColor(...JADE);
  doc.setFillColor(242, 247, 246);
  polygon(doc, bodyOutline(corpo).map(P), 'FD');
  if (corpo === 'feminino' && view === 'front') {
    doc.setLineWidth(0.25);
    for (const l of BREAST_LINES) polygon(doc, l.map(P), 'S', false);
  }

  if (view === 'back') {
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.setDrawColor(...hexToRgb('#9DB4A9'));
    const [a, b] = [P([100, 66]), P([100, 250])];
    doc.line(a[0], a[1], b[0], b[1]);
    doc.setLineDashPattern([], 0);
  }

  // órgãos com o formato real (mesmas silhuetas do mapa 2D da tela)
  const realOrgans = organs2d(corpo).filter((o) => o.view === view);
  // ilustração realista (PNG carregado pela tela antes de gerar o PDF)
  const img = organImgs?.[view];
  const area = organsImage(corpo, view);
  if (img && area) {
    const [ix, iy] = P([area.x, area.y]);
    doc.addImage(img, 'PNG', ix, iy, area.w * scale, area.h * scale, `orgaos-${view}`, 'MEDIUM'); // comprimida
  }
  for (const o of realOrgans) {
    const hit = organScore.get(o.organ);
    if (img && area && !hit) continue; // com a ilustração, só os comprometidos ganham contorno
    const color = hit ? ELEMENT_COLOR[hit.element] : '#B9CBC7';
    const ops = o.loops.flatMap((loop) => [
      { op: 'm', c: P(loop[0]) },
      ...loop.slice(1).map((p) => ({ op: 'l', c: P(p) })),
      { op: 'h', c: [] },
    ]);
    doc.setDrawColor(...hexToRgb(hit ? shade(color, 0.75) : color));
    // path() só monta o contorno; a pintura é pedida em seguida (par/ímpar =
    // respeita buracos, como o do intestino grosso)
    doc.path(ops);
    if (img && area) {
      doc.setLineWidth(0.25 + 0.35 * hit!.intensity);
      doc.setDrawColor(...hexToRgb(color));
      doc.stroke();
    } else {
      doc.setLineWidth(0.25);
      doc.setFillColor(...hexToRgb(hit ? shade(color, 1 + (1 - hit.intensity) * 0.65) : '#E6EFEC'));
      doc.fillStrokeEvenOdd();
    }
  }

  // reserva: formas simples, se as silhuetas não existirem
  for (const o of realOrgans.length ? [] : ORGANS.filter((og) => og.view === view)) {
    const hit = organScore.get(o.organ);
    const color = hit ? ELEMENT_COLOR[hit.element] : '#B9CBC7';
    for (const s of o.shapes) {
      if (s.kind === 'ellipse') {
        const [cx, cy] = P([s.cx, s.cy]);
        doc.setLineWidth(0.3);
        doc.setDrawColor(...hexToRgb(hit ? shade(color, 0.75) : color));
        if (hit) {
          doc.setFillColor(...hexToRgb(shade(color, 1 + (1 - hit.intensity) * 0.65)));
          doc.ellipse(cx, cy, s.rx * scale, s.ry * scale, 'FD');
        } else {
          doc.ellipse(cx, cy, s.rx * scale, s.ry * scale, 'S');
        }
      } else {
        doc.setLineWidth(s.width * scale);
        doc.setDrawColor(...hexToRgb(hit ? shade(color, 1 + (1 - hit.intensity) * 0.5) : color));
        polygon(doc, s.pts.map(P), 'S', false);
      }
    }
  }

  doc.setFontSize(6);
  for (const p of body.points.filter((pt) => pt.def.view === view)) {
    for (const pos of pointPositions(p.def)) {
      const [x, y] = P(pos);
      doc.setFillColor(...BRICK);
      doc.circle(x, y, 0.85, 'F');
      if (pos[0] >= 100) {
        doc.setTextColor(...BRICK);
        doc.text(p.code, x + 1.3, y + 0.8);
      }
    }
  }

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(view === 'front' ? 'FRENTE' : 'COSTAS', x0 + 100 * scale, y0 - 2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  doc.setLineWidth(0.2);
}

// Vista do corpo ilustrado (atlas: músculos, ossos, vasos e órgãos), com o
// contorno do corpo, os órgãos comprometidos e os pontos sugeridos.
function drawIllustratedView(
  doc: jsPDF,
  x0: number,
  y0: number,
  scale: number,
  view: BodyView,
  body: BodyResult,
  corpo: 'masculino' | 'feminino',
  img: string
) {
  const il = illustrated(corpo, view);
  if (!il) return;
  const P = ([u, v]: Pt): Pt => [x0 + (u - il.box.x) * scale, y0 + (v - il.box.y) * scale];
  const [ix, iy] = P([il.box.x, il.box.y]);
  doc.addImage(img, 'JPEG', ix, iy, il.box.w * scale, il.box.h * scale, `ilus-${view}`, 'MEDIUM');

  const path = (loops: Pt[][]) => doc.path(loops.flatMap((loop) => [
    { op: 'm', c: P(loop[0]) },
    ...loop.slice(1).map((p) => ({ op: 'l', c: P(p) })),
    { op: 'h', c: [] },
  ]));

  // contorno do corpo
  doc.setLineWidth(0.35);
  doc.setDrawColor(...JADE);
  path(il.outline);
  doc.stroke();

  // órgãos comprometidos: contorno na cor do elemento
  const organScore = new Map(body.organs.map((o) => [o.organ, o]));
  for (const o of il.organs) {
    const hit = organScore.get(o.organ);
    if (!hit) continue;
    doc.setLineWidth(0.3 + 0.4 * hit.intensity);
    doc.setDrawColor(...hexToRgb(ELEMENT_COLOR[hit.element]));
    path(o.loops);
    doc.stroke();
  }

  // pontos: miolo amarelo com borda escura (aparece sobre o vermelho dos músculos)
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  for (const p of body.points.filter((pt) => pt.def.view === view)) {
    (il.pontos[p.code] ?? []).forEach((pos, i) => {
      const [x, y] = P(pos);
      doc.setLineWidth(0.25);
      doc.setDrawColor(60, 30, 20);
      doc.setFillColor(255, 216, 74);
      doc.circle(x, y, 0.9, 'FD');
      if (i === 0) {
        const w = doc.getTextWidth(p.code);
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 1.2, y - 1.5, w + 0.8, 2.4, 'F');
        doc.setTextColor(...BRICK);
        doc.text(p.code, x + 1.6, y + 0.6);
      }
    });
  }

  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(view === 'front' ? 'FRENTE' : 'COSTAS', x0 + (il.box.w * scale) / 2, y0 - 2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  doc.setLineWidth(0.2);
}

function drawCheckbox(doc: jsPDF, x: number, y: number, checked: boolean) {
  const s = 3;
  doc.setLineWidth(0.25);
  doc.setDrawColor(...(checked ? JADE : MUTED));
  if (checked) {
    doc.setFillColor(...JADE);
    doc.rect(x, y - s + 0.4, s, s, 'FD');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.line(x + 0.6, y - 1.0, x + 1.25, y - 0.35);
    doc.line(x + 1.25, y - 0.35, x + 2.45, y - 1.9);
  } else {
    doc.rect(x, y - s + 0.4, s, s, 'S');
  }
  doc.setLineWidth(0.2);
}

export function buildPdfBlob(
  data: FichaData,
  answers: Answers,
  patient: PatientInfo,
  logoDataUrl?: string,
  auriculo?: AuriculoPdf | null,
  organImgs?: OrganImages,
  ilusImgs?: OrganImages, // fotos do corpo ilustrado (JPEG), por vista
  facial?: string[], // linhas da análise facial
  fito?: string[] // fórmulas de fitoterapia escolhidas
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN * 2;
  let y = 15;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }
  };

  // Cabeçalho da 1ª página: logo grande ao lado do título
  const logoH = 26;
  let titleX = pageW / 2;
  let titleAlign: 'center' | 'left' = 'center';
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', MARGIN, y - 5, logoH, logoH);
    titleX = MARGIN + logoH + 6;
    titleAlign = 'left';
  }
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Método de Anamnese em MTC', titleX, y + 3, { align: titleAlign });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...JADE);
  doc.text('by Elias JS · Caminho da Cura', titleX, y + 9, { align: titleAlign });
  doc.setTextColor(...MUTED);
  doc.setFontSize(9.5);
  doc.text('Ficha de Anamnese - Medicina Tradicional Chinesa', titleX, y + 14.5, { align: titleAlign });
  doc.setTextColor(...INK);
  y += logoH;
  doc.setDrawColor(...JADE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y - 2, pageW - MARGIN, y - 2);
  doc.setLineWidth(0.2);
  y += 4;

  // Dados do paciente
  const field = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN, y);
    const w = doc.getTextWidth(`${label}: `);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(safe(value), contentW - w);
    doc.text(lines, MARGIN + w, y);
    y += lines.length * 5;
  };
  doc.setFontSize(10);
  field('Paciente', patient.name || '-');
  if (patient.sex) field('Sexo', patient.sex);
  if (patient.dob) field('Nascimento', formatDateBR(patient.dob));
  if (patient.phone) field('Telefone', patient.phone);
  if (patient.address) field('Endereço', patient.address);
  if (patient.complaint) field('Queixa principal', patient.complaint);
  if (patient.openedAt) field('Ficha aberta em', patient.openedAt);
  if (patient.updatedAt) field('Última alteração', patient.updatedAt);
  if (patient.returns?.length) {
    field(`Retornos (${patient.returns.length})`, patient.returns.join('; '));
  }
  y += 5;

  const { syndromeScores, elementScores } = computeScores(answers, data);
  const top = topSyndromes({ syndromeScores, elementScores }, data, 8);

  // Ciclo dos 5 Elementos + frase de resumo
  ensureSpace(112);
  sectionTitle(doc, 'Diagnóstico pelos 5 Elementos', y);
  const cycle = drawCycle(doc, pageW / 2, y + 50, elementScores);
  y += 108;
  doc.setFontSize(10);
  if (cycle.top) {
    const leaders = cycle.nodes.filter((n) => n.value === cycle.top!.value);
    const names = leaders.map((n) => `${n.el} (${n.organ}, alma ${n.alma})`).join(' e ');
    const text = `${leaders.length > 1 ? 'Elementos mais comprometidos' : 'Elemento mais comprometido'}: ${names} - ${leaders[0].pct}% dos sinais assinalados${leaders.length > 1 ? ' cada' : ''}.`;
    const lines = doc.splitTextToSize(safe(text), contentW);
    doc.setFont('helvetica', 'bold');
    doc.text(lines, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += lines.length * 5 + 4;
  }

  // Síndromes
  if (top.length) {
    ensureSpace(20);
    sectionTitle(doc, 'Síndromes identificadas', y);
    y += 7;
  }
  doc.setFontSize(10);
  for (const s of top) {
    const note = data.clinical_notes[s.code];
    const alma = s.info?.alma || '';
    const principio = note ? doc.splitTextToSize(safe(`Princípio: ${note.principio}`), contentW) : [];
    const pontos = note ? doc.splitTextToSize(safe(`Pontos: ${note.pontos}`), contentW) : [];
    const psico = note
      ? doc.splitTextToSize(safe(`Leitura Psicossomática (${alma}): ${note.psicossomatica}`), contentW)
      : [];
    ensureSpace(6 + (principio.length + pontos.length + psico.length) * 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(`${s.info?.name || s.code} (${s.info?.organ_name || ''}) - ${s.score} ponto(s)`), MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(principio, MARGIN, y); y += principio.length * 4.2;
    doc.text(pontos, MARGIN, y); y += pontos.length * 4.2;
    doc.text(psico, MARGIN, y); y += psico.length * 4.2 + 3;
  }

  // Padrões combinados (duas síndromes fortes juntas)
  const combinados = combinadosPresentes(top);
  if (combinados.length) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.text(safe('Padrões combinados'), MARGIN, y);
    y += 5;
    for (const c of combinados) {
      const linhas = doc.splitTextToSize(safe(`${c.nome}: ${c.principio}${c.formula ? ` Fórmula de referência: ${c.formula}.` : ''}`), contentW);
      ensureSpace(linhas.length * 4.2 + 2);
      doc.setFont('helvetica', 'normal');
      doc.text(linhas, MARGIN, y);
      y += linhas.length * 4.2 + 2;
    }
    y += 2;
  }

  // Mapa do corpo: órgãos comprometidos e pontos sugeridos
  const body = buildBodyResult(data, syndromeScores, top.map((s) => s.code));
  if (body.organs.length) {
    doc.addPage();
    y = PAGE_TOP;
    sectionTitle(doc, 'Mapa do corpo - órgãos comprometidos e pontos sugeridos', y);
    y += 9;
    const scale = 0.4;
    const corpo = patient.sex === 'Feminino' ? 'feminino' : 'masculino';
    if (ilusImgs?.front && ilusImgs.back && illustrated(corpo, 'front') && illustrated(corpo, 'back')) {
      drawIllustratedView(doc, MARGIN + 6, y, scale, 'front', body, corpo, ilusImgs.front);
      drawIllustratedView(doc, MARGIN + 96, y, scale, 'back', body, corpo, ilusImgs.back);
    } else {
      drawBodyView(doc, MARGIN + 6, y, scale, 'front', body, corpo, organImgs);
      drawBodyView(doc, MARGIN + 96, y, scale, 'back', body, corpo, organImgs);
    }
    y += 440 * scale + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Órgãos mais comprometidos', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const colW = contentW / 2;
    body.organs.forEach((o, i) => {
      const x = MARGIN + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) y += 4.6;
      if (i % 2 === 0) ensureSpace(5);
      doc.setFillColor(...hexToRgb(ELEMENT_COLOR[o.element]));
      doc.rect(x, y - 2.6, 3, 3, 'F');
      doc.text(safe(`${o.organ} (${o.element}) - ${Math.round(o.intensity * 100)}%`), x + 4.5, y);
    });
    y += 8;

    if (body.points.length) {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Pontos sugeridos (localização ilustrativa - confirme pela anatomia)', MARGIN, y);
      y += 5;
      doc.setFontSize(8);
      for (const p of body.points) {
        const lines = doc.splitTextToSize(safe(`${p.def.region}. Indicado em: ${p.syndromes.join('; ')}`), contentW - 14);
        ensureSpace(lines.length * 3.6 + 1);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRICK);
        doc.text(p.code, MARGIN, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INK);
        doc.text(lines, MARGIN + 14, y);
        y += lines.length * 3.6 + 1;
      }
    }
  }

  // Análise facial segundo a MTC
  if (facial && facial.length) {
    if (y + 24 > PAGE_BOTTOM) { doc.addPage(); y = PAGE_TOP; } else y += 6;
    sectionTitle(doc, 'Análise facial segundo a MTC', y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const l of facial) {
      const lines = doc.splitTextToSize(safe(l), contentW) as string[];
      if (y + lines.length * 4 > PAGE_BOTTOM) { doc.addPage(); y = PAGE_TOP; }
      doc.text(lines, MARGIN, y);
      y += lines.length * 4 + 1.5;
    }
  }

  // Fitoterapia Chinesa
  if (fito && fito.length) {
    if (y + 24 > PAGE_BOTTOM) { doc.addPage(); y = PAGE_TOP; } else y += 6;
    sectionTitle(doc, 'Fitoterapia Chinesa - fórmulas escolhidas', y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const l of [...fito, 'Doses, preparo e duração definidos pelo terapeuta. Não substitui avaliação médica.']) {
      const lines = doc.splitTextToSize(safe(l), contentW) as string[];
      if (y + lines.length * 4 > PAGE_BOTTOM) { doc.addPage(); y = PAGE_TOP; }
      doc.text(lines, MARGIN, y);
      y += lines.length * 4 + 1.5;
    }
  }

  // Auriculoterapia: pontos escolhidos pelo terapeuta
  if (auriculo && auriculo.pontos.length) {
    doc.addPage();
    y = drawAuriculoSection(doc, auriculo, PAGE_TOP, {
      margin: MARGIN,
      contentW,
      safe,
      title: (t, yy) => sectionTitle(doc, t, yy),
      ensure: (yy, h) => {
        if (yy + h <= PAGE_BOTTOM) return yy;
        doc.addPage();
        return PAGE_TOP;
      },
    });
  }

  // Sintomas: mesmo layout da tela (categoria > subcategoria > caixinhas)
  doc.addPage();
  y = PAGE_TOP;
  sectionTitle(doc, 'Sintomas assinalados por categoria', y);
  y += 8;

  const cols = 3;
  const colW = contentW / cols;
  const rowH = 4.3;

  for (const group of groupQuestionsByCategory(data)) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...JADE);
    doc.text(safe(group.catName), MARGIN, y);
    doc.setDrawColor(216, 211, 196);
    doc.line(MARGIN, y + 1.5, pageW - MARGIN, y + 1.5);
    y += 6;

    for (const { subcat, questions } of groupBySubcat(group.questions)) {
      ensureSpace(10);
      if (subcat) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...INK);
        doc.text(safe(subcat).toUpperCase(), MARGIN, y);
        y += 4;
      }

      for (let i = 0; i < questions.length; i += cols) {
        const row = questions.slice(i, i + cols);
        doc.setFontSize(8.5);
        const rowLines = row.map((q) => doc.splitTextToSize(safe(q.label), colW - 6) as string[]);
        const h = Math.max(...rowLines.map((l) => l.length)) * 3.6 + (rowH - 3.6);
        ensureSpace(h);
        row.forEach((q, c) => {
          const x = MARGIN + c * colW;
          const checked = !!answers[q.key];
          drawCheckbox(doc, x, y, checked);
          doc.setFont('helvetica', checked ? 'bold' : 'normal');
          doc.setTextColor(...(checked ? INK : MUTED));
          doc.text(rowLines[c], x + 4.5, y);
        });
        y += h;
      }
      y += 1.5;
    }
    y += 3;
  }

  // Em todas as páginas: logo pequena + título no topo (a partir da 2ª) e rodapé
  const pages = doc.getNumberOfPages();
  const today = new Date().toLocaleDateString('pt-BR');
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', pageW - MARGIN - 13, 4, 13, 13);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...JADE);
      doc.text('Método de Anamnese em MTC', MARGIN, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(safe(`Ficha de ${patient.name}`), MARGIN, 14.5);
      doc.setDrawColor(216, 211, 196);
      doc.line(MARGIN, 18, pageW - MARGIN - 16, 18);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(safe(`${patient.name} - gerado em ${today}`), MARGIN, 290);
    doc.text(`Página ${p} de ${pages}`, pageW - MARGIN, 290, { align: 'right' });
  }

  return doc.output('blob');
}
