import type { Answers, FichaData, Question, ScoreResult, Sex } from './ficha-types';

export const NORMAL_LABEL = 'Sem alterações / Normal';

export const SEX_LABEL: Record<'M' | 'F', string> = { M: 'Masculino', F: 'Feminino' };

// Perguntas que só fazem sentido para um dos sexos.
function onlyForSex(q: Question): 'M' | 'F' | null {
  if (q.cat === 'MENSTRUACAO') return 'F';
  if (q.cat === 'CEFALEIA' && q.subcat.includes('fluxo menstrual')) return 'F';
  if (q.cat === 'GENITAIS') {
    if (q.subcat.startsWith('Masculino')) return 'M';
    if (q.subcat.startsWith('Feminino')) return 'F';
  }
  return null;
}

// Devolve uma cópia dos dados só com as perguntas que valem para o sexo
// do paciente. Usada na tela, no cálculo e no PDF, para que respostas de
// perguntas escondidas não contem pontos.
export function dataForSex(data: FichaData, sex: Sex): FichaData {
  if (!sex) return data;
  return {
    ...data,
    questions: data.questions.filter((q) => {
      const only = onlyForSex(q);
      return !only || only === sex;
    }),
  };
}

// Grupos que têm a opção "Sem alterações / Normal": a chave dela e as
// chaves das alterações do mesmo grupo.
export type NormalGroup = { normal: string; others: string[] };

export function normalGroups(data: FichaData): NormalGroup[] {
  const result: NormalGroup[] = [];
  for (const group of groupQuestionsByCategory(data)) {
    for (const { questions } of groupBySubcat(group.questions)) {
      const normal = questions.find((q) => q.label === NORMAL_LABEL);
      if (normal) result.push({ normal: normal.key, others: questions.filter((q) => q !== normal).map((q) => q.key) });
    }
  }
  return result;
}

// "Normal" fica marcado nos grupos sem nenhuma alteração e desmarcado nos
// grupos com alteração.
export function applyNormalDefaults(answers: Answers, groups: NormalGroup[]): Answers {
  const next = { ...answers };
  for (const g of groups) next[g.normal] = !g.others.some((k) => next[k]);
  return next;
}

// Formata "2026-10-15" como "15/10/2026".
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export const ELEMENTS_ORDER = ['Madeira', 'Fogo', 'Terra', 'Metal', 'Água'];

export const ELEMENT_COLOR: Record<string, string> = {
  Madeira: '#5B7A52',
  Fogo: '#A63D2F',
  Terra: '#B98A3D',
  Metal: '#8C8C86',
  Água: '#3E6299',
};

export const ELEMENT_INFO: Record<string, { organ: string; alma: string }> = {
  Madeira: { organ: 'Fígado / Vesícula Biliar', alma: 'Hun' },
  Fogo: { organ: 'Coração / Intestino Delgado', alma: 'Shen' },
  Terra: { organ: 'Baço-Pâncreas / Estômago', alma: 'Yi' },
  Metal: { organ: 'Pulmão / Intestino Grosso', alma: 'Po' },
  Água: { organ: 'Rim / Bexiga', alma: 'Zhi' },
};

// Soma, para cada síndrome e para cada elemento, quantos sintomas
// marcados pelo paciente apontam para eles.
export function computeScores(answers: Answers, data: FichaData): ScoreResult {
  const syndromeScores: Record<string, number> = {};
  const elementScores: Record<string, number> = {};

  for (const element of ELEMENTS_ORDER) elementScores[element] = 0;
  for (const code of Object.keys(data.syndromes)) syndromeScores[code] = 0;

  for (const q of data.questions) {
    if (!answers[q.key]) continue;
    for (const synd of q.syndromes) {
      syndromeScores[synd] = (syndromeScores[synd] || 0) + 1;
      const info = data.syndromes[synd];
      if (info) {
        elementScores[info.element] = (elementScores[info.element] || 0) + 1;
      }
    }
  }

  return { syndromeScores, elementScores };
}

// Ordena as síndromes por pontuação (maior primeiro), descartando as
// que não tiveram nenhum sintoma marcado.
export function topSyndromes(result: ScoreResult, data: FichaData, limit = 8) {
  return Object.entries(result.syndromeScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code, score]) => ({ code, score, info: data.syndromes[code] }));
}

// Agrupa as perguntas por categoria, na ordem em que aparecem em
// data.categories.
export function groupQuestionsByCategory(data: FichaData) {
  const groups: { catCode: string; catName: string; questions: Question[] }[] = [];
  for (const [catCode, catName] of Object.entries(data.categories)) {
    const questions = data.questions.filter((q) => q.cat === catCode);
    if (questions.length) groups.push({ catCode, catName, questions });
  }
  return groups;
}

// Agrupa uma lista de perguntas (já filtrada por categoria) pela
// subcategoria, preservando a ordem de primeira ocorrência. Dentro de cada
// subcategoria, "Sem alterações / Normal" vem sempre primeiro. Itens
// avulsos seguidos (ex.: "Costas tensas", "Torcicolo" — subcategoria com
// um único item de mesmo nome) são juntados num grupo sem título
// (subcat = ''), para não repetir o nome como título.
export function groupBySubcat(questions: Question[]): { subcat: string; questions: Question[] }[] {
  const merged: { subcat: string; questions: Question[] }[] = [];
  for (const group of splitBySubcat(questions)) {
    const single = group.questions.length === 1 && group.questions[0].label === group.subcat;
    const last = merged[merged.length - 1];
    if (single && last && last.subcat === '') last.questions.push(group.questions[0]);
    else merged.push(single ? { subcat: '', questions: [...group.questions] } : group);
  }
  return merged;
}

function splitBySubcat(questions: Question[]): { subcat: string; questions: Question[] }[] {
  const order: string[] = [];
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    if (!map.has(q.subcat)) {
      map.set(q.subcat, []);
      order.push(q.subcat);
    }
    map.get(q.subcat)!.push(q);
  }
  return order.map((subcat) => {
    const qs = map.get(subcat)!;
    return {
      subcat,
      questions: [...qs.filter((q) => q.label === NORMAL_LABEL), ...qs.filter((q) => q.label !== NORMAL_LABEL)],
    };
  });
}
