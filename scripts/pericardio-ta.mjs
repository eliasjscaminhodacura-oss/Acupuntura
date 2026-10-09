// Pericárdio e Triplo Aquecedor no Elemento Fogo (09/10/2026):
//  - MACIOCIA, G. Os Fundamentos da Medicina Chinesa. 2. ed. Roca, cap. 33
//    (Padrões do Pericárdio): 5 síndromes, com pontos e fórmulas do livro.
//    Só os sintomas que as diferenciam do Coração (tórax, falta de ar, mãos
//    frias, menstruação, relacionamentos), para não contar o Coração duas vezes.
//  - Triplo Aquecedor: os livros não trazem síndrome Zang Fu própria; conta
//    pela função de "via das águas" (Su Wen cap. 8; Maciocia cap. 18).
// Mexe em app_data.json, dietetica.json e auriculo-sugestoes.json.
//
// Uso (uma vez): node scripts/pericardio-ta.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const arq = (n) => new URL(`../src/data/${n}`, import.meta.url);
const ler = (n) => JSON.parse(readFileSync(arq(n), 'utf8'));
const gravar = (n, d, ind = 1) => writeFileSync(arq(n), JSON.stringify(d, null, ind) + '\n');

const app = ler('app_data.json');
if (app.syndromes.FgCS) throw new Error('Já aplicado (FgCS existe).');
const diet = ler('dietetica.json');
const Q = new Map(app.questions.map((q) => [q.key, q]));
const liga = (keys, code) => {
  for (const k of keys) {
    const x = Q.get(k);
    if (!x) throw new Error(`pergunta não encontrada: ${k}`);
    if (!x.syndromes.includes(code)) x.syndromes.push(code);
  }
};

// [código, nome curto, órgão, nome do órgão, princípio, pontos, psicossomática, sintomas]
const NOVAS = [
  ['DefXueCS', 'Defic. Xue do CS', 'CS', 'Pericárdio',
    'Nutrir o Sangue, fortalecer o Coração e o Pericárdio e mover o Qi e o Sangue no tórax.',
    'CS6 (Neiguan), C7, VC14, VC15, VC4, B17 (moxa), B20, B14, VC17; CS6 com BP4.',
    'Vazio nos relacionamentos: carência, insegurança afetiva, sensação de não ser cuidado.',
    ['TORAX_peito_pressao no peito', 'TORAX_peito_dor no peito', 'CORPO_disfuncoes_falta de ar', 'MEMBROS_maos_maos frias', 'MENTAL_emocional_ansiedade', 'MENSTRUACAO_qtde_escasso', 'MENSTRUACAO_qtde_ausente']],
  ['FgCS', 'Fogo do CS', 'CS', 'Pericárdio',
    'Drenar o Fogo do Coração e do Pericárdio e acalmar o Shen.',
    'CS8 (Laogong), C8, B14, VC15, VC14, VC17, IG11, VG24, VG19, BP6, F2.',
    'Paixão e mágoa nos relacionamentos que “queimam” o peito: agitação, ciúme, inquietação.',
    ['TORAX_peito_pressao no peito', 'TORAX_peito_dor no peito', 'BOCAGARGANTA_aftas', 'MENTAL_emocional_agitacao', 'MENTAL_emocional_irritabilidade', 'BOCAGARGANTA_gostonaboca_amargo', 'MENSTRUACAO_qtde_abundante']],
  ['FlmFgCS', 'Fleuma-Fogo no CS', 'CS', 'Pericárdio',
    'Drenar o Fogo do Pericárdio e do Coração, transformar a Fleuma, abrir os orifícios da Mente e acalmá-la.',
    'CS5 (Jianshi), C7, C8, C9, CS7, VC15, B15, B14, VC17, VC12, E40, BP6, B20, F2.',
    'Relações tumultuadas: explosões, confusão emocional, perda do controle de si.',
    ['TORAX_peito_pressao no peito', 'TORAX_peito_dor no peito', 'RESPIRATORIO_catarro na garganta', 'MENTAL_emocional_irritabilidade', 'MENTAL_emocional_confusao mental', 'MENTAL_emocional_anormal', 'CORPO_disfuncoes_falaanormal', 'BOCAGARGANTA_gostonaboca_amargo', 'LINGUA_saburra_com muco']],
  ['EstgQiCS', 'Estagnação Qi do CS', 'CS', 'Pericárdio',
    'Mover o Qi no tórax, regular o Pericárdio e o Coração e acalmar o Shen.',
    'CS6 (Neiguan), C5, C7, VC14, VC15, VC17, B14, P7, E40, IG4.',
    'Tristeza e frustração nos relacionamentos “presas no peito”: aperto, suspiros, nó na garganta.',
    ['TORAX_peito_pressao no peito', 'TORAX_peito_dor no peito', 'CORPO_disfuncoes_falta de ar', 'RESPIRATORIO_suspiros', 'BOCAGARGANTA_caroço na garganta', 'MENTAL_emocional_depressao', 'MENTAL_emocional_irritabilidade', 'MEMBROS_fracos', 'MEMBROS_maos_maos frias', 'LINGUA_cor_lateral roxa', 'MENSTRUACAO_mamas doloridas']],
  ['EstXueCS', 'Estase Xue do CS', 'CS', 'Pericárdio',
    'Mover o Sangue no tórax, regular o Pericárdio e o Coração e acalmar o Shen. Dor no peito: encaminhar à avaliação médica.',
    'CS6 (Neiguan), CS4 (Ximen), C7, VC14, VC17, B14, B17, BP10.',
    'Mágoa antiga nos relacionamentos que “endureceu” no peito.',
    ['TORAX_coracao_dor precordial', 'TORAX_peito_dor no peito', 'TORAX_peito_pressao no peito', 'DORES_tipo_pontada', 'DORES_local_peito', 'CORPO_disfuncoes_falta de ar', 'FACE_aspecto_arroxeada', 'MEMBROS_maos_maos frias', 'MENSTRUACAO_cor_escuro com coagulo', 'MENSTRUACAO_colica_tipo_forte em pontada']],
  ['AguasTA', 'Via das águas do TA', 'TA', 'Triplo Aquecedor',
    'Abrir e regular a passagem das águas nos três Aquecedores (Pulmão, Baço e Rim) e promover a diurese.',
    'VC5 (Shimen, Mu do TA), B22 (Sanjiaoshu), B39 (Weiyang), TA4, TA6, VC9 (Shuifen), BP9, P7, R7.',
    'Sentir-se “encharcado” e retido: dificuldade de fazer circular e de deixar passar.',
    ['CORPO_inchacos_abdome', 'CORPO_inchacos_ascite', 'CORPO_inchacos_corpo', 'CORPO_inchacos_face', 'CORPO_inchacos_olhos', 'CORPO_inchacos_tornozelo', 'MEMBROS_bracos_bracos inchados', 'MEMBROS_edemas_com cacifo', 'MEMBROS_edemas_sem cacifo', 'FACE_aspecto_inchada', 'URINA_qtde_diminuida', 'GASTRICO_sede_sem desejo de beber', 'LINGUA_saburra_umida', 'PULSO_escorregadio']],
];
for (const [code, name, organ, organ_name, principio, pontos, psicossomatica, sintomas] of NOVAS) {
  app.syndromes[code] = { code, name, organ, organ_name, element: 'Fogo', alma: 'Shen' };
  app.clinical_notes[code] = { principio, pontos, psicossomatica };
  liga(sintomas, code);
}
gravar('app_data.json', app);

// ---------------------------------------------------------------- orientação alimentar
// Pericárdio: parte da síndrome parecida do Coração. TA: própria.
const PARECIDA = { DefXueCS: 'DefXueC', FgCS: 'FgC', FlmFgCS: 'FlmC', EstgQiCS: 'EstgQiC', EstXueCS: 'EstgXueC' };
for (const [code, base] of Object.entries(PARECIDA)) {
  diet.sindromes[code] = { ...structuredClone(diet.sindromes[base]), principio: app.clinical_notes[code].principio.replace(/ Dor no peito.*$/, ''), revisado: false };
}
const ALIM = new Set((Array.isArray(diet.alimentos) ? diet.alimentos : Object.values(diet.alimentos)).map((a) => a.id));
diet.sindromes.AguasTA = {
  principio: 'Abrir a passagem das águas e drenar a retenção de líquidos.',
  paciente: 'O corpo está “segurando água” (inchaço, urina pouca). Alimentos que ajudam a eliminar líquidos, pouco sal e nada gelado.',
  naturezas: ['Neutro', 'Morno'],
  preparo: 'Sopas e cozidos leves; pouco sal.',
  prefira: ['feijao-azuki', 'cevada', 'milho-e-fuba', 'abobora', 'aipo-salsao', 'pepino', 'melancia', 'casca-de-tangerina-seca', 'gengibre-fresco', 'arroz-branco'].filter((id) => ALIM.has(id)),
  evite: ['embutidos-e-industrializados', 'bebidas-geladas-e-sorvetes', 'acucar-refinado-e-doces', 'frituras-e-comidas-gordurosas', 'leite-de-vaca', 'bebidas-alcoolicas'].filter((id) => ALIM.has(id)),
  revisado: false,
};
for (const r of diet.receitas) {
  for (const [code, base] of Object.entries(PARECIDA)) if (r.indicacoes.includes(base) && !r.indicacoes.includes(code)) r.indicacoes.push(code);
  if (r.indicacoes.includes('UmdFrioBP') && !r.indicacoes.includes('AguasTA')) r.indicacoes.push('AguasTA');
}
gravar('dietetica.json', diet, 2);

// ---------------------------------------------------------------- auriculoterapia
const AURI = {
  DefXueCS: [['CO15', 'TF4', 'CO13', 'CO18', 'AT4'], 'Nutrir o Sangue do Coração e do Pericárdio e acalmar o Shen.'],
  FgCS: [['CO15', 'TF4', 'HX6,7i', 'CO12', 'AT4'], 'Drenar o Fogo do Pericárdio e acalmar o Shen.'],
  FlmFgCS: [['CO15', 'TF4', 'AT4', 'CO13', 'CO12', 'HX6,7i'], 'Transformar a Fleuma-Fogo e acalmar o Shen.'],
  EstgQiCS: [['CO15', 'CO12', 'TF4', 'AT4', 'AH10'], 'Mover o Qi no tórax e acalmar o Shen.'],
  EstXueCS: [['CO15', 'AH6a', 'AT4', 'TF4', 'AH10', 'CO12'], 'Mover o Sangue no tórax. Dor no peito: encaminhar à avaliação médica.'],
  AguasTA: [['CO17', 'CO10', 'CO13', 'CO14', 'CO9', 'CO18'], 'Regular o Triplo Aquecedor e drenar os líquidos.'],
};
const txt = readFileSync(arq('auriculo-sugestoes.json'), 'utf8');
const ini = txt.indexOf('"sindromes": {');
const fim = txt.indexOf('\n  },', ini);
const linhas = Object.entries(AURI).map(([code, [pontos, principio]]) =>
  `    "${code}": { "pontos": [${pontos.map((p) => JSON.stringify(p)).join(', ')}], "principio": ${JSON.stringify(principio)} }`);
writeFileSync(arq('auriculo-sugestoes.json'), txt.slice(0, fim) + ',\n' + linhas.join(',\n') + txt.slice(fim));
JSON.parse(readFileSync(arq('auriculo-sugestoes.json'), 'utf8'));

console.log(`${Object.keys(app.syndromes).length} síndromes, ${app.questions.length} perguntas`);
