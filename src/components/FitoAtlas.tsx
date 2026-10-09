'use client';

import { useMemo, useState } from 'react';
import appData from '@/data/app_data.json';
import type { FichaData } from '@/lib/ficha-types';
import { CATEGORIAS, ERVA, FITO, FORMULA, alertasDaFormula, nomeErva, type Formula } from '@/lib/fitoterapia';
import { PROD } from '@/lib/produtos';
import ProdutosAtlas, { OndeEncontrar } from './ProdutosBrasil';

// Consulta da Fitoterapia Chinesa: fórmulas, ervas, síndromes e fundamentos.

const data = appData as unknown as FichaData;
const nomeSind = (c: string) => data.syndromes[c]?.name ?? c;
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NATUREZAS = ['Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
type Aba = 'formulas' | 'ervas' | 'sindromes' | 'produtos' | 'fundamentos';

export function FormulaCard({ f, onErva }: { f: Formula; onErva?: (id: string) => void }) {
  const al = alertasDaFormula(f);
  return (
    <div className="fito-card">
      <div className="fito-card-head">
        <strong>{f.pinyin}</strong>
        <span className="diet-element-meta">{f.nome} · {f.categoria} · {f.origem}</span>
      </div>
      <p><strong>Ação:</strong> {f.acao}</p>
      <p><strong>Indicações:</strong> {f.indicacoes}</p>
      <p><strong>Composição:</strong>{' '}
        {f.ervas.map((e, i) => (
          <span key={e}>
            {onErva ? <button type="button" className="link-button" onClick={() => onErva(e)}>{nomeErva(e)}</button> : nomeErva(e)}
            {i < f.ervas.length - 1 ? ', ' : '.'}
          </span>
        ))}
        <span className="ear-fontes"> Doses a critério do terapeuta.</span>
      </p>
      <p><strong>Síndromes da ficha:</strong> {f.sindromes.map(nomeSind).join(', ')}.</p>
      <OndeEncontrar formulaId={f.id} />
      {(f.cuidados || al.size > 0) && (
        <p className="ear-caution">
          <strong>⚠ Cuidados:</strong> {f.cuidados}{' '}
          {[...al].filter((a) => a !== 'mineral').map((a) => FITO.alertas[a]).join('; ')}.
        </p>
      )}
    </div>
  );
}

export default function FitoAtlas() {
  const [aba, setAba] = useState<Aba>('formulas');
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [nat, setNat] = useState<string | null>(null);
  const [erva, setErva] = useState<string | null>(null);
  const [sind, setSind] = useState<string | null>(null);
  const t = sem(busca.trim());

  const formulas = useMemo(() => FITO.formulas.filter((f) =>
    (!cat || f.categoria === cat) &&
    (!t || sem(`${f.pinyin} ${f.nome} ${f.acao} ${f.indicacoes} ${f.ervas.map(nomeErva).join(' ')} ${f.sindromes.map(nomeSind).join(' ')}`).includes(t))
  ), [t, cat]);
  const ervas = useMemo(() => Object.entries(ERVA).filter(([, e]) =>
    (!nat || e.natureza === nat) && (!t || sem(`${e.pinyin} ${e.nome} ${e.latim} ${e.acoes}`).includes(t))
  ).sort((a, b) => a[1].pinyin.localeCompare(b[1].pinyin)), [t, nat]);
  const sindromes = Object.keys(data.syndromes).sort((a, b) => nomeSind(a).localeCompare(nomeSind(b)));
  const e = erva ? ERVA[erva] : null;
  const verErva = (id: string) => { setAba('ervas'); setBusca(''); setNat(null); setErva(id); };
  const verFormula = (id: string) => { setAba('formulas'); setCat(null); setBusca(FORMULA.get(id)?.pinyin ?? ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="panel fito">
      <p className="ear-caution" style={{ marginTop: 0 }}><strong>⚠ </strong>{FITO.aviso}</p>
      <div className="diet-row" role="tablist">
        {([['formulas', `Fórmulas (${FITO.formulas.length})`], ['ervas', `Ervas (${Object.keys(ERVA).length})`], ['sindromes', 'Por síndrome'], ['produtos', `Onde encontrar no Brasil (${PROD.produtos.length})`], ['fundamentos', 'Fundamentos e segurança']] as [Aba, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={'diet-toggle' + (aba === k ? ' on' : '')} onClick={() => { setAba(k); setBusca(''); }}>{l}</button>
        ))}
      </div>

      {(aba === 'formulas' || aba === 'ervas') && (
        <input type="search" style={{ marginTop: 12 }} value={busca} onChange={(ev) => setBusca(ev.target.value)}
          placeholder={aba === 'formulas' ? 'Buscar fórmula, erva ou indicação (ex.: Xiao Yao, insônia, Yin do Rim)…' : 'Buscar erva (pinyin, nome popular, latim ou ação)…'} />
      )}

      {aba === 'formulas' && (
        <>
          <div className="diet-row" style={{ marginTop: 10 }}>
            {CATEGORIAS.map((c) => (
              <button key={c} type="button" className={'diet-toggle' + (cat === c ? ' on' : '')} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
            ))}
          </div>
          <p className="diet-help" style={{ marginTop: 10 }}>{formulas.length} fórmulas.</p>
          {formulas.map((f) => <FormulaCard key={f.id} f={f} onErva={verErva} />)}
        </>
      )}

      {aba === 'ervas' && (
        <>
          <div className="diet-row" style={{ marginTop: 10 }}>
            <span className="diet-help" style={{ margin: 0 }}>Natureza:</span>
            {NATUREZAS.map((n) => (
              <button key={n} type="button" className={'diet-toggle' + (nat === n ? ' on' : '')} onClick={() => setNat(nat === n ? null : n)}>{n}</button>
            ))}
          </div>
          {e && erva && (
            <div className="fito-card fito-erva-open">
              <div className="diet-food-head">
                <div className="fito-card-head">
                  <strong>{e.pinyin}</strong>
                  <span className="diet-element-meta">{e.nome} · <em>{e.latim}</em></span>
                </div>
                <button type="button" className="secondary small" onClick={() => setErva(null)} aria-label="Fechar">✕</button>
              </div>
              <p><strong>Natureza:</strong> {e.natureza.toLowerCase()} · <strong>Sabor:</strong> {e.sabor} · <strong>Meridianos:</strong> {e.meridianos}</p>
              <p><strong>Ações:</strong> {e.acoes}</p>
              {(e.cuidado || e.alertas.length > 0) && (
                <p className="ear-caution"><strong>⚠ Cuidados:</strong> {e.cuidado} {e.alertas.map((a) => FITO.alertas[a]).join('; ')}{e.alertas.length ? '.' : ''}</p>
              )}
              <p><strong>Usada em:</strong> {FITO.formulas.filter((f) => f.ervas.includes(erva)).map((f) => f.pinyin).join(', ')}.</p>
            </div>
          )}
          <p className="diet-help" style={{ marginTop: 10 }}>{ervas.length} ervas. Toque numa erva para ver os detalhes.</p>
          <div className="diet-row">
            {ervas.map(([id, x]) => (
              <button key={id} type="button" className={'diet-chip' + (erva === id ? ' pref' : '') + (x.alertas.includes('toxica') ? ' evite' : '')}
                onClick={() => setErva(id)} title={x.nome}>
                {x.pinyin}
              </button>
            ))}
          </div>
          <p className="ear-fontes" style={{ marginTop: 8 }}>Em vermelho: ervas tóxicas ou que só podem ser usadas preparadas.</p>
        </>
      )}

      {aba === 'sindromes' && (
        <>
          <div className="diet-row" style={{ marginTop: 12 }}>
            {sindromes.map((c) => (
              <button key={c} type="button" className={'diet-toggle' + (sind === c ? ' on' : '')} onClick={() => setSind(sind === c ? null : c)}>{nomeSind(c)}</button>
            ))}
          </div>
          {sind ? (
            <>
              <h3 className="fito-h">{nomeSind(sind)}</h3>
              {FITO.formulas.filter((f) => f.sindromes.includes(sind))
                .sort((a, b) => a.sindromes.indexOf(sind) - b.sindromes.indexOf(sind))
                .map((f) => <FormulaCard key={f.id} f={f} onErva={verErva} />)}
            </>
          ) : <p className="diet-help" style={{ marginTop: 12 }}>Escolha uma síndrome para ver as fórmulas indicadas.</p>}
        </>
      )}

      {aba === 'produtos' && <ProdutosAtlas onFormula={verFormula} />}

      {aba === 'fundamentos' && FITO.fundamentos.map((b) => (
        <section key={b.titulo}>
          <h3 className="fito-h">{b.titulo}</h3>
          <ul className="anal-list">{b.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      ))}

      <details className="ear-refs">
        <summary>Referências</summary>
        <ul>{FITO.fontes.map((f) => <li key={f}>{f}</li>)}</ul>
      </details>
    </div>
  );
}

