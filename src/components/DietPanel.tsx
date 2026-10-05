'use client';

import { useMemo, useState } from 'react';
import type { FichaData } from '@/lib/ficha-types';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import {
  DIET,
  RESTRICOES,
  buildDiet,
  chosenSyndromes,
  porGrupo,
  type DietState,
  type SugestaoItem,
} from '@/lib/dietetica';
import { buildDietPdfBlob } from '@/lib/pdf-dieta';
import { downloadBlob, fileSlug, shareOrDownload } from '@/lib/download';
import { loadLogoDataUrl } from './Logo';

type Props = {
  data: FichaData;
  ranked: string[]; // síndromes da ficha, da mais forte para a mais fraca
  elementScores: Record<string, number>;
  patientName: string;
  diet: DietState;
  onChange: (next: DietState) => void;
  notSaved: boolean; // banco ainda sem a coluna "diet"
};

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

// "Orientação alimentar segundo a MTC": vem preenchida pelas síndromes da
// ficha; o terapeuta ajusta e gera/envia o PDF do paciente.
export default function DietPanel({ data, ranked, elementScores, patientName, diet, onChange, notSaved }: Props) {
  const result = useMemo(() => buildDiet(diet, ranked, elementScores), [diet, ranked, elementScores]);
  const chosen = useMemo(() => chosenSyndromes(diet, ranked), [diet, ranked]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addText, setAddText] = useState('');

  const options = ranked.filter((c) => DIET.sindromes[c]);
  if (!options.length) {
    return (
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Orientação alimentar segundo a MTC</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Marque os sintomas acima para ver a orientação alimentar.</p>
      </div>
    );
  }

  const set = (patch: Partial<DietState>) => onChange({ ...diet, ...patch });
  const toggleSyndrome = (code: string) => set({ sindromes: toggleIn(chosen, code) });
  const toggleFood = (id: string) => set({ removidos: toggleIn(diet.removidos, id) });
  const toggleRecipe = (id: string) =>
    set({ receitas: toggleIn(result.receitas.filter((r) => r.escolhida).map((r) => r.receita.id), id) });

  const addFood = (text: string) => {
    const food = DIET.alimentos.find((a) => a.nome.toLowerCase() === text.trim().toLowerCase());
    if (!food) return;
    onChange({ ...diet, extras: diet.extras.includes(food.id) ? diet.extras : [...diet.extras, food.id], removidos: diet.removidos.filter((x) => x !== food.id) });
    setAddText('');
  };

  async function makePdf() {
    const logo = await loadLogoDataUrl(240); // menor: PDF leve para o WhatsApp
    return buildDietPdfBlob({ patientName, diet: result, observacao: diet.observacao, logoDataUrl: logo });
  }
  const filename = `orientacao-alimentar-${fileSlug(patientName) || 'paciente'}.pdf`;

  async function handlePdf() {
    setBusy(true);
    setMsg(null);
    try {
      downloadBlob(await makePdf(), filename);
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await shareOrDownload(await makePdf(), filename, `Olá, ${patientName.split(' ')[0]}! Segue a sua orientação alimentar segundo a MTC.`);
      if (r === 'downloaded') {
        setMsg('Neste aparelho não há o menu "Compartilhar", então o PDF foi baixado. Para enviar pelo WhatsApp Web, abra a conversa do paciente e arraste o arquivo para ela.');
      }
    } finally {
      setBusy(false);
    }
  }

  const chip = (i: SugestaoItem, kind: 'pref' | 'evite' | 'extra') => {
    const off = i.removido || !!i.bloqueio;
    const title = i.bloqueio
      ? `Retirado pela restrição: ${i.bloqueio}`
      : `${i.food.natureza} · ${i.food.sabores.join(', ')}${i.food.obs ? ` · ${i.food.obs}` : ''}`;
    return (
      <button
        key={i.food.id}
        type="button"
        className={`diet-chip ${kind}${off ? ' off' : ''}`}
        title={title}
        disabled={!!i.bloqueio}
        onClick={() => (kind === 'extra' ? set({ extras: diet.extras.filter((x) => x !== i.food.id) }) : toggleFood(i.food.id))}
      >
        {i.food.nome}
        {kind === 'extra' && <span aria-hidden> ×</span>}
      </button>
    );
  };

  const grouped = (items: SugestaoItem[], kind: 'pref' | 'evite' | 'extra') =>
    porGrupo(items.map((i) => i.food)).map((g) => (
      <div key={g.grupo} className="diet-group">
        <span className="diet-group-name">{g.grupo}</span>
        {g.foods.map((f) => chip(items.find((i) => i.food.id === f.id)!, kind))}
      </div>
    ));

  const el = result.elemento;

  return (
    <div className="panel diet">
      <h3 style={{ marginTop: 0 }}>Orientação alimentar segundo a MTC</h3>
      <p className="diet-help">
        Sugestões a partir das síndromes identificadas. Ajuste antes de enviar: toque num alimento para tirá-lo ou devolvê-lo.
      </p>
      {notSaved && (
        <div className="notice panel" style={{ marginBottom: 12 }}>
          As escolhas abaixo ainda não ficam salvas: falta atualizar o banco de dados (peça ao Claude). O PDF funciona normalmente.
        </div>
      )}

      {el && (
        <div className="diet-element" style={{ borderColor: ELEMENT_COLOR[el.nome] }}>
          <strong style={{ color: ELEMENT_COLOR[el.nome] }}>Elemento em destaque: {el.nome}</strong>
          <span className="diet-element-meta">
            {el.info.orgaos} · sabor {el.info.sabor.toLowerCase()} · cor {el.info.cor.toLowerCase()} · {el.info.estacao.toLowerCase()}
          </span>
          <p>{el.info.orientacao}</p>
        </div>
      )}

      <h4>Síndromes consideradas</h4>
      <div className="diet-row">
        {options.map((code) => (
          <button
            key={code}
            type="button"
            className={'diet-toggle' + (chosen.includes(code) ? ' on' : '')}
            aria-pressed={chosen.includes(code)}
            onClick={() => toggleSyndrome(code)}
            title={DIET.sindromes[code].principio}
          >
            {data.syndromes[code]?.name ?? code}
          </button>
        ))}
        {diet.sindromes && (
          <button type="button" className="secondary small" onClick={() => set({ sindromes: null })}>
            Voltar ao automático
          </button>
        )}
      </div>
      {result.sindromes.map((s) => (
        <p key={s.code} className="diet-principle">
          <strong>{data.syndromes[s.code]?.name}:</strong> {s.info.principio}
        </p>
      ))}

      <h4>Restrições do paciente</h4>
      <div className="diet-row">
        {RESTRICOES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={'diet-toggle' + (diet.restricoes.includes(r.key) ? ' on' : '')}
            aria-pressed={diet.restricoes.includes(r.key)}
            onClick={() => set({ restricoes: toggleIn(diet.restricoes, r.key) })}
          >
            {r.label}
          </button>
        ))}
      </div>

      {result.sindromes.length > 0 && (
        <>
          <h4 className="diet-pref-title">Prefira</h4>
          {grouped(result.prefira, 'pref')}
          {result.extras.length > 0 && grouped(result.extras, 'extra')}
          <div className="diet-add">
            <input
              list="diet-foods"
              placeholder="Acrescentar alimento…"
              value={addText}
              onChange={(e) => {
                setAddText(e.target.value);
                if (DIET.alimentos.some((a) => a.nome === e.target.value)) addFood(e.target.value);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') addFood(addText); }}
            />
            <datalist id="diet-foods">
              {DIET.alimentos.filter((a) => a.grupo !== 'Outros').map((a) => <option key={a.id} value={a.nome} />)}
            </datalist>
          </div>

          <h4 className="diet-evite-title">Evite</h4>
          <div className="diet-row">{result.evite.map((i) => chip(i, 'evite'))}</div>

          <h4>Receitas</h4>
          <p className="diet-help">Marque as receitas que vão para o PDF do paciente.</p>
          {result.receitas.length === 0 && (
            <p className="diet-help">Nenhuma receita compatível com estas síndromes e restrições.</p>
          )}
          <div className="diet-recipes">
            {result.receitas.map(({ receita, ingredientes, escolhida }) => (
              <div key={receita.id} className={'diet-recipe' + (escolhida ? ' on' : '')}>
                <label className="diet-recipe-head">
                  <input type="checkbox" checked={escolhida} onChange={() => toggleRecipe(receita.id)} />
                  <span>
                    <strong>{receita.nome}</strong>
                    <span className="diet-recipe-meta">{receita.tipo} · {receita.tempo} · rende {receita.rende}</span>
                  </span>
                </label>
                <details>
                  <summary>Ver receita</summary>
                  <div className="diet-recipe-body">
                    <strong>Ingredientes</strong>
                    <ul>{ingredientes.map((i) => <li key={i.texto}>{i.texto}{i.opcional ? ' (opcional)' : ''}</li>)}</ul>
                    <strong>Modo de preparo</strong>
                    <ol>{receita.preparo.map((p) => <li key={p}>{p}</li>)}</ol>
                    <p><em>Por que ajuda:</em> {receita.porque}</p>
                  </div>
                </details>
              </div>
            ))}
          </div>
          {diet.receitas && (
            <button type="button" className="secondary small" style={{ marginTop: 8 }} onClick={() => set({ receitas: null })}>
              Voltar às receitas automáticas
            </button>
          )}

          <h4>Dicas de preparo</h4>
          <ul className="diet-list">{result.preparos.map((p) => <li key={p}>{p}</li>)}</ul>

          {result.notas.length > 0 && (
            <ul className="diet-list diet-notes">{result.notas.map((n) => <li key={n}>{n}</li>)}</ul>
          )}
        </>
      )}

      <label htmlFor="diet-obs" style={{ marginTop: 12 }}>Recado para o paciente (opcional)</label>
      <textarea
        id="diet-obs"
        rows={2}
        value={diet.observacao}
        onChange={(e) => set({ observacao: e.target.value })}
        placeholder="Ex.: comece pelo congee no café da manhã, 3 vezes por semana."
      />

      <div className="diet-actions">
        <button type="button" className="secondary" onClick={handlePdf} disabled={busy || !result.sindromes.length}>
          Gerar PDF do paciente
        </button>
        <button type="button" onClick={handleSend} disabled={busy || !result.sindromes.length}>
          Enviar para o paciente
        </button>
      </div>
      {msg && <p className="diet-help" style={{ marginTop: 8 }}>{msg}</p>}
      <p className="diet-legal">{DIET.aviso}</p>
    </div>
  );
}
