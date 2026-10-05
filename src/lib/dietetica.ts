import raw from '@/data/dietetica.json';

// Orientação alimentar segundo a MTC (Dietética Chinesa). O conteúdo fica em
// src/data/dietetica.json e é revisado pelo dono pela planilha
// (scripts/dietetica-planilha.mjs). Aqui só se combina esse conteúdo com o
// resultado da ficha e com as escolhas do terapeuta.

export type Alimento = {
  id: string;
  nome: string;
  grupo: string;
  natureza: string;
  sabores: string[];
  elemento: string;
  orgaos: string[];
  acoes: string[];
  alertas: string[];
  obs: string;
};

export type OrientacaoSindrome = {
  principio: string;
  paciente: string;
  naturezas: string[];
  preparo: string;
  prefira: string[];
  evite: string[];
};

export type OrientacaoElemento = {
  sabor: string;
  cor: string;
  orgaos: string;
  estacao: string;
  orientacao: string;
  alimentos: string[];
};

type DietData = {
  aviso: string;
  acoes: Record<string, string>;
  alimentos: Alimento[];
  elementos: Record<string, OrientacaoElemento>;
  sindromes: Record<string, OrientacaoSindrome>;
};

export const DIET = raw as unknown as DietData;
export const FOOD = new Map(DIET.alimentos.map((a) => [a.id, a]));
export const FOOD_GROUPS = [...new Set(DIET.alimentos.map((a) => a.grupo))];

// Escolhas do terapeuta, salvas junto com a ficha (coluna fichas.diet).
export type DietState = {
  sindromes: string[] | null; // null = automático (as 3 mais fortes)
  restricoes: string[];
  removidos: string[]; // alimentos sugeridos que o terapeuta tirou
  extras: string[]; // alimentos acrescentados ao "Prefira"
  observacao: string;
};

export const EMPTY_DIET: DietState = { sindromes: null, restricoes: [], removidos: [], extras: [], observacao: '' };

export function normalizeDiet(v: unknown): DietState {
  const d = (v && typeof v === 'object' ? v : {}) as Partial<DietState>;
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  return {
    sindromes: Array.isArray(d.sindromes) ? list(d.sindromes) : null,
    restricoes: list(d.restricoes),
    removidos: list(d.removidos),
    extras: list(d.extras),
    observacao: typeof d.observacao === 'string' ? d.observacao : '',
  };
}

export const AUTO_SYNDROMES = 3;

// Escala de natureza térmica. Um alimento sai do "Prefira" se estiver a 2
// ou mais passos de tudo o que alguma síndrome escolhida aceita (ex.: frio
// quando uma síndrome pede morno/neutro). Fresco e morno ficam.
const NATUREZA_NIVEL: Record<string, number> = { Quente: 2, Morno: 1, Neutro: 0, Fresco: -1, Frio: -2 };
function conflitaNatureza(food: Alimento, sindromes: OrientacaoSindrome[]) {
  const n = NATUREZA_NIVEL[food.natureza];
  if (n === undefined) return false;
  return sindromes.some((s) => {
    const ok = s.naturezas.map((x) => NATUREZA_NIVEL[x]).filter((x) => x !== undefined);
    return ok.length > 0 && Math.min(...ok.map((x) => Math.abs(x - n))) >= 2;
  });
}
const MAX_PREFIRA = 20;

// Restrições do paciente: tiram alimentos das sugestões e/ou acrescentam um aviso.
export const RESTRICOES: { key: string; label: string; remove: (a: Alimento) => boolean; nota?: string }[] = [
  { key: 'vegetariano', label: 'Vegetariano', remove: (a) => a.grupo === 'Carnes, peixes e ovos' && a.id !== 'ovo' },
  { key: 'vegano', label: 'Vegano', remove: (a) => a.grupo === 'Carnes, peixes e ovos' || a.grupo === 'Laticínios' || a.id === 'mel' },
  { key: 'lactose', label: 'Sem lactose', remove: (a) => a.grupo === 'Laticínios' },
  {
    key: 'gluten', label: 'Sem glúten', remove: (a) => ['trigo-integral', 'centeio', 'cevada', 'pao-branco-e-massas-refinadas', 'aveia'].includes(a.id),
    nota: 'Sem glúten: aveia só se for certificada "sem glúten".',
  },
  {
    key: 'diabetes', label: 'Diabetes', remove: (a) => ['mel', 'acucar-mascavo', 'uva-passa', 'tamara-jujuba', 'lichia', 'caqui', 'ameixa-seca'].includes(a.id),
    nota: 'Diabetes: frutas com moderação, de preferência junto das refeições. Siga também a orientação do seu médico.',
  },
  {
    key: 'hipertensao', label: 'Pressão alta', remove: (a) => ['algas-kombu-nori'].includes(a.id),
    nota: 'Pressão alta: use pouco sal. Siga também a orientação do seu médico.',
  },
  {
    key: 'gestacao', label: 'Gestante', remove: (a) => ['curcuma-acafrao-da-terra', 'canela', 'acucar-mascavo', 'ostra-e-mariscos', 'pimenta-vermelha'].includes(a.id),
    nota: 'Gestante: confirme qualquer mudança na alimentação com o(a) obstetra.',
  },
  { key: 'frutos-do-mar', label: 'Alergia a frutos do mar', remove: (a) => ['camarao', 'ostra-e-mariscos'].includes(a.id) },
  {
    key: 'oleaginosas', label: 'Alergia a castanhas/amendoim',
    remove: (a) => ['nozes', 'castanha-portuguesa', 'castanha-do-para', 'amendoa', 'amendoim'].includes(a.id),
  },
];

export type SugestaoItem = {
  food: Alimento;
  removido: boolean; // tirado pelo terapeuta
  bloqueio: string | null; // restrição que o tirou
};

export type DietResult = {
  elemento: { nome: string; info: OrientacaoElemento } | null;
  sindromes: { code: string; info: OrientacaoSindrome }[];
  prefira: SugestaoItem[];
  extras: SugestaoItem[];
  evite: SugestaoItem[];
  preparos: string[];
  notas: string[];
};

// Elemento com mais marcações na ficha.
export function topElement(elementScores: Record<string, number>): string | null {
  const best = Object.entries(elementScores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
  return best && DIET.elementos[best[0]] ? best[0] : null;
}

export function chosenSyndromes(state: DietState, ranked: string[]): string[] {
  const valid = ranked.filter((c) => DIET.sindromes[c]);
  if (!state.sindromes) return valid.slice(0, AUTO_SYNDROMES);
  return valid.filter((c) => state.sindromes!.includes(c));
}

// Junta as orientações das síndromes escolhidas: os primeiros alimentos de
// cada síndrome vêm primeiro (intercalados); um alimento que alguma
// síndrome manda evitar sai do "Prefira".
export function buildDiet(state: DietState, ranked: string[], elementScores: Record<string, number>): DietResult {
  const codes = chosenSyndromes(state, ranked);
  const sindromes = codes.map((code) => ({ code, info: DIET.sindromes[code] }));
  const restr = RESTRICOES.filter((r) => state.restricoes.includes(r.key));
  const removidos = new Set(state.removidos);
  const item = (food: Alimento): SugestaoItem => ({
    food,
    removido: removidos.has(food.id),
    bloqueio: restr.find((r) => r.remove(food))?.label ?? null,
  });

  const eviteIds: string[] = [];
  for (const s of sindromes) for (const id of s.info.evite) if (!eviteIds.includes(id)) eviteIds.push(id);
  const evitar = new Set(eviteIds);

  const prefIds: string[] = [];
  const longest = Math.max(0, ...sindromes.map((s) => s.info.prefira.length));
  for (let i = 0; i < longest && prefIds.length < MAX_PREFIRA; i++) {
    for (const s of sindromes) {
      const id = s.info.prefira[i];
      const food = id ? FOOD.get(id) : undefined;
      if (!food || evitar.has(id) || prefIds.includes(id) || prefIds.length >= MAX_PREFIRA) continue;
      if (conflitaNatureza(food, sindromes.map((x) => x.info))) continue;
      prefIds.push(id);
    }
  }

  const known = (id: string) => FOOD.get(id);
  const prefira = prefIds.map(known).filter((a): a is Alimento => !!a).map(item);
  const extras = state.extras.filter((id) => !prefIds.includes(id)).map(known).filter((a): a is Alimento => !!a)
    .map((food) => ({ ...item(food), removido: false }));
  const evite = eviteIds.map(known).filter((a): a is Alimento => !!a).map(item).map((i) => ({ ...i, bloqueio: null }));

  const nome = topElement(elementScores);
  return {
    elemento: nome ? { nome, info: DIET.elementos[nome] } : null,
    sindromes,
    prefira,
    extras,
    evite,
    preparos: [...new Set(sindromes.map((s) => s.info.preparo).filter(Boolean))],
    notas: restr.map((r) => r.nota).filter((n): n is string => !!n),
  };
}

// Itens que de fato vão para o paciente.
export const ativos = (list: SugestaoItem[]) => list.filter((i) => !i.removido && !i.bloqueio).map((i) => i.food);

// Agrupa alimentos pelo grupo, na ordem da tabela.
export function porGrupo(foods: Alimento[]): { grupo: string; foods: Alimento[] }[] {
  return FOOD_GROUPS.map((grupo) => ({ grupo, foods: foods.filter((f) => f.grupo === grupo) })).filter((g) => g.foods.length);
}
