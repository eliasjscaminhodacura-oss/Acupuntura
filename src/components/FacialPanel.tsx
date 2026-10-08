'use client';

import type { FichaData } from '@/lib/ficha-types';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import { ELEMENTOS, FACIAL, analisar, toggleObs, type FacialState } from '@/lib/facial';
import FaceIllustration from './FaceIllustration';

type Props = {
  data: FichaData;
  ranked: string[]; // síndromes da ficha, da mais forte para a mais fraca
  topElement: string | null; // elemento em destaque na anamnese
  state: FacialState;
  onChange: (next: FacialState) => void;
  notSaved: boolean; // banco ainda sem a coluna fichas.facial
};

// Análise facial do paciente: o terapeuta marca o que observa no rosto e o
// painel mostra o Elemento em destaque e as síndromes reforçadas, comparando
// com o resultado da anamnese.
export default function FacialPanel({ data, ranked, topElement, state, onChange, notSaved }: Props) {
  const a = analisar(state);
  const naFicha = new Set(ranked);
  const confirmadas = a.sindromes.filter((s) => naFicha.has(s.code));
  const outras = a.sindromes.filter((s) => !naFicha.has(s.code));
  const marcados = new Set(state.marcados);
  const nome = (c: string) => data.syndromes[c]?.name ?? c;
  const total = Object.values(a.elementos).reduce((x, y) => x + y, 0);

  return (
    <div className="panel facial">
      <h3 style={{ marginTop: 0 }}>Análise facial segundo a MTC</h3>
      <p className="diet-help">
        Marque o que você observa no rosto do paciente. O resultado aparece embaixo e é comparado com a anamnese.
        Para ver os tipos e os mapas, abra a <a href="/analise-facial" target="_blank" rel="noreferrer">aba Análise Facial</a>.
      </p>
      {notSaved && (
        <p className="error">Estas marcações ainda não ficam salvas: falta criar a coluna “facial” no banco (Supabase).</p>
      )}

      {FACIAL.observacoes.map((g) => (
        <div key={g.grupo}>
          <h4>{g.grupo}</h4>
          {g.nota && <p className="diet-help">{g.nota}</p>}
          {g.unico ? (
            <div className="facial-gallery small">
              {g.itens.map((o) => (
                <button key={o.id} type="button" className={'facial-thumb' + (marcados.has(o.id) ? ' on' : '')}
                  style={{ borderColor: o.elemento ? ELEMENT_COLOR[o.elemento] : undefined }}
                  aria-pressed={marcados.has(o.id)} onClick={() => onChange(toggleObs(state, o.id))}>
                  {o.elemento && <FaceIllustration tipo={o.elemento} />}
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="diet-row">
              {g.itens.map((o) => (
                <button key={o.id} type="button" className={'diet-toggle' + (marcados.has(o.id) ? ' on' : '')}
                  aria-pressed={marcados.has(o.id)} onClick={() => onChange(toggleObs(state, o.id))}>
                  {o.elemento && <span className="diet-dot" style={{ background: ELEMENT_COLOR[o.elemento] }} />}
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <label htmlFor="facial-obs" style={{ marginTop: 12 }}>Outras observações do rosto</label>
      <textarea id="facial-obs" rows={2} value={state.observacao}
        onChange={(e) => onChange({ ...state, observacao: e.target.value })} />

      {(a.constituicao || total > 0) && (
        <div className="facial-result">
          <h4>Resultado da análise facial</h4>
          {a.constituicao && (
            <p>
              <strong>Constituição (formato do rosto):</strong>{' '}
              <span style={{ color: ELEMENT_COLOR[a.constituicao] }}>{a.constituicao}</span>
              {topElement && (topElement === a.constituicao
                ? ' — igual ao Elemento em destaque na anamnese.'
                : ` — a anamnese destaca ${topElement}.`)}
            </p>
          )}
          {total > 0 && (
            <>
              <div className="facial-bars">
                {ELEMENTOS.map((e) => (
                  <div key={e} className="facial-bar">
                    <span>{e}</span>
                    <div><i style={{ width: `${(a.elementos[e] / total) * 100}%`, background: ELEMENT_COLOR[e] }} /></div>
                    <span>{a.elementos[e]}</span>
                  </div>
                ))}
              </div>
              {!a.destaque && (
                <p>
                  <strong>Sinais divididos entre:</strong>{' '}
                  {ELEMENTOS.filter((e) => a.elementos[e] === Math.max(...Object.values(a.elementos))).join(', ')} (nenhum Elemento se destaca).
                </p>
              )}
              {a.destaque && (
                <p>
                  <strong>Elemento com mais sinais no rosto:</strong>{' '}
                  <span style={{ color: ELEMENT_COLOR[a.destaque] }}>{a.destaque}</span>
                  {topElement && (topElement === a.destaque ? ' — confirma a anamnese.' : ` — a anamnese destaca ${topElement}.`)}
                </p>
              )}
              {confirmadas.length > 0 && (
                <p><strong>Síndromes da anamnese confirmadas pelo rosto:</strong> {confirmadas.map((s) => `${nome(s.code)} (${s.motivos.join(', ').toLowerCase()})`).join('; ')}.</p>
              )}
              {outras.length > 0 && (
                <p className="diet-help" style={{ margin: '6px 0 0' }}>
                  <strong>Outras síndromes sugeridas pelo rosto (conferir):</strong> {outras.map((s) => nome(s.code)).join(', ')}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <p className="diet-legal">{FACIAL.aviso}</p>
    </div>
  );
}
