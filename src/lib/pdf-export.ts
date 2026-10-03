import { jsPDF } from 'jspdf';
import type { Answers, FichaData } from './ficha-types';
import { ELEMENTS_ORDER, ELEMENT_COLOR, computeScores, topSyndromes, groupQuestionsByCategory } from './ficha-logic';

type PatientInfo = {
  name: string;
  dob?: string;
  phone?: string;
  address?: string;
  complaint?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

// Desenha o radar dos 5 elementos diretamente no PDF usando linhas e
// círculos (sem depender de imagem), igual ao app original.
function drawRadar(doc: jsPDF, cx: number, cy: number, rMax: number, scores: Record<string, number>) {
  const n = ELEMENTS_ORDER.length;
  const step = 360 / n;
  const max = Math.max(1, ...ELEMENTS_ORDER.map((e) => scores[e] || 0));

  const polar = (r: number, deg: number) => {
    const rad = (Math.PI / 180) * (deg - 90);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  doc.setDrawColor(200, 196, 181);
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const pts = ELEMENTS_ORDER.map((_, i) => polar(rMax * f, i * step));
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      doc.line(x1, y1, x2, y2);
    }
  });

  const points = ELEMENTS_ORDER.map((el, i) => {
    const value = scores[el] || 0;
    const r = (value / max) * rMax;
    const [x, y] = polar(r, i * step);
    return { el, x, y };
  });

  doc.setDrawColor(166, 61, 47);
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    doc.line(a.x, a.y, b.x, b.y);
  }

  for (const p of points) {
    const [r, g, b] = hexToRgb(ELEMENT_COLOR[p.el]);
    doc.setFillColor(r, g, b);
    doc.circle(p.x, p.y, 1.6, 'F');
  }

  doc.setFontSize(8);
  ELEMENTS_ORDER.forEach((el, i) => {
    const [x, y] = polar(rMax + 10, i * step);
    const [r, g, b] = hexToRgb(ELEMENT_COLOR[el]);
    doc.setTextColor(r, g, b);
    doc.text(`${el} (${scores[el] || 0})`, x, y, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
}

export function buildPdfBlob(
  data: FichaData,
  answers: Answers,
  patient: PatientInfo,
  logoDataUrl?: string
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  if (logoDataUrl) {
    const logoW = 24;
    const logoH = logoW * (818 / 900);
    doc.addImage(logoDataUrl, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
    y += logoH + 4;
  }

  doc.setFontSize(14);
  doc.text('Método EliasJS · Caminho da Cura', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(11);
  doc.text('Ficha de Anamnese', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.text(`Paciente: ${patient.name || '-'}`, 15, y); y += 5;
  if (patient.dob) { doc.text(`Nascimento: ${patient.dob}`, 15, y); y += 5; }
  if (patient.phone) { doc.text(`Telefone: ${patient.phone}`, 15, y); y += 5; }
  if (patient.address) { doc.text(`Endereço: ${patient.address}`, 15, y); y += 5; }
  if (patient.complaint) {
    const lines = doc.splitTextToSize(`Queixa principal: ${patient.complaint}`, pageW - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5;
  }
  y += 6;

  const { syndromeScores, elementScores } = computeScores(answers, data);

  doc.setFontSize(12);
  doc.text('Diagnóstico pelos 5 Elementos', 15, y);
  y += 4;
  drawRadar(doc, pageW / 2, y + 32, 28, elementScores);
  y += 70;

  doc.setFontSize(12);
  doc.text('Síndromes identificadas', 15, y);
  y += 6;

  const top = topSyndromes({ syndromeScores, elementScores }, data, 8);
  doc.setFontSize(10);
  for (const s of top) {
    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold');
    doc.text(`${s.info?.name || s.code} (${s.info?.organ_name || ''}) — ${s.score} ponto(s)`, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const note = data.clinical_notes[s.code];
    if (note) {
      const principio = doc.splitTextToSize(`Princípio: ${note.principio}`, pageW - 30);
      const pontos = doc.splitTextToSize(`Pontos: ${note.pontos}`, pageW - 30);
      const alma = s.info?.alma || '';
      const psico = doc.splitTextToSize(`Leitura Psicossomática (${alma}): ${note.psicossomatica}`, pageW - 30);
      doc.text(principio, 15, y); y += principio.length * 4.2;
      doc.text(pontos, 15, y); y += pontos.length * 4.2;
      doc.text(psico, 15, y); y += psico.length * 4.2 + 3;
    }
  }

  doc.addPage();
  y = 15;
  doc.setFontSize(12);
  doc.text('Sintomas assinalados por categoria', 15, y);
  y += 6;
  doc.setFontSize(9);
  for (const group of groupQuestionsByCategory(data)) {
    const checked = group.questions.filter((q) => answers[q.key]);
    if (!checked.length) continue;
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold');
    doc.text(group.catName, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const q of checked) {
      if (y > 280) { doc.addPage(); y = 15; }
      doc.text(`• ${q.subcat ? q.subcat + ' — ' : ''}${q.label}`, 18, y);
      y += 4.2;
    }
    y += 2;
  }

  return doc.output('blob');
}
