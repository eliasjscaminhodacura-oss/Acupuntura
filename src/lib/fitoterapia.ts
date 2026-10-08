import raw from '@/data/fitoterapia.json';

// Fitoterapia Chinesa: ervas, fórmulas clássicas e a ligação síndrome →
// fórmulas (src/data/fitoterapia.json, gerado por scripts/fitoterapia-dados.mjs).
// Na ficha, sugere fórmulas pelas síndromes da anamnese e marca alertas
// conforme as condições do paciente (gestação, anticoagulante etc.).

export type Alerta = 'gest' | 'anticoag' | 'pressao' | 'toxica' | 'animal' | 'mineral';
export type Erva = {
  pinyin: string;
  nome: string;
  latim: string;
  natureza: string;
  sabor: string;
  meridianos: string;
  acoes: string;
  cuidado: string;
  alertas: Alerta[];
};
export type Formula = {
  id: string;
  pinyin: string;
  nome: string;
  origem: string;
  categoria: string;
  ervas: string[];
  acao: string;
  indicacoes: string;
  cuidados: string;
  sindromes: string[];
};
type Dados = {
  aviso: string;
  fontes: string[];
  fundamentos: { titulo: string; itens: string[] }[];
  alertas: Record<Alerta, string>;
  ervas: Record<string, Erva>;
  formulas: Formula[];
};

export const FITO = raw as unknown as Dados;
export const ERVA = FITO.ervas;
export const FORMULA = new Map(FITO.formulas.map((f) => [f.id, f]));
export const CATEGORIAS = [...new Set(FITO.formulas.map((f) => f.categoria))];

// Alertas que valem para a fórmula inteira (soma das ervas).
export function alertasDaFormula(f: Formula): Set<Alerta> {
  const s = new Set<Alerta>();
  for (const e of f.ervas) for (const a of ERVA[e]?.alertas ?? []) s.add(a);
  return s;
}

// Condições do paciente que pedem atenção, ligadas aos alertas das ervas.
export const CONDICOES: { key: string; label: string; alerta: Alerta }[] = [
  { key: 'gestante', label: 'Gestante', alerta: 'gest' },
  { key: 'anticoagulante', label: 'Usa anticoagulante', alerta: 'anticoag' },
  { key: 'hipertensao', label: 'Pressão alta', alerta: 'pressao' },
  { key: 'vegetariano', label: 'Não usa produtos animais', alerta: 'animal' },
];

export type FitoState = {
  sindromes: string[] | null; // null = automático (as 3 mais fortes)
  escolhidas: string[] | null; // null = automático (a 1ª fórmula de cada síndrome)
  condicoes: string[];
  observacao: string;
};
export const EMPTY_FITO: FitoState = { sindromes: null, escolhidas: null, condicoes: [], observacao: '' };
export const AUTO_SINDROMES = 3;

export function normalizeFito(v: unknown): FitoState {
  const d = (v && typeof v === 'object' ? v : {}) as Partial<FitoState>;
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  return {
    sindromes: Array.isArray(d.sindromes) ? list(d.sindromes) : null,
    escolhidas: Array.isArray(d.escolhidas) ? list(d.escolhidas).filter((id) => FORMULA.has(id)) : null,
    condicoes: list(d.condicoes),
    observacao: typeof d.observacao === 'string' ? d.observacao : '',
  };
}

export function sindromesUsadas(state: FitoState, ranked: string[]) {
  return state.sindromes ?? ranked.slice(0, AUTO_SINDROMES);
}

export type Sugestao = { formula: Formula; sindromes: string[]; principal: boolean; avisos: string[]; toxica: boolean };

// Fórmulas indicadas para as síndromes escolhidas (a 1ª de cada síndrome é a principal).
export function sugerir(sindromes: string[], condicoes: string[]): Sugestao[] {
  const acc = new Map<string, Sugestao>();
  const ativos = CONDICOES.filter((c) => condicoes.includes(c.key));
  for (const code of sindromes) {
    const lista = FITO.formulas.filter((f) => f.sindromes.includes(code));
    // principal: a que tem esta síndrome em 1º lugar; senão a primeira encontrada
    lista.sort((a, b) => a.sindromes.indexOf(code) - b.sindromes.indexOf(code));
    lista.forEach((f, i) => {
      const s = acc.get(f.id) ?? { formula: f, sindromes: [], principal: false, avisos: [], toxica: false };
      if (!s.sindromes.includes(code)) s.sindromes.push(code);
      if (i === 0) s.principal = true;
      acc.set(f.id, s);
    });
  }
  for (const s of acc.values()) {
    const al = alertasDaFormula(s.formula);
    s.toxica = al.has('toxica');
    s.avisos = ativos.filter((c) => al.has(c.alerta)).map((c) => FITO.alertas[c.alerta]);
  }
  return [...acc.values()].sort((a, b) => Number(b.principal) - Number(a.principal) || b.sindromes.length - a.sindromes.length);
}

export function escolhidas(state: FitoState, sugestoes: Sugestao[]): string[] {
  return state.escolhidas ?? sugestoes.filter((s) => s.principal && !s.avisos.length).map((s) => s.formula.id);
}

// Ervas da fórmula com o nome popular: "Huang Qi (astrágalo)".
export const nomeErva = (id: string) => (ERVA[id] ? `${ERVA[id].pinyin} (${ERVA[id].nome.toLowerCase()})` : id);
