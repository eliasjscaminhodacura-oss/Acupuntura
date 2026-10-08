import raw from '@/data/auriculo-sugestoes.json';
import type { Answers, FichaData } from './ficha-types';
import { NORMAL_LABEL } from './ficha-logic';
import { PONTOS, type PontoAuricular } from './auriculo';

// Pontos de auriculoterapia sugeridos pelo resultado da ficha: cada
// síndrome tem os seus pontos e alguns sintomas marcados acrescentam
// pontos específicos (src/data/auriculo-sugestoes.json, revisado pelo
// terapeuta). O terapeuta escolhe o que vai usar.

type Sugestoes = {
  aviso: string;
  sindromes: Record<string, { pontos: string[]; principio: string }>;
  sintomas: { nome: string; itens: string[]; pontos: string[] }[];
  // pontos tirados da sugestão quando há o sintoma ou a síndrome (segurança)
  evitar: { pontos: string[]; sintomas: string[]; sindromes: string[]; motivo: string }[];
  // protocolos prontos dos livros, que o terapeuta acrescenta com um toque
  protocolos: { nome: string; fonte: string; principais: string[]; complementares: string[]; nota: string }[];
};

export const SUGESTOES = raw as Sugestoes;
export const PONTO = new Map(PONTOS.map((p) => [p.codigo, p]));

export type LadoSessao = 'direita' | 'esquerda' | 'ambas';

// Escolhas do terapeuta, salvas junto com a ficha (coluna fichas.auriculo).
export type AuriculoState = {
  sindromes: string[] | null; // null = automático (as 3 mais fortes)
  escolhidos: string[] | null; // null = automático (os mais indicados)
  lado: LadoSessao;
  observacao: string;
};

export const EMPTY_AURICULO: AuriculoState = { sindromes: null, escolhidos: null, lado: 'ambas', observacao: '' };

export function normalizeAuriculo(v: unknown): AuriculoState {
  const d = (v && typeof v === 'object' ? v : {}) as Partial<AuriculoState>;
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  return {
    sindromes: Array.isArray(d.sindromes) ? list(d.sindromes) : null,
    escolhidos: Array.isArray(d.escolhidos) ? list(d.escolhidos).filter((c) => PONTO.has(c)) : null,
    lado: d.lado === 'direita' || d.lado === 'esquerda' ? d.lado : 'ambas',
    observacao: typeof d.observacao === 'string' ? d.observacao : '',
  };
}

export const AUTO_SINDROMES = 3;
export const AUTO_PONTOS = 8; // número usual de pontos por sessão

export type Sugerido = { ponto: PontoAuricular; score: number; motivos: string[] };

// Sintomas marcados que acrescentam pontos (item "CAT|Subcategoria|Rótulo",
// com * valendo qualquer subcategoria/rótulo).
export function sintomasMarcados(data: FichaData, answers: Answers) {
  const marked = data.questions.filter((q) => answers[q.key] && q.label !== NORMAL_LABEL);
  return SUGESTOES.sintomas.filter((r) =>
    r.itens.some((it) => {
      const [cat, sub, label] = it.split('|');
      return marked.some((q) => q.cat === cat && (sub === '*' || q.subcat === sub) && (label === '*' || q.label === label));
    })
  );
}

// Pontos que não devem ser sugeridos para este paciente, com o motivo.
export function evitados(data: FichaData, answers: Answers, sindromes: string[]): Map<string, string> {
  const marcados = new Set(sintomasMarcados(data, answers).map((r) => r.nome));
  const out = new Map<string, string>();
  for (const r of SUGESTOES.evitar) {
    if (r.sintomas.some((n) => marcados.has(n)) || r.sindromes.some((c) => sindromes.includes(c))) {
      for (const p of r.pontos) if (!out.has(p)) out.set(p, r.motivo);
    }
  }
  return out;
}

export function sugerir(data: FichaData, answers: Answers, sindromes: string[]): Sugerido[] {
  const evitar = evitados(data, answers, sindromes);
  const acc = new Map<string, Sugerido>();
  const add = (codigo: string, score: number, motivo: string) => {
    const ponto = PONTO.get(codigo);
    if (!ponto || evitar.has(codigo)) return;
    const s = acc.get(codigo) ?? { ponto, score: 0, motivos: [] };
    s.score += score;
    if (!s.motivos.includes(motivo)) s.motivos.push(motivo);
    acc.set(codigo, s);
  };
  // síndromes: a mais forte pesa mais; os primeiros pontos de cada lista
  // são os principais
  sindromes.forEach((code, i) => {
    const s = SUGESTOES.sindromes[code];
    if (!s) return;
    const peso = Math.max(1.5, 3 - i * 0.5);
    const nome = data.syndromes[code]?.name ?? code;
    s.pontos.forEach((p, j) => add(p, peso * (j < 3 ? 1 : 0.6), nome));
  });
  for (const r of sintomasMarcados(data, answers)) {
    r.pontos.forEach((p, j) => add(p, j < 2 ? 1.2 : 0.8, r.nome));
  }
  return [...acc.values()].sort((a, b) => b.score - a.score || a.ponto.codigo.localeCompare(b.ponto.codigo));
}

export function sindromesUsadas(state: AuriculoState, ranked: string[]) {
  return state.sindromes ?? ranked.slice(0, AUTO_SINDROMES);
}

export function pontosEscolhidos(state: AuriculoState, sugeridos: Sugerido[]): string[] {
  return state.escolhidos ?? sugeridos.slice(0, AUTO_PONTOS).map((s) => s.ponto.codigo);
}

export const LADO_LABEL: Record<LadoSessao, string> = {
  direita: 'Orelha direita',
  esquerda: 'Orelha esquerda',
  ambas: 'As duas orelhas',
};
