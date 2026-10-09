// Revisão das síndromes com os livros de referência (09/10/2026):
//  - McDONALD, J.; PENNER, J. Zang Fu Syndromes: Differential Diagnosis and
//    Treatment. Lone Wolf Press, 1994.
//  - MACIOCIA, G. Os Fundamentos da Medicina Chinesa. 2. ed. Roca (cap. 32–42).
//  - AUTEROCHE, B.; NAVAILH, P. O Diagnóstico na Medicina Chinesa.
//  - Os 8 Princípios (Maciocia, apostila) — pulso e língua por princípio.
//  - MACIOCIA, G. Ginecologia e Obstetrícia (Calor no Sangue).
// Acrescenta 17 síndromes, corrige 9, cria perguntas novas e liga pulso e
// língua às síndromes. Mexe em app_data.json, dietetica.json e
// auriculo-sugestoes.json. Os códigos antigos não mudam (fichas salvas).
//
// Uso (uma vez): node scripts/sindromes-livros.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const arq = (n) => new URL(`../src/data/${n}`, import.meta.url);
const ler = (n) => JSON.parse(readFileSync(arq(n), 'utf8'));
const gravar = (n, d, ind = 1) => writeFileSync(arq(n), JSON.stringify(d, null, ind) + '\n');

const app = ler('app_data.json');
if (app.syndromes.DefYnF) throw new Error('Já aplicado (DefYnF existe).');
const diet = ler('dietetica.json');
const Q = new Map(app.questions.map((q) => [q.key, q]));
const q = (k) => { const x = Q.get(k); if (!x) throw new Error(`pergunta não encontrada: ${k}`); return x; };
const liga = (keys, codes) => { for (const k of keys) for (const c of codes) if (!q(k).syndromes.includes(c)) q(k).syndromes.push(c); };
const desliga = (keys, code) => { for (const k of keys) q(k).syndromes = q(k).syndromes.filter((s) => s !== code); };

// ---------------------------------------------------------------- síndromes novas
// [código, nome curto, órgão, nome do órgão, elemento, alma, princípio, pontos, psicossomática]
const NOVAS = [
  ['DefYnF', 'Defic. Yin do F', 'F', 'Fígado', 'Madeira', 'Hun', 'Nutrir o Yin do Fígado (e do Rim), clarear os olhos e acalmar o Hun.', 'F8 (Ququan), F3, R3, BP6, B18, B23.', 'Hun sem raiz: cansaço de “correr atrás”, irritação seca, sensação de vazio de direção.'],
  ['FinvBP', 'Fígado invade o BP', 'F', 'Fígado', 'Madeira', 'Hun', 'Harmonizar o Fígado e o Baço: mover o Qi do Fígado e fortalecer o Baço.', 'F13 (Zhangmen), F3, VB34, E36, BP6, VC6, E25.', 'Tensão que “desce para a barriga”: preocupação e frustração somadas, intestino que reage ao humor.'],
  ['FinvE', 'Fígado invade o E', 'F', 'Fígado', 'Madeira', 'Hun', 'Acalmar o Fígado e fazer descer o Qi do Estômago.', 'F14 (Qimen), F3, VB34, VC13, VC12, E36, CS6.', 'Raiva engolida que vira azia e arroto; dificuldade em “digerir” contrariedades.'],
  ['FlmMente', 'Fleuma anuvia a Mente', 'C', 'Coração', 'Fogo', 'Shen', 'Transformar a Fleuma, abrir os orifícios da Mente e acalmar o Shen.', 'CS5 (Jianshi), C9, VG26, E40, VC12, B15.', 'Shen nublado: confusão, olhar distante, desligamento da realidade.'],
  ['RnaoRecQi', 'Rim não recebe o Qi', 'R', 'Rim', 'Água', 'Zhi', 'Tonificar o Rim, fortalecer a recepção do Qi e acalmar a asma.', 'R7, R3, VC4, VC6, B23, P9, VC17.', 'Fôlego curto para a vida: medo de não dar conta, falta de reserva.'],
  ['FrioCanalF', 'Frio no canal do F', 'F', 'Fígado', 'Madeira', 'Hun', 'Aquecer o canal do Fígado e dispersar o Frio.', 'F1, F3, F5, VC3, VC4 (moxa), BP6.', 'Contração e retraimento por frio afetivo; dificuldade de se soltar.'],
  ['DefFrioID', 'Frio e deficiência no ID', 'ID', 'Intestino Delgado', 'Fogo', 'Shen', 'Aquecer e tonificar o Intestino Delgado e o Baço.', 'VC6, E25, E39, E36, B27, B20 (moxa).', 'Falta de calor para separar o que serve do que não serve.'],
  ['CalorIG', 'Calor no IG', 'IG', 'Intestino Grosso', 'Metal', 'Po', 'Clarear o Calor do Intestino Grosso e umedecer as fezes.', 'IG11, IG4, E25, E37, B25, TA6.', 'Retenção irritada: segurar o que deveria ser solto.'],
  ['SecIG', 'Secura no IG', 'IG', 'Intestino Grosso', 'Metal', 'Po', 'Nutrir os líquidos e umedecer o Intestino Grosso.', 'E25, E36, BP6, R6, VC4, B25.', 'Secura afetiva: dificuldade de fluir e de soltar.'],
  ['EstXueE', 'Estase Xue no E', 'E', 'Estômago', 'Terra', 'Yi', 'Mover o Sangue do Estômago e aliviar a dor. Sangramento digestivo exige avaliação médica.', 'VC10, VC12, E34, E36, BP4, CS6, B17, B21.', 'Mágoa antiga que “pesa no estômago” e não se dissolve.'],
  ['CalorXue', 'Calor no Xue', 'F', 'Fígado', 'Madeira', 'Hun', 'Clarear o Calor e esfriar o Sangue.', 'BP10, IG11, BP6, F2, R2, B17.', 'Inquietação que “ferve o sangue”: impulsividade, raiva quente.'],
  ['EstgQiC', 'Estagnação Qi do C', 'C', 'Coração', 'Fogo', 'Shen', 'Mover o Qi do Coração, abrir o tórax e acalmar o Shen.', 'C5, C7, CS6, VC17, P7, E40.', 'Tristeza e preocupação “presas no peito”; aperto e suspiros.'],
  ['CalorP', 'Calor no P', 'P', 'Pulmão', 'Metal', 'Po', 'Clarear o Calor do Pulmão e fazer descer o Qi.', 'P5, P10, P1, IG11, VC17, B13.', 'Indignação e luto não expressos que “queimam” o peito.'],
  ['DefXueBP', 'Defic. Xue do BP', 'BP', 'Baço-Pâncreas', 'Terra', 'Yi', 'Tonificar o Baço e nutrir o Sangue.', 'E36, BP6, VC12, B20, B17, VC4.', 'Esgotamento por excesso de preocupação e de cuidar dos outros.'],
  ['UmdCalorE', 'Umidade-Calor no E', 'E', 'Estômago', 'Terra', 'Yi', 'Clarear o Calor, drenar a Umidade e harmonizar o Estômago.', 'VC12, E44, E36, BP9, BP6, IG11, IG20.', 'Ruminação pesada e irritada.'],
  ['DefFrioB', 'Frio e deficiência na B', 'B', 'Bexiga', 'Água', 'Zhi', 'Aquecer e firmar a Bexiga e o Rim.', 'B23, B28, VC4, VC3, R3, VG4 (moxa).', 'Medo que “escapa”: dificuldade de reter e de se sentir seguro.'],
  ['CalorQiF', 'Calor por estagnação do F', 'F', 'Fígado', 'Madeira', 'Hun', 'Mover o Qi do Fígado e clarear o Calor.', 'F2, F3, VB34, CS6, TA6, VC17.', 'Frustração antiga que virou irritação quente.'],
];
for (const [code, name, organ, organ_name, element, alma, principio, pontos, psicossomatica] of NOVAS) {
  app.syndromes[code] = { code, name, organ, organ_name, element, alma };
  app.clinical_notes[code] = { principio, pontos, psicossomatica };
}

// ---------------------------------------------------------------- nomes corrigidos
const NOMES = { ColapsQiBP: 'Afundamento Qi do BP', DefQiVB: 'Deficiência da VB', ObstID: 'Dor por Qi no ID', UmdFrioIG: 'Frio no IG' };
for (const [c, n] of Object.entries(NOMES)) app.syndromes[c].name = n;
app.clinical_notes.ColapsQiC.principio += ' Quadro grave: encaminhar ao pronto-socorro.';

// ---------------------------------------------------------------- perguntas novas
let nextId = Math.max(...app.questions.map((x) => +x.id.replace('item_', ''))) + 1;
function nova(depoisDe, key, subcat, label, syndromes, exc_def = '', fr_cal = '', sup_prof = 'Prof') {
  const anc = q(depoisDe);
  const novaQ = { id: `item_${nextId++}`, key, cat: anc.cat, subcat, label, exc_def, fr_cal, sup_prof, syndromes };
  app.questions.splice(app.questions.indexOf(anc) + 1, 0, novaQ);
  Q.set(key, novaQ);
}
nova('MENTAL_emocional_tristeza', 'MENTAL_emocional_ansiedade', 'Emocional', 'Ansiedade', ['DefXueC', 'DefYnC', 'FlmC', 'DefQiVB'], 'Def');
nova('MENTAL_emocional_ansiedade', 'MENTAL_emocional_assusta facilmente', 'Emocional', 'Assusta-se facilmente', ['DefXueC', 'DefYnC', 'DefQiVB', 'FlmC', 'DefXueF'], 'Def');
nova('MENTAL_emocional_assusta facilmente', 'MENTAL_emocional_indecisao', 'Emocional', 'Indecisão / timidez', ['DefQiVB'], 'Def');
nova('MENTAL_emocional_indecisao', 'MENTAL_emocional_confusao mental', 'Emocional', 'Confusão mental', ['FlmMente', 'FlmC'], 'Exc');
nova('CORPO_pele_seca', 'CORPO_pele_erupcoes vermelhas', 'Pele', 'Erupções vermelhas', ['CalorXue', 'UmdCalorBP'], 'Exc', 'Calor');
nova('CORPO_pele_erupcoes vermelhas', 'CORPO_cabelo_queda', 'Cabelo', 'Queda de cabelo', ['DefJgR', 'DefXueF']);
nova('CORPO_cabelo_queda', 'CORPO_cabelo_branco cedo', 'Cabelo', 'Embranquecimento precoce', ['DefJgR']);
nova('OLHOS_visao_pontos escuros', 'OLHOS_visao_noturna fraca', 'Visão', 'Enxerga mal à noite', ['DefXueF', 'DefYnF'], 'Def');
nova('NARIZOUVIDO_nariz_epistaxe', 'NARIZOUVIDO_nariz_seco', 'Nariz', 'Seco', ['SecP', 'DefYnP'], 'Def', 'Calor');
nova('RESPIRATORIO_tosse_tosse seca', 'RESPIRATORIO_catarro na garganta', 'Catarro preso na garganta', 'Catarro preso na garganta', ['FlmMente', 'FlmFrioP', 'FlmC'], 'Exc');
nova('RESPIRATORIO_catarro na garganta', 'RESPIRATORIO_voz fraca', 'Voz fraca', 'Voz fraca', ['DefQiP', 'RnaoRecQi', 'DefQiC'], 'Def');
nova('RESPIRATORIO_voz fraca', 'RESPIRATORIO_resfria facilmente', 'Resfria-se com facilidade', 'Resfria-se com facilidade', ['DefQiP'], 'Def', '', 'Sup');
nova('RESPIRATORIO_resfria facilmente', 'RESPIRATORIO_falta de ar ao esforco', 'Falta de ar ao esforço / difícil puxar o ar', 'Falta de ar ao esforço / difícil puxar o ar', ['RnaoRecQi', 'DefQiP', 'DefQiC', 'DefYgC'], 'Def');
nova('GASTRICO_estomago_azia e refluxo', 'GASTRICO_estomago_arrotos', 'Estômago', 'Arrotos', ['RebelE', 'FinvE', 'AlimE'], 'Exc');
nova('GASTRICO_estomago_arrotos', 'GASTRICO_estomago_vomito claro', 'Estômago', 'Vômito de líquido claro', ['FrioE', 'FrioCanalF'], 'Exc', 'Frio');
nova('GASTRICO_estomago_vomito claro', 'GASTRICO_estomago_vomito com sangue', 'Estômago', 'Vômito com sangue ou fezes pretas (procurar médico)', ['EstXueE'], 'Exc');
nova('GASTRICO_abdome_queimacao periumbilical', 'GASTRICO_abdome_borborigmos', 'Abdome', 'Barulhos na barriga (borborigmos)', ['ObstID', 'DefFrioID', 'UmdFrioIG', 'FinvBP'], '', 'Frio');
nova('GASTRICO_abdome_borborigmos', 'GASTRICO_abdome_alivia gases', 'Abdome', 'Dor que alivia ao soltar gases', ['ObstID', 'FinvBP'], 'Exc');
nova('GASTRICO_abdome_alivia gases', 'GASTRICO_abdome_peso para baixo', 'Abdome', 'Sensação de peso “para baixo”', ['ColapsQiBP'], 'Def');
nova('INTESTINO_formato_com restos alimentares', 'INTESTINO_formato_alterna', 'Formato', 'Alterna prisão de ventre e diarreia', ['FinvBP'], 'Exc');
nova('INTESTINO_formato_alterna', 'INTESTINO_formato_cheiro forte', 'Formato', 'Cheiro muito forte', ['UmdCalorIG', 'UmdCalorBP'], 'Exc', 'Calor');
nova('INTESTINO_prolapso anal', 'INTESTINO_queimacao no anus', 'Queimação no ânus', 'Queimação no ânus', ['UmdCalorIG', 'CalorIG'], 'Exc', 'Calor');
nova('URINA_jato_queimacao', 'URINA_urgencia', 'Jato', 'Urgência para urinar', ['UmdCalorB', 'UmdFrioB', 'ColapsQiBP'], 'Exc');
nova('URINA_urgencia', 'URINA_gotejamento', 'Jato', 'Gotejamento depois de urinar', ['DefQiR', 'DefFrioB'], 'Def');
nova('URINA_gotejamento', 'URINA_sangue', 'Cor', 'Sangue na urina', ['UmdCalorB', 'CalorID', 'FgC', 'BPcontrXue', 'CalorXue'], 'Exc', 'Calor');
nova('URINA_sangue', 'URINA_areia', 'Cor', 'Areia ou cálculo', ['UmdCalorB'], 'Exc', 'Calor');
nova('GENITAIS_masculino_dor', 'GENITAIS_masculino_escroto frio', 'Masculino', 'Dor ou retração no escroto (melhora com calor)', ['FrioCanalF', 'ObstID'], 'Exc', 'Frio');
nova('MENSTRUACAO_qtde_irregular', 'MENSTRUACAO_sangramento fora', 'Quantidade', 'Sangramento fora do período', ['BPcontrXue', 'CalorXue'], '', '');
nova('LINGUA_cor_palida', 'LINGUA_cor_vermelha', 'Cor', 'Vermelha', [], '', 'Calor');

// ---------------------------------------------------------------- correções
desliga(['CORPO_transpiracao_profusa e fria'], 'ColapsQiBP');
liga(['CORPO_disfuncoes_cansaco', 'GENITAIS_feminino_prolapso uterino', 'INTESTINO_formato_diarreia', 'MENSTRUACAO_qtde_abundante', 'MEMBROS_fracos'], ['ColapsQiBP']);
liga(['CORPO_transpiracao_profusa e fria', 'MEMBROS_maos_maos frias', 'MEMBROS_pes_pes frios', 'FACE_aspecto_arroxeada', 'CORPO_disfuncoes_falta de ar'], ['ColapsQiC']);
desliga(['CORPO_disfuncoes_pressao alta'], 'DefQiVB');
liga(['RESPIRATORIO_suspiros', 'TONTURA_intensidade_tontura em geral', 'OLHOS_visao_embacada', 'SONO_acorda no meio da noite_com pesadelo'], ['DefQiVB']);
desliga(['CORPO_disfuncoes_reumatismo', 'COLUNA_torcicolo', 'MEMBROS_maos_dor nas maos'], 'ObstID');
liga(['GASTRICO_abdome_distensao em geral', 'GASTRICO_estomago_gases', 'GASTRICO_abdome_dor abdominal', 'GENITAIS_masculino_dor', 'DORES_tipo_piora com pressao'], ['ObstID']);
desliga(['CORPO_disfuncoes_reumatismo'], 'CalorID');
liga(['BOCAGARGANTA_aftas', 'URINA_cor_amarelo escura', 'URINA_qtde_diminuida', 'BOCAGARGANTA_dores na garganta', 'GASTRICO_sede_com desejo de beber', 'SONO_inicio_agitado não dorme', 'MENTAL_emocional_agitacao'], ['CalorID']);
// CalorID estava duas vezes na constipação (e FgC também): conta uma vez só.
q('INTESTINO_frequencia_constipacao').syndromes = [...new Set(q('INTESTINO_frequencia_constipacao').syndromes)];
for (const k of ['MEMBROS_bracos_dor no braco', 'MEMBROS_bracos_dor nos ombros', 'MEMBROS_bracos_ombros rigidos', 'BOCAGARGANTA_gostonaboca_metalico', 'BOCAGARGANTA_dor de dente', 'NARIZOUVIDO_nariz_epistaxe', 'CORPO_pele_anormal']) desliga([k], 'UmdCalorIG');
liga(['INTESTINO_formato_diarreia', 'GASTRICO_abdome_dor abdominal', 'URINA_cor_amarelo escura', 'URINA_qtde_diminuida', 'GASTRICO_sede_sem desejo de beber', 'DORES_tipo_peso', 'CORPO_febre_febricula'], ['UmdCalorIG']);
for (const k of ['MEMBROS_bracos_dor no braco', 'MEMBROS_bracos_dor nos ombros', 'MEMBROS_bracos_ombros rigidos', 'BOCAGARGANTA_dor de dente']) desliga([k], 'UmdFrioIG');
liga(['INTESTINO_formato_diarreia', 'GASTRICO_abdome_dor abdominal', 'DORES_tipo_frio', 'DORES_tipo_alivia com calor', 'CORPO_temperatura_frio', 'MEMBROS_maos_maos frias'], ['UmdFrioIG']);
liga(['BOCAGARGANTA_garganta seca', 'BOCAGARGANTA_boca seca', 'CORPO_pele_seca', 'BOCAGARGANTA_rouquidao e pigarro', 'GASTRICO_sede_com desejo de beber'], ['SecP']);
liga(['MENSTRUACAO_qtde_abundante', 'INTESTINO_formato_com sangue ou muco', 'NARIZOUVIDO_nariz_epistaxe', 'CORPO_disfuncoes_cansaco', 'FACE_aspecto_palida', 'GASTRICO_apetite_anorexia'], ['BPcontrXue']);
liga(['DORES_tipo_frio', 'DORES_tipo_alivia com calor', 'DORES_tipo_alivia com pressao', 'MEMBROS_maos_maos frias', 'MEMBROS_pes_pes frios', 'DORES_local_acima do umbigo', 'GASTRICO_estomago_nauseas'], ['FrioE']);

// Sintomas dos livros que faltavam nas síndromes que já existiam.
liga(['SONO_inicio_insonia em geral', 'TONTURA_intensidade_tontura em geral'], ['DefXueC']);
liga(['SONO_inicio_insonia em geral', 'BOCAGARGANTA_boca seca', 'BOCAGARGANTA_garganta seca'], ['DefYnC']);
liga(['CORPO_disfuncoes_cansaco', 'FACE_aspecto_palida', 'CORPO_febre_aversao a frio'], ['DefQiP']);
liga(['SONO_inicio_insonia em geral', 'INTESTINO_frequencia_constipacao', 'INTESTINO_formato_ressecadas', 'CEFALEIA_localizacao_temporal', 'GASTRICO_sede_com desejo de beber', 'NARIZOUVIDO_ouvido_zumbidos'], ['FgF']);
liga(['SONO_inicio_insonia em geral', 'GASTRICO_sede_com desejo de beber', 'BOCAGARGANTA_gostonaboca_amargo'], ['FgC']);
liga(['GASTRICO_sede_sem desejo de beber', 'CORPO_febre_febricula'], ['UmdCalorB']);
liga(['URINA_incontinencia urinaria', 'URINA_frequencia_enurese noturna', 'URINA_frequencia_nocturia', 'GENITAIS_feminino_corrimento_branco', 'GENITAIS_feminino_prolapso uterino', 'URINA_cor_transparente'], ['DefQiR']);
liga(['BOCAGARGANTA_gostonaboca_amargo', 'GASTRICO_estomago_nauseas', 'URINA_cor_amarelo escura', 'GENITAIS_feminino_doenca'], ['UmdCalorF']);
liga(['CORPO_disfuncoes_epilepsia'], ['VtF', 'FlmMente']);
liga(['CORPO_febre_aversao a frio'], ['VtFrioP']);
liga(['SONO_inicio_insonia em geral', 'MENTAL_emocional_neurose', 'MENTAL_emocional_anormal'], ['FlmC']);
liga(['SONO_inicio_insonia em geral', 'BOCAGARGANTA_garganta seca', 'INTESTINO_formato_ressecadas'], ['DefYnR']);
liga(['INTESTINO_formato_ressecadas'], ['DefYnE']);
liga(['COLUNA_lombar_fria', 'CORPO_temperatura_frio'], ['DefYgR']);
liga(['CORPO_temperatura_frio', 'DORES_tipo_alivia com calor'], ['DefYgBP']);
liga(['CORPO_temperatura_frio'], ['DefYgC']);

// ---------------------------------------------------------------- sintomas das síndromes novas
const SINT = {
  DefYnF: ['OLHOS_secura', 'OLHOS_visao_embacada', 'OLHOS_visao_pontos escuros', 'TONTURA_intensidade_tontura em geral', 'MEMBROS_maos_formigamento', 'MEMBROS_pes_formigamento', 'SONO_inicio_insonia em geral', 'MEMBROS_pes_caimbras', 'MEMBROS_unhas_secas', 'CORPO_pele_seca', 'FACE_aspecto_macas vermelhas', 'CORPO_transpiracao_mais à noite', 'MENSTRUACAO_qtde_escasso', 'MENSTRUACAO_qtde_ausente', 'BOCAGARGANTA_garganta seca', 'NARIZOUVIDO_ouvido_zumbidos', 'LINGUA_saburra_ausente'],
  FinvBP: ['MENTAL_emocional_irritabilidade', 'GASTRICO_abdome_distensao em geral', 'GASTRICO_abdome_dor abdominal', 'GASTRICO_estomago_gases', 'CORPO_disfuncoes_cansaco', 'INTESTINO_formato_diarreia', 'INTESTINO_formato_bolinhas', 'RESPIRATORIO_suspiros'],
  FinvE: ['MENTAL_emocional_irritabilidade', 'GASTRICO_estomago_distensao', 'GASTRICO_estomago_aperto', 'GASTRICO_estomago_azia e refluxo', 'GASTRICO_estomago_nauseas', 'TORAX_dor nos hipocondrios', 'RESPIRATORIO_suspiros', 'MEMBROS_fracos', 'DORES_local_acima do umbigo'],
  FlmMente: ['MENTAL_emocional_pessoa ausente', 'MENTAL_emocional_anormal', 'MENTAL_emocional_depressao', 'MENTAL_emocional_letargia', 'CORPO_disfuncoes_falaanormal', 'LINGUA_tamanho_edemaciada', 'LINGUA_saburra_com muco'],
  RnaoRecQi: ['CORPO_disfuncoes_falta de ar', 'RESPIRATORIO_tosse_chiadoasma', 'RESPIRATORIO_tosse_cronica', 'CORPO_transpiracao_sem esforço', 'MEMBROS_maos_maos frias', 'CORPO_inchacos_face', 'COLUNA_lombar_fraca', 'NARIZOUVIDO_ouvido_zumbidos', 'TONTURA_intensidade_tontura em geral', 'URINA_cor_transparente'],
  FrioCanalF: ['DORES_local_abaixo do umbigo', 'DORES_tipo_frio', 'DORES_tipo_alivia com calor', 'CORPO_temperatura_frio', 'MEMBROS_maos_maos frias', 'MEMBROS_pes_pes frios', 'CEFALEIA_localizacao_vertex', 'MENSTRUACAO_colica_tipo_alivia com calor'],
  DefFrioID: ['GASTRICO_abdome_dor abdominal', 'DORES_tipo_surda', 'DORES_tipo_alivia com pressao', 'DORES_tipo_alivia com calor', 'INTESTINO_formato_diarreia', 'URINA_cor_transparente', 'URINA_qtde_aumentada', 'MEMBROS_maos_maos frias', 'GASTRICO_desejo_alimentos quentes'],
  CalorIG: ['INTESTINO_frequencia_constipacao', 'INTESTINO_formato_ressecadas', 'URINA_cor_amarelo escura', 'URINA_qtde_diminuida', 'BOCAGARGANTA_boca seca', 'LINGUA_saburra_seca', 'INTESTINO_hemorroidas'],
  SecIG: ['INTESTINO_formato_ressecadas', 'INTESTINO_frequencia_constipacao', 'BOCAGARGANTA_boca seca', 'BOCAGARGANTA_garganta seca', 'CORPO_aspecto_magreza', 'BOCAGARGANTA_mau halito', 'TONTURA_intensidade_tontura em geral'],
  EstXueE: ['GASTRICO_estomago_dor em pontada', 'DORES_tipo_piora com pressao', 'DORES_local_acima do umbigo', 'DORES_intensidade_forte', 'GASTRICO_estomago_nauseas', 'LINGUA_cor_arroxeada'],
  CalorXue: ['CORPO_temperatura_calor', 'GASTRICO_sede_com desejo de beber', 'NARIZOUVIDO_nariz_epistaxe', 'MENSTRUACAO_cor_vermelho forte', 'MENSTRUACAO_qtde_abundante', 'MENSTRUACAO_ciclo_curto', 'MENTAL_emocional_agitacao'],
  EstgQiC: ['TORAX_coracao_palpitacao', 'TORAX_peito_pressao no peito', 'MENTAL_emocional_depressao', 'BOCAGARGANTA_caroço na garganta', 'RESPIRATORIO_suspiros', 'CORPO_disfuncoes_falta de ar', 'GASTRICO_apetite_anorexia', 'MEMBROS_maos_maos frias', 'TORAX_peito_dor no peito'],
  CalorP: ['RESPIRATORIO_tosse_forte', 'CORPO_disfuncoes_falta de ar', 'CORPO_temperatura_calor', 'DORES_local_peito', 'GASTRICO_sede_com desejo de beber', 'FACE_aspecto_vermelha'],
  DefXueBP: ['GASTRICO_apetite_anorexia', 'GASTRICO_estomago_distensao', 'CORPO_disfuncoes_cansaco', 'MENTAL_emocional_letargia', 'FACE_aspecto_palida', 'MEMBROS_fracos', 'INTESTINO_formato_diarreia', 'CORPO_aspecto_magreza', 'MENSTRUACAO_qtde_escasso', 'MENSTRUACAO_qtde_ausente', 'SONO_inicio_insonia em geral'],
  UmdCalorE: ['GASTRICO_estomago_peso', 'GASTRICO_estomago_queimacao', 'GASTRICO_estomago_nauseas', 'GASTRICO_sede_sem desejo de beber', 'NARIZOUVIDO_nariz_entupido', 'NARIZOUVIDO_secrecao_amarela', 'DORES_local_acima do umbigo', 'CORPO_temperatura_calor'],
  DefFrioB: ['URINA_frequencia_mais de 7x', 'URINA_qtde_aumentada', 'URINA_cor_transparente', 'URINA_incontinencia urinaria', 'URINA_frequencia_enurese noturna', 'URINA_frequencia_nocturia', 'COLUNA_lombar_fria', 'CORPO_temperatura_frio'],
  CalorQiF: ['TORAX_dor nos hipocondrios', 'TORAX_desconforto nos hipocondrios', 'TORAX_peito_pressao no peito', 'MENTAL_emocional_irritabilidade', 'MENTAL_emocional_impaciencia', 'BOCAGARGANTA_gostonaboca_amargo', 'FACE_aspecto_vermelha', 'MENSTRUACAO_ciclo_curto', 'MENSTRUACAO_mamas doloridas'],
};
for (const [code, keys] of Object.entries(SINT)) liga(keys, [code]);

// ---------------------------------------------------------------- pulso e língua (8 Princípios)
const CALOR = ['FgC', 'FgF', 'CalorE', 'CalorID', 'CalorIG', 'CalorP', 'CalorXue', 'CalorQiF', 'UmdCalorBP', 'UmdCalorB', 'UmdCalorF', 'UmdCalorIG', 'UmdCalorE', 'FlmCalorP', 'FlmC', 'VtCalorP'];
const YIN = ['DefYnR', 'DefYnC', 'DefYnP', 'DefYnE', 'DefYnF'];
const FRIO = ['DefYgR', 'DefYgBP', 'DefYgC', 'FrioE', 'FrioCanalF', 'DefFrioID', 'UmdFrioIG', 'UmdFrioBP', 'UmdFrioB', 'DefFrioB', 'FlmFrioP', 'VtFrioP'];
const PULSO_LINGUA = {
  PULSO_rapido: [...CALOR, ...YIN],
  PULSO_lento: FRIO.filter((c) => c !== 'VtFrioP'),
  PULSO_superficial: ['VtFrioP', 'VtCalorP'],
  PULSO_profundo: ['DefYgR', 'DefYgBP', 'DefYgC', 'DefFrioID', 'DefFrioB', 'FrioCanalF', 'FrioE', 'DefQiR', 'ObstID', 'RnaoRecQi'],
  PULSO_forte: ['FgC', 'FgF', 'CalorE', 'CalorIG', 'CalorID', 'AlimE', 'FlmC'],
  PULSO_fraca: ['DefQiP', 'DefQiBP', 'DefQiC', 'DefQiE', 'DefQiR', 'DefYgR', 'DefYgBP', 'DefYgC', 'ColapsQiBP', 'ColapsQiC', 'BPcontrXue', 'DefQiVB', 'DefFrioB', 'DefFrioID', 'RnaoRecQi', 'DefXueBP'],
  PULSO_largo: ['FgC', 'CalorE', 'CalorP'],
  PULSO_fino: ['DefXueC', 'DefXueF', 'DefXueBP', 'BPcontrXue', 'SecIG', ...YIN],
  PULSO_escorregadio: ['FlmFrioP', 'FlmCalorP', 'FlmC', 'FlmMente', 'AlimE', 'UmdFrioBP', 'UmdCalorBP', 'UmdCalorIG', 'UmdCalorB', 'UmdFrioB', 'UmdCalorE', 'UmdCalorF'],
  PULSO_emcorda: ['EstgQiF', 'CalorQiF', 'FgF', 'AscYgF', 'VtF', 'FinvBP', 'FinvE', 'UmdCalorF', 'EstgXueF', 'EstXueE', 'FrioCanalF', 'ObstID'],
  LINGUA_cor_vermelha: [...CALOR.filter((c) => c !== 'VtCalorP'), 'DefYnR', 'DefYnC', 'DefYnP'],
  'LINGUA_cor_vermelho escura': ['CalorXue', 'FgF', 'FgC'],
  'LINGUA_cor_pontos vermelhos': ['FgC', 'CalorXue', 'UmdCalorB'],
  LINGUA_cor_palida: ['DefQiP', 'DefQiC', 'DefYgC', 'DefXueC', 'DefQiBP', 'DefXueBP', 'DefFrioID', 'DefFrioB', 'BPcontrXue', 'ColapsQiBP'],
  LINGUA_saburra_amarela: CALOR,
  LINGUA_saburra_branca: ['VtFrioP', 'FlmFrioP', 'UmdFrioBP', 'UmdFrioB', 'UmdFrioIG', 'FrioE', 'FrioCanalF', 'DefFrioID'],
  LINGUA_saburra_grossa: ['AlimE', 'UmdFrioBP', 'UmdCalorBP', 'FlmFrioP', 'FlmCalorP', 'FlmMente', 'CalorIG', 'FrioE'],
  LINGUA_saburra_fina: ['VtFrioP', 'VtCalorP'],
  LINGUA_saburra_escura: ['CalorIG', 'CalorE'],
  LINGUA_tamanho_edemaciada: ['FlmFrioP', 'FlmCalorP'],
};
for (const [k, codes] of Object.entries(PULSO_LINGUA)) liga([k], codes);

for (const x of app.questions) x.syndromes = [...new Set(x.syndromes)];
gravar('app_data.json', app);

// ---------------------------------------------------------------- orientação alimentar
// [princípio, explicação ao paciente, naturezas, preparo, prefira, evite, síndrome parecida (receitas)]
const DIETA = {
  DefYnF: ['Nutrir o Yin do Fígado e do Rim.', 'Falta “umidade” e nutrição ao fígado (olhos secos, visão cansada, calor à noite). Alimentos que nutrem e refrescam de leve.', ['Neutro', 'Fresco'], 'Sopas, caldos e cozidos; evitar fritar e grelhar.', ['goji-berry', 'gergelim-preto', 'feijao-preto', 'ovo', 'espinafre', 'beterraba', 'tofu-e-soja', 'pera', 'amora', 'cha-de-crisantemo', 'pato', 'ostra-e-mariscos'], ['pimenta-vermelha', 'pimenta-do-reino', 'bebidas-alcoolicas', 'cafe', 'frituras-e-comidas-gordurosas', 'carne-de-cordeiro'], 'DefYnR'],
  FinvBP: ['Harmonizar o Fígado e fortalecer o Baço.', 'A tensão emocional mexe com o intestino. Refeições calmas, em horários regulares, comida morna e fácil de digerir.', ['Neutro', 'Morno'], 'Cozidos, sopas e vapor; comer devagar e sem pressa.', ['arroz-branco', 'abobora', 'cenoura', 'inhame-cara', 'casca-de-tangerina-seca', 'hortela', 'erva-doce-funcho', 'cardamomo', 'aveia', 'batata-doce'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'frituras-e-comidas-gordurosas', 'cafe', 'bebidas-alcoolicas', 'acucar-refinado-e-doces'], 'EstgQiF'],
  FinvE: ['Acalmar o Fígado e harmonizar o Estômago.', 'A irritação “sobe” para o estômago (azia, arroto, enjoo). Refeições leves, sem pressa, evitando o que irrita o estômago.', ['Neutro', 'Fresco'], 'Cozidos e vapor; pequenas porções.', ['arroz-branco', 'aveia', 'batata', 'abobrinha', 'chuchu', 'hortela', 'casca-de-tangerina-seca', 'camomila-cha', 'gengibre-fresco', 'repolho'], ['cafe', 'bebidas-alcoolicas', 'pimenta-vermelha', 'frituras-e-comidas-gordurosas', 'vinagre', 'acucar-refinado-e-doces'], 'EstgQiF'],
  FlmMente: ['Transformar a Fleuma e clarear a mente.', 'Há “muco” atrapalhando a clareza da mente. Comida leve, pouca gordura, pouco doce e pouco laticínio.', ['Neutro', 'Morno'], 'Cozidos leves; evitar comida pesada à noite.', ['rabanete-nabo', 'casca-de-tangerina-seca', 'cevada', 'feijao-azuki', 'alho-poro', 'algas-kombu-nori', 'cogumelo-shiitake', 'gengibre-fresco', 'pera', 'cha-verde'], ['leite-de-vaca', 'queijo', 'frituras-e-comidas-gordurosas', 'acucar-refinado-e-doces', 'embutidos-e-industrializados', 'bebidas-alcoolicas', 'amendoim'], 'FlmC'],
  RnaoRecQi: ['Tonificar o Rim e o Pulmão para firmar a respiração.', 'Falta “reserva” para o fôlego. Alimentos quentinhos e nutritivos, que fortalecem o rim.', ['Morno', 'Neutro'], 'Sopas e cozidos longos; caldo de ossos.', ['nozes', 'castanha-portuguesa', 'gergelim-preto', 'feijao-preto', 'caldo-de-ossos', 'carne-de-cordeiro', 'inhame-cara', 'goji-berry', 'camarao', 'amendoa'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'acucar-refinado-e-doces', 'leite-de-vaca'], 'DefYgR'],
  FrioCanalF: ['Aquecer o canal do Fígado e dispersar o Frio.', 'O frio “contrai” o baixo ventre. Comida bem quente e temperos que aquecem.', ['Morno', 'Quente'], 'Cozidos longos e sopas quentes; nada gelado.', ['gengibre-seco', 'canela', 'erva-doce-funcho', 'cravo', 'carne-de-cordeiro', 'alho', 'cebola', 'pimenta-do-reino', 'nozes', 'castanha-portuguesa'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'melancia', 'pepino', 'banana'], 'DefYgR'],
  DefFrioID: ['Aquecer e fortalecer o Intestino Delgado e o Baço.', 'O intestino está “frio” e fraco (dor que melhora com calor, diarreia). Comida morna e cozida.', ['Morno', 'Neutro'], 'Cozidos, sopas e mingaus; nada cru nem gelado.', ['arroz-branco', 'gengibre-seco', 'abobora', 'cenoura', 'inhame-cara', 'erva-doce-funcho', 'canela', 'cardamomo', 'frango', 'tamara-jujuba'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'melancia', 'leite-de-vaca', 'acucar-refinado-e-doces'], 'DefYgBP'],
  CalorIG: ['Clarear o Calor e umedecer o Intestino Grosso.', 'O intestino está “quente e seco” (fezes duras, queimação). Mais água, fibras e alimentos que refrescam.', ['Fresco', 'Neutro'], 'Cozidos e crus moderados; muita água.', ['banana', 'pera', 'mamao', 'espinafre', 'aipo-salsao', 'pepino', 'linhaca', 'ameixa-seca', 'abobrinha', 'agua-de-coco'], ['pimenta-vermelha', 'pimenta-do-reino', 'frituras-e-comidas-gordurosas', 'bebidas-alcoolicas', 'carne-de-cordeiro', 'cafe', 'pao-branco-e-massas-refinadas'], 'CalorE'],
  SecIG: ['Nutrir os líquidos e umedecer o intestino.', 'Faltam líquidos para as fezes saírem (fezes secas, difíceis). Alimentos que umedecem e boas gorduras.', ['Neutro'], 'Sopas, mingaus e caldos; muita água morna.', ['gergelim-preto', 'linhaca', 'nozes', 'amendoa', 'pera', 'banana', 'mamao', 'espinafre', 'mel', 'ameixa-seca', 'aveia'], ['pimenta-vermelha', 'frituras-e-comidas-gordurosas', 'cafe', 'bebidas-alcoolicas', 'pao-branco-e-massas-refinadas'], 'DefYnE'],
  EstXueE: ['Mover o Sangue e proteger o Estômago.', 'Há estagnação no estômago (dor fixa, em pontada). Refeições leves e mornas. Sangramento exige avaliação médica.', ['Neutro', 'Morno'], 'Cozidos macios; porções pequenas.', ['cebola', 'curcuma-acafrao-da-terra', 'shiitake', 'cogumelo-shiitake', 'feijao-azuki', 'berinjela', 'gengibre-fresco', 'arroz-branco', 'abobora'], ['frituras-e-comidas-gordurosas', 'bebidas-alcoolicas', 'cafe', 'pimenta-vermelha', 'bebidas-geladas-e-sorvetes'], 'EstgXueF'],
  CalorXue: ['Clarear o Calor e esfriar o Sangue.', 'O sangue está “quente” (sangramentos, manchas vermelhas, menstruação forte). Alimentos frescos e nada de temperos fortes.', ['Fresco', 'Neutro'], 'Cozidos rápidos, vapor e crus moderados.', ['aipo-salsao', 'pepino', 'melancia', 'pera', 'espinafre', 'broto-de-feijao', 'feijao-mungo-moyashi', 'tofu-e-soja', 'agua-de-coco', 'cha-de-crisantemo'], ['pimenta-vermelha', 'pimenta-do-reino', 'bebidas-alcoolicas', 'carne-de-cordeiro', 'frituras-e-comidas-gordurosas', 'cafe', 'gengibre-seco', 'canela'], 'FgF'],
  EstgQiC: ['Mover o Qi e abrir o tórax.', 'Aperto no peito e tristeza “presa”. Refeições leves e aromáticas, que ajudam o Qi a circular.', ['Neutro', 'Morno'], 'Cozidos leves com temperos aromáticos.', ['casca-de-tangerina-seca', 'hortela', 'cebola', 'cebolinha', 'manjericao', 'rabanete-nabo', 'alho-poro', 'camomila-cha', 'arroz-branco'], ['frituras-e-comidas-gordurosas', 'acucar-refinado-e-doces', 'bebidas-geladas-e-sorvetes', 'embutidos-e-industrializados'], 'EstgQiF'],
  CalorP: ['Clarear o Calor do Pulmão.', 'O pulmão está “quente” (tosse, sede, calor). Alimentos que refrescam e umedecem.', ['Fresco', 'Neutro'], 'Sopas leves, chás e frutas.', ['pera', 'rabanete-nabo', 'agriao', 'caqui', 'melancia', 'tangerina-fruta', 'broto-de-feijao', 'aipo-salsao', 'cha-verde'], ['pimenta-vermelha', 'pimenta-do-reino', 'frituras-e-comidas-gordurosas', 'bebidas-alcoolicas', 'carne-de-cordeiro'], 'FlmCalorP'],
  DefXueBP: ['Fortalecer o Baço e nutrir o Sangue.', 'O baço fraco não forma sangue suficiente (cansaço, palidez, menstruação escassa). Comida nutritiva, morna e cozida.', ['Neutro', 'Morno'], 'Sopas, caldos e cozidos.', ['tamara-jujuba', 'feijao-preto', 'beterraba', 'espinafre', 'ovo', 'carne-bovina', 'figado-boi-ou-galinha', 'goji-berry', 'arroz-branco', 'abobora', 'caldo-de-ossos'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'acucar-refinado-e-doces', 'cafe'], 'DefXueF'],
  UmdCalorE: ['Clarear o Calor e drenar a Umidade do Estômago.', 'O estômago está “pesado e quente” (enjoo, sinusite, peso). Comida leve, sem fritura nem doce.', ['Fresco', 'Neutro'], 'Cozidos leves e vapor.', ['feijao-azuki', 'feijao-mungo-moyashi', 'cevada', 'pepino', 'aipo-salsao', 'rabanete-nabo', 'abobrinha', 'cha-verde', 'milho-e-fuba'], ['frituras-e-comidas-gordurosas', 'acucar-refinado-e-doces', 'leite-de-vaca', 'queijo', 'bebidas-alcoolicas', 'pimenta-vermelha', 'embutidos-e-industrializados'], 'UmdCalorBP'],
  DefFrioB: ['Aquecer e firmar a Bexiga e o Rim.', 'A bexiga está “fria e fraca” (urina clara e frequente). Comida quente, sem gelados.', ['Morno', 'Quente'], 'Sopas e cozidos longos.', ['nozes', 'castanha-portuguesa', 'canela', 'carne-de-cordeiro', 'feijao-preto', 'gengibre-seco', 'erva-doce-funcho', 'camarao', 'caldo-de-ossos'], ['bebidas-geladas-e-sorvetes', 'saladas-e-alimentos-crus', 'melancia', 'pepino', 'cafe'], 'DefYgR'],
  CalorQiF: ['Mover o Qi do Fígado e clarear o Calor.', 'A tensão acumulada virou calor (irritação, gosto amargo). Alimentos frescos e leves, pouco álcool e fritura.', ['Fresco', 'Neutro'], 'Cozidos leves, vapor e saladas moderadas.', ['aipo-salsao', 'cha-de-crisantemo', 'hortela', 'pepino', 'broto-de-feijao', 'rabanete-nabo', 'tangerina-fruta', 'espinafre', 'pera'], ['bebidas-alcoolicas', 'frituras-e-comidas-gordurosas', 'pimenta-vermelha', 'cafe', 'carne-de-cordeiro'], 'FgF'],
};
const ALIM = new Set((Array.isArray(diet.alimentos) ? diet.alimentos : Object.values(diet.alimentos)).map((a) => a.id));
for (const [code, [principio, paciente, naturezas, preparo, prefira, evite, parecida]] of Object.entries(DIETA)) {
  diet.sindromes[code] = {
    principio, paciente, naturezas, preparo,
    prefira: prefira.filter((id) => ALIM.has(id)),
    evite: evite.filter((id) => ALIM.has(id)),
    revisado: false,
  };
  for (const r of diet.receitas) if (r.indicacoes.includes(parecida) && !r.indicacoes.includes(code)) r.indicacoes.push(code);
}
gravar('dietetica.json', diet, 2);

// ---------------------------------------------------------------- auriculoterapia
const AURI = {
  DefYnF: [['CO12', 'CO10', 'LO5', 'CO18', 'TF4', 'AT4'], 'Nutrir o Yin do Fígado e do Rim e clarear os olhos.'],
  FinvBP: [['CO12', 'CO13', 'CO7', 'CO17', 'TF4', 'AT4'], 'Harmonizar o Fígado e o Baço.'],
  FinvE: [['CO12', 'CO4', 'CO3', 'TF4', 'AT4', 'CO17'], 'Acalmar o Fígado e harmonizar o Estômago.'],
  FlmMente: [['CO15', 'CO13', 'TF4', 'AT4', 'LO4', 'CO18'], 'Transformar a Fleuma e clarear a Mente.'],
  RnaoRecQi: [['CO10', 'CO14', 'CO16', 'AT4', 'CO18', 'TF4'], 'Tonificar o Rim e o Pulmão; acalmar a asma.'],
  FrioCanalF: [['CO12', 'TF2', 'HX4', 'AH8', 'AT4', 'TF4'], 'Aquecer o canal do Fígado e aliviar a dor.'],
  DefFrioID: [['CO6', 'CO13', 'AH8', 'CO17', 'AT4'], 'Aquecer e fortalecer o Intestino Delgado.'],
  CalorIG: [['CO7', 'HX2', 'CO14', 'HX6,7i', 'AT4'], 'Clarear o Calor do Intestino Grosso.'],
  SecIG: [['CO7', 'HX2', 'CO14', 'CO10', 'CO18'], 'Umedecer o intestino.'],
  EstXueE: [['CO4', 'CO12', 'TF4', 'AT4', 'CO18'], 'Mover o Sangue e aliviar a dor do Estômago.'],
  CalorXue: [['HX6,7i', 'CO12', 'CO15', 'CO18', 'AT4'], 'Clarear o Calor e esfriar o Sangue.'],
  EstgQiC: [['CO15', 'CO12', 'TF4', 'AT4', 'AH10'], 'Mover o Qi do Coração e abrir o tórax.'],
  CalorP: [['CO14', 'HX6,7i', 'TG3', 'AT4', 'CO16'], 'Clarear o Calor do Pulmão.'],
  DefXueBP: [['CO13', 'CO12', 'CO4', 'CO18', 'AT4'], 'Fortalecer o Baço e nutrir o Sangue.'],
  UmdCalorE: [['CO4', 'CO13', 'TG4', 'HX6,7i', 'AT4'], 'Drenar a Umidade-Calor do Estômago.'],
  DefFrioB: [['CO9', 'CO10', 'HX3', 'AT4', 'TF2'], 'Aquecer e firmar a Bexiga.'],
  CalorQiF: [['CO12', 'CO11', 'HX6,7i', 'TF4', 'AT4'], 'Mover o Qi do Fígado e clarear o Calor.'],
};
// Arquivo formatado à mão (uma síndrome por linha): acrescenta as linhas no fim do bloco.
const txt = readFileSync(arq('auriculo-sugestoes.json'), 'utf8');
const ini = txt.indexOf('"sindromes": {');
const fim = txt.indexOf('\n  },', ini);
const linhas = Object.entries(AURI).map(([code, [pontos, principio]]) =>
  `    "${code}": { "pontos": [${pontos.map((p) => JSON.stringify(p)).join(', ')}], "principio": ${JSON.stringify(principio)} }`);
writeFileSync(arq('auriculo-sugestoes.json'), txt.slice(0, fim) + ',\n' + linhas.join(',\n') + txt.slice(fim));
JSON.parse(readFileSync(arq('auriculo-sugestoes.json'), 'utf8'));

console.log(`${Object.keys(app.syndromes).length} síndromes, ${app.questions.length} perguntas`);
