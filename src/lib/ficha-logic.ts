import type { Answers, FichaData, Question, ScoreResult } from './ficha-types';

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
// subcategoria, preservando a ordem de primeira ocorrência.
export function groupBySubcat(questions: Question[]): { subcat: string; questions: Question[] }[] {
  const order: string[] = [];
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    if (!map.has(q.subcat)) {
      map.set(q.subcat, []);
      order.push(q.subcat);
    }
    map.get(q.subcat)!.push(q);
  }
  return order.map((subcat) => ({ subcat, questions: map.get(subcat)! }));
}
