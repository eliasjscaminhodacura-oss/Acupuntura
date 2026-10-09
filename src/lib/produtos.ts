import raw from '@/data/produtos-brasil.json';
import { ERVA, FITO, FORMULA, type Alerta } from '@/lib/fitoterapia';

// Fórmulas chinesas vendidas no Brasil (src/data/produtos-brasil.json, gerado
// por scripts/produtos-brasil.mjs a partir dos catálogos das lojas), ligadas
// às fórmulas do app: "mesma" (mesmo nome) ou "parecida" (ervas em comum).

export type Produto = {
  id: string;
  loja: string;
  nome: string;
  chines: string;
  nomePt?: string;
  forma: string;
  apresentacao: string;
  url: string;
  ervas: string[];
  formula?: string;
  relacao?: 'mesma' | 'parecida';
};
type Extra = { pinyin: string; nome: string; alertas: Alerta[]; aviso: string };
type Dados = {
  atualizado: string;
  aviso: string;
  lojas: Record<string, { nome: string; site: string; tipo: string; nota: string }>;
  extras: Record<string, Extra>;
  produtos: Produto[];
};

export const PROD = raw as unknown as Dados;
export const LOJAS = PROD.lojas;

// Nome da erva para mostrar: as do app com o nome popular; as outras só pinyin.
export const nomeErvaProduto = (id: string) => {
  const e = ERVA[id];
  if (e) return `${e.pinyin} (${e.nome.replace(/\s*\(.*\)/, '').toLowerCase()})`;
  const x = PROD.extras[id];
  return x ? (x.nome ? `${x.pinyin} (${x.nome.toLowerCase()})` : x.pinyin) : id;
};

export function alertasDoProduto(p: Produto): Set<Alerta> {
  const s = new Set<Alerta>();
  for (const e of p.ervas) for (const a of ERVA[e]?.alertas ?? PROD.extras[e]?.alertas ?? []) s.add(a);
  return s;
}

// Avisos próprios das ervas que não estão no app (ex.: espécie protegida).
export const avisosDoProduto = (p: Produto) =>
  p.ervas.filter((e) => PROD.extras[e]?.aviso).map((e) => `${PROD.extras[e].pinyin}: ${PROD.extras[e].aviso}`);

// Diferença entre o produto e a fórmula do app.
export function comparar(p: Produto) {
  const f = p.formula ? FORMULA.get(p.formula) : undefined;
  if (!f) return null;
  const comuns = p.ervas.filter((e) => f.ervas.includes(e));
  return {
    formula: f,
    comuns,
    faltam: f.ervas.filter((e) => !p.ervas.includes(e)),
    aMais: p.ervas.filter((e) => !f.ervas.includes(e)),
  };
}

// Produtos de cada fórmula do app (iguais primeiro).
const porFormula = new Map<string, Produto[]>();
for (const p of PROD.produtos) {
  if (!p.formula) continue;
  porFormula.set(p.formula, [...(porFormula.get(p.formula) ?? []), p]);
}
for (const l of porFormula.values()) l.sort((a, b) => Number(b.relacao === 'mesma') - Number(a.relacao === 'mesma') || a.loja.localeCompare(b.loja));
export const produtosDaFormula = (id: string) => porFormula.get(id) ?? [];

export const textoAlerta = (a: Alerta) => FITO.alertas[a];
