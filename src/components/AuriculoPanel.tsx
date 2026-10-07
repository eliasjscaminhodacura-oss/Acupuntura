'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Ear2D from './Ear2D';
import type { Answers, FichaData } from '@/lib/ficha-types';
import { PONTOS, REGIAO } from '@/lib/auriculo';
import {
  AUTO_PONTOS,
  AUTO_SINDROMES,
  LADO_LABEL,
  PONTO,
  SUGESTOES,
  pontosEscolhidos,
  sindromesUsadas,
  sugerir,
  type AuriculoState,
  type LadoSessao,
} from '@/lib/auriculo-sugestao';

type Props = {
  data: FichaData;
  ranked: string[]; // síndromes da ficha, da mais forte para a mais fraca
  answers: Answers;
  state: AuriculoState;
  onChange: (next: AuriculoState) => void;
  notSaved: boolean; // banco ainda sem a coluna fichas.auriculo
};

// Pontos de auriculoterapia sugeridos pelo resultado da ficha. Vem
// preenchido pelas síndromes e sintomas; o terapeuta marca/desmarca,
// acrescenta pontos e escolhe a orelha.
export default function AuriculoPanel({ data, ranked, answers, state, onChange, notSaved }: Props) {
  const [focus, setFocus] = useState<string | null>(null);
  const sindromes = sindromesUsadas(state, ranked);
  const sugeridos = useMemo(() => sugerir(data, answers, sindromes), [data, answers, sindromes.join()]);
  const escolhidos = pontosEscolhidos(state, sugeridos);
  const escolhidosSet = useMemo(() => new Set(escolhidos), [escolhidos.join()]);
  const extras = escolhidos.filter((c) => !sugeridos.some((s) => s.ponto.codigo === c));
  const lado2d = state.lado === 'direita' ? 'direita' : 'esquerda';

  if (!ranked.length) return null;

  const toggleSindrome = (code: string) => {
    const cur = new Set(sindromes);
    if (cur.has(code)) cur.delete(code);
    else cur.add(code);
    // mantém a ordem de força das síndromes
    onChange({ ...state, sindromes: ranked.filter((c) => cur.has(c)) });
  };
  const togglePonto = (code: string) => {
    const next = escolhidosSet.has(code) ? escolhidos.filter((c) => c !== code) : [...escolhidos, code];
    onChange({ ...state, escolhidos: next });
  };
  const ponto = focus ? PONTO.get(focus) : null;

  return (
    <div className="panel auriculo">
      <h3 style={{ marginTop: 0 }}>Auriculoterapia — pontos sugeridos</h3>
      <p className="diet-help">
        Sugestão a partir das síndromes e dos sintomas marcados. Marque os pontos que vai usar
        {state.escolhidos === null ? ` (vieram marcados os ${AUTO_PONTOS} mais indicados)` : ''}.
        Toque num ponto da orelha para ver onde fica.
      </p>
      {notSaved && (
        <p className="error">
          Estas escolhas ainda não ficam salvas: falta criar a coluna “auriculo” no banco (Supabase).
        </p>
      )}

      <h4>Síndromes consideradas</h4>
      <div className="body3d-row">
        {ranked.map((code) => (
          <button key={code} type="button" className={'body3d-chip' + (sindromes.includes(code) ? ' on' : '')}
            aria-pressed={sindromes.includes(code)} onClick={() => toggleSindrome(code)}>
            {data.syndromes[code]?.name ?? code}
          </button>
        ))}
        {state.sindromes !== null && (
          <button type="button" className="body3d-chip" onClick={() => onChange({ ...state, sindromes: null })}>
            Automático ({AUTO_SINDROMES} mais fortes)
          </button>
        )}
      </div>
      {sindromes.map((code) => SUGESTOES.sindromes[code] && (
        <p key={code} className="auriculo-principio">
          <strong>{data.syndromes[code]?.name}:</strong> {SUGESTOES.sindromes[code].principio}
        </p>
      ))}

      <h4>Orelha</h4>
      <div className="body3d-row">
        {(['direita', 'esquerda', 'ambas'] as LadoSessao[]).map((l) => (
          <button key={l} type="button" className={'body3d-chip' + (state.lado === l ? ' on' : '')}
            aria-pressed={state.lado === l} onClick={() => onChange({ ...state, lado: l })}>
            {LADO_LABEL[l]}
          </button>
        ))}
      </div>

      <div className="auriculo-grid">
        <div className="ear2d auriculo-ear">
          <Ear2D face="frente" lado={lado2d} selected={focus} highlighted={escolhidosSet} onSelect={setFocus} />
          <Ear2D face="dorso" lado={lado2d} selected={focus} highlighted={escolhidosSet} onSelect={setFocus} />
        </div>
        <div>
          {ponto ? (
            <div className="ear-card" style={{ '--reg': REGIAO[ponto.regiao].cor, marginTop: 0 } as CSSProperties}>
              <div className="ear-card-head">
                <span className="ear-code">{ponto.codigo}</span>
                <div>
                  <h3>{ponto.nome}</h3>
                  <div className="ear-sub">{ponto.chines} · {REGIAO[ponto.regiao].nome}</div>
                </div>
                <button type="button" className="secondary small" onClick={() => setFocus(null)} aria-label="Fechar">✕</button>
              </div>
              <h4>Localização</h4>
              <p>{ponto.localizacao}</p>
              <h4>Indicações principais</h4>
              <p>{ponto.indicacoes}</p>
            </div>
          ) : (
            <p className="ear-help" style={{ marginTop: 0 }}>
              Pontos escolhidos acendem na cor da região. Para ver em 3D, abra a{' '}
              <a href="/auriculoterapia" target="_blank" rel="noreferrer">aba Auriculoterapia</a>.
            </p>
          )}
        </div>
      </div>

      <h4>Pontos ({escolhidos.length} escolhidos)</h4>
      <div className="auriculo-list">
        {[...sugeridos.map((s) => ({ codigo: s.ponto.codigo, motivos: s.motivos })), ...extras.map((c) => ({ codigo: c, motivos: ['acrescentado pelo terapeuta'] }))].map(({ codigo, motivos }) => {
          const p = PONTO.get(codigo)!;
          const on = escolhidosSet.has(codigo);
          return (
            <label key={codigo} className={'item-check auriculo-item' + (on ? ' checked' : '')}>
              <input type="checkbox" checked={on} onChange={() => togglePonto(codigo)} />
              <span>
                <span className="auriculo-dot" style={{ background: REGIAO[p.regiao].cor }} />
                <strong>{codigo}</strong> — {p.nome}{' '}
                <button type="button" className="link-button" onClick={(e) => { e.preventDefault(); setFocus(codigo); }}>ver</button>
                <span className="point-syn">{motivos.join(' · ')}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="auriculo-add">
        <select value="" onChange={(e) => { if (e.target.value) togglePonto(e.target.value); }} aria-label="Acrescentar outro ponto">
          <option value="">+ Acrescentar outro ponto…</option>
          {PONTOS.filter((p) => !escolhidosSet.has(p.codigo)).map((p) => (
            <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nome}</option>
          ))}
        </select>
        {state.escolhidos !== null && (
          <button type="button" className="secondary small" onClick={() => onChange({ ...state, escolhidos: null })}>
            Voltar à sugestão automática
          </button>
        )}
      </div>

      <label htmlFor="auriculo-obs" style={{ marginTop: 12 }}>Observações (material, tempo, cuidados…)</label>
      <textarea id="auriculo-obs" rows={2} value={state.observacao}
        onChange={(e) => onChange({ ...state, observacao: e.target.value })} />

      <p className="diet-legal">{SUGESTOES.aviso}</p>
    </div>
  );
}
