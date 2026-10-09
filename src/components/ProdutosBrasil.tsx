'use client';

import { useMemo, useState } from 'react';
import {
  LOJAS, PROD, alertasDoProduto, avisosDoProduto, comparar, nomeErvaProduto, produtosDaFormula, textoAlerta, type Produto,
} from '@/lib/produtos';

// Fórmulas chinesas à venda no Brasil: lista da aba Fitoterapia e a linha
// "Onde encontrar" de cada fórmula do app.

// Sem acentos e sem espaços: 'dihuang' acha 'Di Huang'.
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();
const lista = (ids: string[]) => ids.map(nomeErvaProduto).join(', ');

// Linha curta: "No Brasil: Taimin — Xiaoyao Wan (pílulas) · TaoZen — …".
export function OndeEncontrar({ formulaId }: { formulaId: string }) {
  const ps = produtosDaFormula(formulaId);
  if (!ps.length) return <p className="ear-fontes">Não encontrada nas lojas consultadas (Taimin, TaoZen).</p>;
  return (
    <p className="prod-onde">
      <strong>No Brasil:</strong>{' '}
      {ps.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ' · '}
          <a href={p.url} target="_blank" rel="noreferrer">{LOJAS[p.loja].nome} — {p.nome}</a>
          {' '}({p.forma}{p.relacao === 'parecida' ? ', parecida' : ''})
        </span>
      ))}
    </p>
  );
}

export function ProdutoCard({ p, onFormula }: { p: Produto; onFormula?: (id: string) => void }) {
  const c = comparar(p);
  const al = [...alertasDoProduto(p)].filter((a) => a !== 'mineral');
  const avisos = avisosDoProduto(p);
  return (
    <div className="fito-card">
      <div className="fito-card-head">
        <strong>{p.nome}</strong>{p.chines && <span className="prod-cn"> {p.chines}</span>}
        <span className="diet-element-meta">
          {LOJAS[p.loja].nome} · {p.forma}{p.apresentacao ? ` · ${p.apresentacao}` : ''}{p.nomePt ? ` · ${p.nomePt}` : ''}
        </span>
      </div>
      {c && (
        <p className={'prod-rel ' + p.relacao}>
          {p.relacao === 'mesma' ? 'Mesma fórmula do app: ' : 'Parecida com a fórmula do app: '}
          {onFormula
            ? <button type="button" className="link-button" onClick={() => onFormula(c.formula.id)}>{c.formula.pinyin}</button>
            : <strong>{c.formula.pinyin}</strong>}
          {' '}— {c.comuns.length} de {c.formula.ervas.length} ervas em comum.
        </p>
      )}
      {c && c.faltam.length > 0 && <p className="ear-fontes">Não aparecem no produto: {lista(c.faltam)}.</p>}
      {c && c.aMais.length > 0 && <p className="ear-fontes">A mais no produto: {lista(c.aMais)}.</p>}
      <p><strong>Composição informada pela loja:</strong> {lista(p.ervas)}.</p>
      {(al.length > 0 || avisos.length > 0) && (
        <div className="ear-caution">
          {al.length > 0 && <p style={{ margin: 0 }}><strong>⚠ Cuidados:</strong> {al.map(textoAlerta).join('; ')}.</p>}
          {avisos.map((a) => <p key={a} style={{ margin: '4px 0 0' }}>⚠ {a}</p>)}
        </div>
      )}
      <p><a href={p.url} target="_blank" rel="noreferrer">Ver na loja ↗</a></p>
    </div>
  );
}

type Rel = 'todas' | 'mesma' | 'parecida' | 'outras';

export default function ProdutosAtlas({ onFormula }: { onFormula: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const [loja, setLoja] = useState<string | null>(null);
  const [rel, setRel] = useState<Rel>('todas');
  const t = sem(busca.trim());

  const itens = useMemo(() => PROD.produtos.filter((p) => {
    if (loja && p.loja !== loja) return false;
    if (rel === 'outras' ? p.relacao : rel !== 'todas' && p.relacao !== rel) return false;
    if (!t) return true;
    const f = p.formula ? comparar(p)?.formula.pinyin ?? '' : '';
    return sem(`${p.nome} ${p.nomePt ?? ''} ${f} ${lista(p.ervas)}`).includes(t);
  }), [t, loja, rel]);

  const conta = (r: Rel) => PROD.produtos.filter((p) => (!loja || p.loja === loja) && (r === 'todas' || (r === 'outras' ? !p.relacao : p.relacao === r))).length;

  return (
    <>
      <p className="diet-help" style={{ marginTop: 12 }}>
        Fórmulas à venda no Brasil, ligadas às fórmulas do app. Toque no nome da fórmula do app para vê-la; “Ver na loja” abre o site.
      </p>
      <div className="prod-lojas">
        {Object.entries(LOJAS).map(([id, l]) => (
          <p key={id}>
            <strong><a href={l.site} target="_blank" rel="noreferrer">{l.nome} ↗</a></strong> — {l.tipo}. <span className="ear-fontes">{l.nota}</span>
          </p>
        ))}
      </div>
      <input type="search" style={{ marginTop: 12 }} value={busca} onChange={(ev) => setBusca(ev.target.value)}
        placeholder="Buscar produto, fórmula ou erva (ex.: Xiao Yao, Dang Gui)…" />
      <div className="diet-row" style={{ marginTop: 10 }}>
        <span className="diet-help" style={{ margin: 0 }}>Loja:</span>
        {Object.entries(LOJAS).map(([id, l]) => (
          <button key={id} type="button" className={'diet-toggle' + (loja === id ? ' on' : '')} onClick={() => setLoja(loja === id ? null : id)}>{l.nome}</button>
        ))}
      </div>
      <div className="diet-row" style={{ marginTop: 6 }}>
        {([['todas', 'Todas'], ['mesma', 'Iguais às do app'], ['parecida', 'Parecidas'], ['outras', 'Outras fórmulas']] as [Rel, string][]).map(([k, l]) => (
          <button key={k} type="button" className={'diet-toggle' + (rel === k ? ' on' : '')} onClick={() => setRel(k)}>{l} ({conta(k)})</button>
        ))}
      </div>
      <p className="diet-help" style={{ marginTop: 10 }}>{itens.length} produtos.</p>
      {itens.map((p) => <ProdutoCard key={p.id} p={p} onFormula={onFormula} />)}
      <p className="ear-fontes" style={{ marginTop: 12 }}>{PROD.aviso} Lista conferida em {PROD.atualizado.split('-').reverse().join('/')}.</p>
    </>
  );
}
