import { jsPDF } from 'jspdf';
import { ELEMENT_COLOR } from './ficha-logic';
import { DIET, ativos, porGrupo, type DietResult } from './dietetica';

// PDF da orientação alimentar para o PACIENTE: meia folha (A5), uma coluna e
// letra grande, para ler no celular (enviado pelo WhatsApp).

const W = 148;
const H = 210;
const M = 12;
const TEXT_W = W - 2 * M;
const BOTTOM = H - 16;

const JADE: [number, number, number] = [62, 98, 89];
const BRICK: [number, number, number] = [166, 61, 47];
const INK: [number, number, number] = [38, 38, 32];
const MUTED: [number, number, number] = [107, 103, 92];

const safe = (s: string) => s.replace(/[—–]/g, '-').replace(/[“”]/g, '"');

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

export type DietPdfInput = {
  patientName: string;
  diet: DietResult;
  observacao: string;
  logoDataUrl?: string;
};

export function buildDietPdfBlob({ patientName, diet, observacao, logoDataUrl }: DietPdfInput): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  let y = M;

  const newPage = () => {
    doc.addPage();
    y = M;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  // Parágrafo com quebra de linha e de página.
  const para = (text: string, size = 11, opts: { bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const indent = opts.indent ?? 0;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lh = size * 0.42;
    for (const line of doc.splitTextToSize(safe(text), TEXT_W - indent) as string[]) {
      ensure(lh);
      doc.text(line, M + indent, y + lh * 0.8);
      y += lh;
    }
    y += opts.gap ?? 1.5;
  };

  const bullet = (text: string, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe(text), TEXT_W - 5) as string[];
    const lh = size * 0.42;
    ensure(lh * Math.min(lines.length, 2));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text('•', M + 1, y + lh * 0.8);
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M + 5, y + lh * 0.8);
      y += lh;
    }
    y += 1.2;
  };

  const numbered = (n: number, text: string, size = 10.5) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe(text), TEXT_W - 6) as string[];
    const lh = size * 0.42;
    ensure(lh * Math.min(lines.length, 2));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...JADE);
    doc.text(`${n}.`, M + 0.5, y + lh * 0.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M + 6, y + lh * 0.8);
      y += lh;
    }
    y += 1.2;
  };

  // Faixa colorida com o título da seção.
  const band = (title: string, color: [number, number, number]) => {
    ensure(16);
    y += 2;
    doc.setFillColor(...color);
    doc.roundedRect(M, y, TEXT_W, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(safe(title), M + 3, y + 5.6);
    y += 11;
  };

  // --- Cabeçalho
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', M, y, 20, 20);
  const tx = logoDataUrl ? M + 24 : M;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...JADE);
  doc.text('Orientação alimentar', tx, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text('segundo a Medicina Tradicional Chinesa', tx, y + 12.5);
  doc.setFontSize(7.5);
  doc.text(safe('Método de Anamnese em MTC by Elias JS · Caminho da Cura'), tx, y + 17.5);
  y += 25;

  doc.setDrawColor(...JADE);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 5;
  para(`Para: ${patientName}`, 11.5, { bold: true, gap: 0.5 });
  para(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 10, { color: MUTED, gap: 3 });

  // --- O que o corpo está pedindo
  if (diet.sindromes.length) {
    band('O que o seu corpo está pedindo', JADE);
    for (const s of diet.sindromes) para(s.info.paciente, 11, { gap: 2.5 });
  }

  if (diet.elemento) {
    const { nome, info } = diet.elemento;
    const color = hexToRgb(ELEMENT_COLOR[nome] ?? '#3E6259');
    ensure(24);
    y += 1;
    const top = y;
    const page = doc.getCurrentPageInfo().pageNumber;
    y += 2;
    para(`Elemento em destaque: ${nome}`, 11.5, { bold: true, color, indent: 4, gap: 0.5 });
    para(`${info.orgaos} · sabor ${info.sabor.toLowerCase()} · cor ${info.cor.toLowerCase()} · ${info.estacao.toLowerCase()}`, 9, { color: MUTED, indent: 4, gap: 1 });
    para(info.orientacao, 10.5, { indent: 4, gap: 2 });
    // barra lateral na cor do elemento (só se coube na mesma página)
    if (doc.getCurrentPageInfo().pageNumber === page) {
      doc.setFillColor(...color);
      doc.rect(M, top, 1.6, y - top - 1, 'F');
    }
    y += 1;
  }

  // --- Prefira / Evite
  const prefira = [...ativos(diet.prefira), ...ativos(diet.extras)];
  if (prefira.length) {
    band('Prefira', JADE);
    for (const g of porGrupo(prefira)) {
      ensure(14); // título do grupo não fica sozinho no fim da página
      para(g.grupo, 10, { bold: true, color: JADE, gap: 0.3 });
      para(g.foods.map((f) => f.nome).join(', '), 11, { gap: 2.2 });
    }
  }

  const evite = ativos(diet.evite);
  if (evite.length) {
    band('Evite', BRICK);
    for (const f of evite) bullet(f.nome);
    y += 1;
  }

  const receitas = diet.receitas.filter((r) => r.escolhida);
  if (receitas.length) {
    ensure(55); // título da seção junto com o começo da 1ª receita
    band(receitas.length > 1 ? 'Receitas para você' : 'Receita para você', JADE);
    receitas.forEach(({ receita, ingredientes }, n) => {
      ensure(40); // não começa uma receita no pé da página
      if (n > 0) {
        doc.setDrawColor(...JADE);
        doc.setLineWidth(0.2);
        doc.line(M, y, W - M, y);
        y += 4;
      }
      para(receita.nome, 13, { bold: true, color: JADE, gap: 0.5 });
      para(`${receita.tipo} · rende ${receita.rende} · tempo: ${receita.tempo}`, 9.5, { color: MUTED, gap: 2.5 });
      para('Ingredientes', 10.5, { bold: true, gap: 0.8 });
      for (const i of ingredientes) bullet(i.texto + (i.opcional ? ' (opcional)' : ''), 10.5);
      y += 1.5;
      para('Modo de preparo', 10.5, { bold: true, gap: 0.8 });
      receita.preparo.forEach((p, k) => numbered(k + 1, p));
      y += 1;
      para(`Por que ajuda: ${receita.porque}`, 9.5, { color: MUTED, gap: 5 });
    });
  }

  if (diet.preparos.length) {
    band('Dicas de preparo', JADE);
    for (const p of diet.preparos) bullet(p);
    y += 1;
  }

  if (diet.notas.length) {
    band('Atenção', BRICK);
    for (const n of diet.notas) bullet(n, 10.5);
    y += 1;
  }

  if (observacao.trim()) {
    band('Recado do seu terapeuta', JADE);
    para(observacao.trim(), 11);
  }

  // --- Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const aviso = doc.splitTextToSize(safe(DIET.aviso), TEXT_W - 14) as string[];
    doc.text(aviso, M, H - 10);
    doc.text(`${i}/${pages}`, W - M, H - 10, { align: 'right' });
  }

  return doc.output('blob');
}
