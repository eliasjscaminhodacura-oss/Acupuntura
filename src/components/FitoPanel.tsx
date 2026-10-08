'use client';

import { useMemo, useState } from 'react';
import type { FichaData } from '@/lib/ficha-types';
import { CONDICOES, FITO, FORMULA, AUTO_SINDROMES, escolhidas as escolhidasDe, sindromesUsadas, sugerir, type FitoState } from '@/lib/fitoterapia';
import { FormulaCard } from './FitoAtlas';

type Props = {
  data: FichaData;
  ranked: string[]; // síndromes da ficha, da mais forte para a mais fraca
  state: FitoState;
  onChange: (next: FitoState) => void;
  notSaved: boolean; // banco ainda sem a coluna fichas.fitoterapia
};

// Fitoterapia Chinesa na ficha: fórmulas sugeridas pelas síndromes, com
// alertas conforme as condições do paciente. O terapeuta decide.
export default function FitoPanel({ data, ranked, state, onChange, notSaved }: Props) {
  const [aberta, setAberta] = useState<string | null>(null);
  const sindromes = sindromesUsadas(state, ranked);
  const sug = useMemo(() => sugerir(sindromes, state.condicoes), [sindromes.join(), state.condicoes.join()]);
  const marcadas = escolhidasDe(state, sug);
  const nome = (c: string) => data.syndromes[c]?.name ?? c;
  if (!ranked.length) return null;

  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleSind = (c: string) => onChange({ ...state, sindromes: ranked.filter((r) => toggle(sindromes, c).includes(r)) });
  const toggleFormula = (id: string) => onChange({ ...state, escolhidas: toggle(marcadas, id) });

  return (
    <div className="panel fito">
      <h3 style={{ marginTop: 0 }}>Fitoterapia Chinesa — fórmulas sugeridas</h3>
      <p className="diet-help">
        Fórmulas clássicas indicadas para as síndromes da anamnese. Marque as que vai usar
        {state.escolhidas === null ? ' (vieram marcadas as principais sem alerta)' : ''}. Doses e preparo são decisão do terapeuta.
        Para estudar fórmulas e ervas, abra a <a href="/fitoterapia" target="_blank" rel="noreferrer">aba Fitoterapia Chinesa</a>.
      </p>
      {notSaved && <p className="error">Estas escolhas ainda não ficam salvas: falta criar a coluna “fitoterapia” no banco (Supabase).</p>}

      <h4>Síndromes consideradas</h4>
      <div className="diet-row">
        {ranked.map((c) => (
          <button key={c} type="button" className={'diet-toggle' + (sindromes.includes(c) ? ' on' : '')} aria-pressed={sindromes.includes(c)} onClick={() => toggleSind(c)}>{nome(c)}</button>
        ))}
        {state.sindromes !== null && (
          <button type="button" className="secondary small" onClick={() => onChange({ ...state, sindromes: null })}>Automático ({AUTO_SINDROMES} mais fortes)</button>
        )}
      </div>

      <h4>Condições do paciente</h4>
      <div className="diet-row">
        {CONDICOES.map((c) => (
          <button key={c.key} type="button" className={'diet-toggle' + (state.condicoes.includes(c.key) ? ' on' : '')} aria-pressed={state.condicoes.includes(c.key)}
            onClick={() => onChange({ ...state, condicoes: toggle(state.condicoes, c.key) })}>{c.label}</button>
        ))}
      </div>

      <h4>Fórmulas ({marcadas.length} escolhidas)</h4>
      {sug.length === 0 && <p className="diet-help">Nenhuma fórmula para as síndromes escolhidas.</p>}
      <div className="fito-list">
        {sug.map((s) => {
          const on = marcadas.includes(s.formula.id);
          return (
            <div key={s.formula.id} className={'fito-item' + (on ? ' on' : '')}>
              <label className="diet-recipe-head">
                <input type="checkbox" checked={on} onChange={() => toggleFormula(s.formula.id)} />
                <span>
                  <strong>{s.formula.pinyin}</strong>{s.principal ? ' ★' : ''}
                  <span className="diet-recipe-meta">{s.formula.nome} — para: {s.sindromes.map(nome).join(', ')}</span>
                  {s.toxica && <span className="fito-flag">contém erva tóxica/preparada</span>}
                  {s.avisos.map((a) => <span key={a} className="fito-flag alerta">⚠ {a}</span>)}
                </span>
              </label>
              <button type="button" className="link-button" onClick={() => setAberta(aberta === s.formula.id ? null : s.formula.id)}>
                {aberta === s.formula.id ? 'fechar' : 'ver fórmula'}
              </button>
              {aberta === s.formula.id && <FormulaCard f={s.formula} />}
            </div>
          );
        })}
      </div>
      <p className="ear-fontes">★ = fórmula principal da síndrome.</p>
      {marcadas.filter((id) => !sug.some((s) => s.formula.id === id)).map((id) => (
        <p key={id} className="diet-help">Também escolhida: {FORMULA.get(id)?.pinyin}</p>
      ))}
      {state.escolhidas !== null && (
        <button type="button" className="secondary small" onClick={() => onChange({ ...state, escolhidas: null })}>Voltar à sugestão automática</button>
      )}

      <label htmlFor="fito-obs" style={{ marginTop: 12 }}>Observações (forma, dose, duração, produto…)</label>
      <textarea id="fito-obs" rows={2} value={state.observacao} onChange={(e) => onChange({ ...state, observacao: e.target.value })} />

      <p className="diet-legal">{FITO.aviso}</p>
    </div>
  );
}
