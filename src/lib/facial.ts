import raw from '@/data/facial.json';

// Análise facial segundo a MTC: tipos constitucionais dos 5 Elementos,
// mapas do rosto, cores da tez e sinais observados (src/data/facial.json).
// Na ficha, o terapeuta marca os sinais; aqui se calcula o Elemento em
// destaque e as síndromes que esses sinais reforçam.

export type Elemento = 'Madeira' | 'Fogo' | 'Terra' | 'Metal' | 'Água';
export const ELEMENTOS: Elemento[] = ['Madeira', 'Fogo', 'Terra', 'Metal', 'Água'];

export type TipoFacial = {
  titulo: string;
  resumo: string;
  rosto: string[];
  corpo: string[];
  temperamento: string[];
  estacao: string;
  tendencias: string;
  sindromes: string[];
};
export type Zona = { id: string; nome: string; orgao: string; elemento: Elemento | null; sinais: string };
export type Mapa = { id: string; nome: string; descricao: string; zonas: Zona[] };
export type Cor = { id: string; nome: string; amostra: string; elemento: Elemento; orgao: string; significado: string };
export type Observacao = { id: string; label: string; elemento: Elemento | null; sindromes: string[] };
export type GrupoObs = { grupo: string; unico?: boolean; nota?: string; itens: Observacao[] };

type FacialData = {
  aviso: string;
  fontes: string[];
  tipos: Record<Elemento, TipoFacial>;
  mapas: Mapa[];
  cores: Cor[];
  brilho: string;
  observacoes: GrupoObs[];
};

export const FACIAL = raw as unknown as FacialData;
export const OBS = new Map(FACIAL.observacoes.flatMap((g) => g.itens.map((i) => [i.id, i] as const)));
const GRUPO_DE = new Map(FACIAL.observacoes.flatMap((g) => g.itens.map((i) => [i.id, g] as const)));

// Escolhas do terapeuta, salvas junto com a ficha (coluna fichas.facial).
export type FacialState = { marcados: string[]; observacao: string };
export const EMPTY_FACIAL: FacialState = { marcados: [], observacao: '' };

export function normalizeFacial(v: unknown): FacialState {
  const d = (v && typeof v === 'object' ? v : {}) as Partial<FacialState>;
  return {
    marcados: Array.isArray(d.marcados) ? d.marcados.filter((x): x is string => typeof x === 'string' && OBS.has(x)) : [],
    observacao: typeof d.observacao === 'string' ? d.observacao : '',
  };
}

// Marca/desmarca; nos grupos de escolha única (formato do rosto), troca.
export function toggleObs(state: FacialState, id: string): FacialState {
  if (state.marcados.includes(id)) return { ...state, marcados: state.marcados.filter((x) => x !== id) };
  const g = GRUPO_DE.get(id);
  const fora = g?.unico ? new Set(g.itens.map((i) => i.id)) : new Set<string>();
  return { ...state, marcados: [...state.marcados.filter((x) => !fora.has(x)), id] };
}

export type AnaliseFacial = {
  constituicao: Elemento | null; // pelo formato do rosto
  elementos: Record<Elemento, number>; // sinais (sem a constituição)
  destaque: Elemento | null; // elemento com mais sinais
  sindromes: { code: string; n: number; motivos: string[] }[];
};

export function analisar(state: FacialState): AnaliseFacial {
  const elementos = Object.fromEntries(ELEMENTOS.map((e) => [e, 0])) as Record<Elemento, number>;
  let constituicao: Elemento | null = null;
  const acc = new Map<string, { code: string; n: number; motivos: string[] }>();
  for (const id of state.marcados) {
    const o = OBS.get(id);
    if (!o) continue;
    if (GRUPO_DE.get(id)?.unico) {
      constituicao = o.elemento;
      continue;
    }
    if (o.elemento) elementos[o.elemento]++;
    for (const code of o.sindromes) {
      const s = acc.get(code) ?? { code, n: 0, motivos: [] };
      s.n++;
      s.motivos.push(o.label);
      acc.set(code, s);
    }
  }
  const max = Math.max(...Object.values(elementos));
  const empatados = max > 0 ? ELEMENTOS.filter((e) => elementos[e] === max) : [];
  const destaque = empatados.length === 1 ? empatados[0] : null; // empate: nenhum em destaque
  const sindromes = [...acc.values()].sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));
  return { constituicao, elementos, destaque, sindromes };
}
