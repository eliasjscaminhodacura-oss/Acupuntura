import data from '@/data/auriculo.json';
import pos3d from '@/data/auriculo-3d.json';

// Atlas de auriculoterapia: pontos da norma chinesa (GB/T 13734-2008),
// completados com os livros de referência (auriculo.json → referencias),
// com nome, localização, indicações, cuidados e fontes (auriculo.json, revisado pelo
// terapeuta) e a posição de cada um na orelha 3D e nas imagens 2D
// (auriculo-3d.json, gerado por `npm run auriculo:posicionar`).
//
// O modelo 3D é de uma orelha ESQUERDA, vista de lado (X para trás da
// cabeça, Y para cima, Z para fora). A orelha direita é o espelho (X
// trocado de sinal), nas imagens 2D e no 3D.

export type Lado = 'esquerda' | 'direita';
export type RegiaoId = 'HX' | 'SF' | 'AH' | 'TF' | 'TG' | 'AT' | 'CO' | 'LO' | 'P' | 'R';

export type Regiao = { id: RegiaoId; nome: string; descricao: string; cor: string };

type Vista2D = { uv: [number, number]; visivel: boolean };

export type PontoAuricular = {
  codigo: string;
  nome: string;
  chines: string;
  regiao: RegiaoId;
  localizacao: string;
  indicacoes: string;
  cuidado?: string; // contraindicação / atenção
  souza?: string; // nome e número do ponto no livro de Souza, quando diferente
  fontes: string[]; // ids de REFERENCIAS
  pos: [number, number, number];
  normal: [number, number, number];
  frente: Vista2D;
  dorso: Vista2D;
};

// Cores das regiões (no mapa e nos filtros).
const COR: Record<RegiaoId, string> = {
  HX: '#FF7A7A',
  SF: '#FFB15C',
  AH: '#7FE3B0',
  TF: '#7FB2FF',
  TG: '#E08CFF',
  AT: '#5CE1E6',
  CO: '#FF8CC6',
  LO: '#E6C27A',
  P: '#C9C4B5',
  R: '#A0A8B0',
};

export const REGIOES: Regiao[] = data.regioes.map((r) => ({ ...r, id: r.id as RegiaoId, cor: COR[r.id as RegiaoId] }));
export const REGIAO = Object.fromEntries(REGIOES.map((r) => [r.id, r])) as Record<RegiaoId, Regiao>;

const P3 = pos3d as unknown as Record<string, Omit<PontoAuricular, 'codigo' | 'nome' | 'chines' | 'regiao' | 'localizacao' | 'indicacoes' | 'cuidado' | 'souza' | 'fontes'>>;

export const PONTOS: PontoAuricular[] = data.pontos
  .filter((p) => P3[p.codigo])
  .map((p) => ({
    codigo: p.codigo,
    nome: p.nome,
    chines: p.chines,
    regiao: p.regiao as RegiaoId,
    localizacao: p.localizacao,
    indicacoes: p.indicacoes,
    cuidado: 'cuidado' in p ? (p.cuidado as string) : undefined,
    souza: 'souza' in p ? (p.souza as string) : undefined,
    fontes: 'fontes' in p ? (p.fontes as string[]) : ['GB/T', 'Scavone'],
    ...P3[p.codigo],
  }));

// Livros e normas usados (citados nas telas e no PDF).
export const REFERENCIAS: { id: string; texto: string }[] = data.referencias;

// Analgesia por auriculoterapia (resumo do Souza, cap. X).
export const ANALGESIA = (data as unknown as { analgesia: { titulo: string; aviso: string; secoes: { titulo: string; itens: string[] }[] } }).analgesia;

export const MODELO = {
  arquivo: data.modelo.arquivo,
  credito: data.modelo.credito,
  meio: data.modelo.meio, // meia largura (mm) do quadro das imagens 2D
  fonte: data.fonte,
};

// Busca sem diferença de acentos e maiúsculas, por nome, código,
// indicação ou nome chinês.
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function buscar(texto: string, regioes: Set<RegiaoId> | null): PontoAuricular[] {
  const t = sem(texto.trim());
  return PONTOS.filter((p) => {
    if (regioes && regioes.size && !regioes.has(p.regiao)) return false;
    if (!t) return true;
    return sem(`${p.codigo} ${p.nome} ${p.chines} ${p.indicacoes} ${p.cuidado ?? ''} ${p.souza ?? ''} ${REGIAO[p.regiao].nome}`).includes(t);
  });
}

// Posição na imagem 2D (0–100), já espelhada para a orelha direita.
export function uv2d(p: PontoAuricular, face: 'frente' | 'dorso', lado: Lado): Vista2D {
  const v = p[face];
  return lado === 'direita' ? { uv: [100 - v.uv[0], v.uv[1]], visivel: v.visivel } : v;
}
