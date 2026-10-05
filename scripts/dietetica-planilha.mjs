// Planilha de revisão da Orientação Alimentar (Dietética Chinesa).
//
//   node scripts/dietetica-planilha.mjs exportar   → revisao/Dietetica-MTC-revisao.xlsx
//   node scripts/dietetica-planilha.mjs importar [arquivo.xlsx]
//
// "exportar" gera a planilha a partir de src/data/dietetica.json para o dono
// revisar no Excel. "importar" lê a planilha revisada de volta para o JSON
// (mostra os comentários do revisor e avisa nomes de alimentos desconhecidos).

import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'src/data/dietetica.json');
const APP_PATH = join(ROOT, 'src/data/app_data.json');
const XLSX_PATH = join(ROOT, 'revisao/Dietetica-MTC-revisao.xlsx');

const NATUREZAS = ['Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
const SABOR_ELEMENTO = { azedo: 'Madeira', amargo: 'Fogo', doce: 'Terra', picante: 'Metal', salgado: 'Água' };
const ORGAOS = {
  F: 'Fígado', VB: 'Vesícula Biliar', C: 'Coração', ID: 'Intestino Delgado', CS: 'Pericárdio',
  BP: 'Baço-Pâncreas', E: 'Estômago', P: 'Pulmão', IG: 'Intestino Grosso', R: 'Rim', B: 'Bexiga',
};
const SEP = '; ';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const split = (s) => String(s ?? '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v);
};

const JADE = 'FF3E6259';

function styleSheet(ws, widths, { wrapCols = [] } = {}) {
  ws.columns.forEach((col, i) => { col.width = widths[i] ?? 14; });
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: JADE } };
  head.alignment = { vertical: 'middle', wrapText: true };
  head.height = 32;
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { vertical: 'top', wrapText: false };
    for (const c of wrapCols) row.getCell(c).alignment = { vertical: 'top', wrapText: true };
  });
}

function dropdown(ws, col, values, rows) {
  for (let r = 2; r <= rows + 1; r++) {
    ws.getCell(r, col).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`"${values.join(',')}"`],
      showErrorMessage: true, errorTitle: 'Valor inválido', error: `Escolha: ${values.join(', ')}`,
    };
  }
}

async function exportar() {
  const d = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const app = JSON.parse(readFileSync(APP_PATH, 'utf8'));
  const nome = Object.fromEntries(d.alimentos.map((a) => [a.id, a.nome]));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Método de Anamnese em MTC';

  // --- Leia-me
  const leia = wb.addWorksheet('Leia-me');
  leia.columns = [{ width: 110 }];
  [
    'REVISÃO DA ORIENTAÇÃO ALIMENTAR SEGUNDO A MTC',
    '',
    'Esta planilha é a 1ª versão do conteúdo da Dietética Chinesa do app. Nada vai para o paciente sem a sua revisão.',
    '',
    'COMO REVISAR',
    '1. Comece pela aba "Síndromes": para cada uma, confira o princípio, a explicação para o paciente e as listas PREFIRA e EVITE.',
    '2. Nas listas PREFIRA / EVITE, os alimentos são separados por ponto e vírgula ( ; ). Use os nomes exatamente como estão na aba "Alimentos".',
    '   Pode apagar, acrescentar ou mudar a ordem (os primeiros aparecem em destaque para o paciente).',
    '3. Na aba "Alimentos", confira natureza, sabor, órgãos e ações. As linhas com "(verificar)" na observação são as de classificação incerta',
    '   (alimentos brasileiros que os textos clássicos não trazem) — decida você.',
    '   Para incluir um alimento novo, escreva numa linha vazia no fim (deixe o Código em branco).',
    '4. Na aba "Elementos", confira a orientação geral de cada Elemento.',
    '5. Marque "Sim" na coluna "Revisado?" de cada linha conferida. Se quiser explicar algo, use a coluna "Comentário".',
    '6. Salve o arquivo (Ctrl+B) com o mesmo nome e avise o Claude: ele lê as suas mudanças e atualiza o app.',
    '',
    'NÃO MUDE: os títulos das colunas, a coluna "Código" e os nomes das abas.',
    '',
    'AVISO LEGAL: no app, o conteúdo aparece como "Orientação alimentar segundo a MTC" — não é dieta nem prescrição',
    '(prescrição dietética é atividade privativa do nutricionista, Lei 8.234/1991).',
  ].forEach((t, i) => {
    const row = leia.addRow([t]);
    if (i === 0) row.font = { bold: true, size: 14, color: { argb: JADE } };
    if (['COMO REVISAR', 'NÃO MUDE: os títulos das colunas, a coluna "Código" e os nomes das abas.'].includes(t)) row.font = { bold: true };
  });

  // --- Síndromes
  const ss = wb.addWorksheet('Síndromes');
  ss.addRow(['Código', 'Síndrome', 'Órgão', 'Elemento', 'Princípio alimentar', 'Explicação para o paciente',
    'Naturezas preferidas', 'PREFIRA (separe por ;)', 'EVITE (separe por ;)', 'Modo de preparo', 'Revisado?', 'Comentário']);
  const codes = Object.keys(d.sindromes).sort((a, b) => {
    const A = app.syndromes[a], B = app.syndromes[b];
    return A.element.localeCompare(B.element) || A.organ_name.localeCompare(B.organ_name) || A.name.localeCompare(B.name);
  });
  for (const code of codes) {
    const s = d.sindromes[code];
    const info = app.syndromes[code];
    ss.addRow([code, info.name, info.organ_name, info.element, s.principio, s.paciente, s.naturezas.join(SEP),
      s.prefira.map((i) => nome[i]).join(SEP), s.evite.map((i) => nome[i]).join(SEP), s.preparo,
      s.revisado ? 'Sim' : 'Não', '']);
  }
  styleSheet(ss, [11, 24, 15, 10, 40, 55, 16, 60, 45, 35, 11, 30], { wrapCols: [5, 6, 8, 9, 10, 12] });
  dropdown(ss, 11, ['Sim', 'Não'], codes.length);

  // --- Alimentos
  const sa = wb.addWorksheet('Alimentos');
  sa.addRow(['Código', 'Nome', 'Grupo', 'Natureza', 'Sabores', 'Elemento (pelo 1º sabor)', 'Órgãos',
    'Ações', 'Alertas', 'Observação', 'Revisado?', 'Comentário']);
  for (const a of d.alimentos) {
    sa.addRow([a.id, a.nome, a.grupo, a.natureza, a.sabores.join(' '), a.elemento, a.orgaos.join(' '),
      a.acoes.map((c) => d.acoes[c]).join(SEP), a.alertas.map((c) => d.alertas[c]).join(SEP), a.obs,
      a.revisado ? 'Sim' : 'Não', '']);
  }
  styleSheet(sa, [24, 30, 20, 10, 16, 14, 14, 55, 28, 45, 11, 30], { wrapCols: [8, 10, 12] });
  const grupos = [...new Set(d.alimentos.map((a) => a.grupo))];
  dropdown(sa, 3, grupos, d.alimentos.length + 30);
  dropdown(sa, 4, NATUREZAS, d.alimentos.length + 30);
  dropdown(sa, 11, ['Sim', 'Não'], d.alimentos.length + 30);

  // --- Elementos
  const se = wb.addWorksheet('Elementos');
  se.addRow(['Elemento', 'Sabor', 'Cor', 'Órgãos', 'Estação', 'Orientação geral', 'Alimentos típicos (separe por ;)', 'Revisado?', 'Comentário']);
  for (const [k, e] of Object.entries(d.elementos)) {
    se.addRow([k, e.sabor, e.cor, e.orgaos, e.estacao, e.orientacao, e.alimentos.map((i) => nome[i]).join(SEP), e.revisado ? 'Sim' : 'Não', '']);
  }
  styleSheet(se, [11, 16, 16, 24, 18, 70, 50, 11, 30], { wrapCols: [6, 7, 9] });
  dropdown(se, 8, ['Sim', 'Não'], 5);

  // --- Legenda
  const sl = wb.addWorksheet('Legenda');
  sl.addRow(['Tipo', 'Valor', 'Significado']);
  for (const n of NATUREZAS) sl.addRow(['Natureza', n, '']);
  for (const [s, e] of Object.entries(SABOR_ELEMENTO)) sl.addRow(['Sabor', s, `Elemento ${e}`]);
  for (const [k, v] of Object.entries(ORGAOS)) sl.addRow(['Órgão', k, v]);
  for (const v of Object.values(d.acoes)) sl.addRow(['Ação', v, '']);
  for (const v of Object.values(d.alertas)) sl.addRow(['Alerta', v, 'Usado para tirar o alimento das sugestões quando a síndrome pede']);
  styleSheet(sl, [12, 50, 60]);

  mkdirSync(dirname(XLSX_PATH), { recursive: true });
  await wb.xlsx.writeFile(XLSX_PATH);
  console.log('Planilha criada:', XLSX_PATH);
}

async function importar(file = XLSX_PATH) {
  const d = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const problemas = [];
  const comentarios = [];
  const rows = (name) => {
    const ws = wb.getWorksheet(name);
    if (!ws) throw new Error(`Aba "${name}" não encontrada`);
    const out = [];
    ws.eachRow((row, n) => { if (n > 1) out.push(row.values.slice(1).map(cellText)); });
    return out.filter((r) => r.some((v) => v.trim()));
  };
  const byLabel = (map, kind) => {
    const rev = Object.fromEntries(Object.entries(map).flatMap(([k, v]) => [[norm(v), k], [norm(k), k]]));
    return (txt, where) => split(txt).map((t) => rev[norm(t)] ?? (problemas.push(`${where}: ${kind} desconhecido "${t}"`), null)).filter(Boolean);
  };
  const acaoDe = byLabel(d.acoes, 'ação');
  const alertaDe = byLabel(d.alertas, 'alerta');

  // Alimentos primeiro (as listas das síndromes dependem dos nomes).
  const alimentos = [];
  for (const [id, nome, grupo, natureza, sab, , org, ac, al, obs, rev, com] of rows('Alimentos')) {
    if (!nome.trim()) continue;
    const where = `Alimento "${nome}"`;
    if (!NATUREZAS.includes(natureza.trim())) problemas.push(`${where}: natureza "${natureza}" inválida`);
    const sabores = sab.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const s of sabores) if (!SABOR_ELEMENTO[s]) problemas.push(`${where}: sabor "${s}" desconhecido`);
    alimentos.push({
      id: id.trim() || slug(nome), nome: nome.trim(), grupo: grupo.trim(), natureza: natureza.trim(), sabores,
      elemento: SABOR_ELEMENTO[sabores[0]] ?? '', orgaos: org.trim().split(/\s+/).filter(Boolean),
      acoes: acaoDe(ac, where), alertas: alertaDe(al, where), obs: obs.trim(), revisado: norm(rev) === 'sim',
    });
    if (com.trim()) comentarios.push(`${where}: ${com.trim()}`);
  }
  const ids = new Set();
  for (const a of alimentos) { if (ids.has(a.id)) problemas.push(`Código repetido: ${a.id}`); ids.add(a.id); }

  const acha = (txt, where) => split(txt).map((n) => {
    const k = norm(n);
    const exact = alimentos.filter((a) => norm(a.nome) === k);
    const pre = exact.length ? exact : alimentos.filter((a) => norm(a.nome).startsWith(k));
    if (pre.length === 1) return pre[0].id;
    problemas.push(`${where}: alimento "${n}" ${pre.length ? 'ambíguo' : 'não existe na aba Alimentos'}`);
    return null;
  }).filter(Boolean);

  const sindromes = {};
  for (const [code, nomeS, , , princ, pac, nat, pref, ev, prep, rev, com] of rows('Síndromes')) {
    const where = `Síndrome ${code} (${nomeS})`;
    if (!d.sindromes[code]) { problemas.push(`${where}: código desconhecido`); continue; }
    const naturezas = split(nat);
    for (const n of naturezas) if (!NATUREZAS.includes(n)) problemas.push(`${where}: natureza "${n}" inválida`);
    sindromes[code] = { principio: princ.trim(), paciente: pac.trim(), naturezas, preparo: prep.trim(),
      prefira: acha(pref, where), evite: acha(ev, where), revisado: norm(rev) === 'sim' };
    if (com.trim()) comentarios.push(`${where}: ${com.trim()}`);
  }
  for (const code of Object.keys(d.sindromes)) if (!sindromes[code]) problemas.push(`Síndrome ${code} sumiu da planilha`);

  const elementos = {};
  for (const [k, sabor, cor, orgaos, estacao, orient, alim, rev, com] of rows('Elementos')) {
    const where = `Elemento ${k}`;
    elementos[k] = { sabor: sabor.trim(), cor: cor.trim(), orgaos: orgaos.trim(), estacao: estacao.trim(),
      orientacao: orient.trim(), alimentos: acha(alim, where), revisado: norm(rev) === 'sim' };
    if (com.trim()) comentarios.push(`${where}: ${com.trim()}`);
  }

  if (comentarios.length) console.log(`\nCOMENTÁRIOS DO REVISOR (${comentarios.length}):\n- ` + comentarios.join('\n- '));
  if (problemas.length) {
    console.log(`\nPROBLEMAS (${problemas.length}) — nada foi gravado:\n- ` + problemas.join('\n- '));
    process.exitCode = 1;
    return;
  }
  const tudo = [...alimentos, ...Object.values(sindromes), ...Object.values(elementos)];
  const revisados = tudo.filter((x) => x.revisado).length;
  Object.assign(d, { alimentos, sindromes, elementos, revisado: revisados === tudo.length });
  writeFileSync(JSON_PATH, JSON.stringify(d, null, 2) + '\n');
  console.log(`\nOK: ${alimentos.length} alimentos, ${Object.keys(sindromes).length} síndromes. Revisados: ${revisados}/${tudo.length}.`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'exportar') await exportar();
else if (cmd === 'importar') await importar(arg);
else console.log('Uso: node scripts/dietetica-planilha.mjs exportar | importar [arquivo.xlsx]');
