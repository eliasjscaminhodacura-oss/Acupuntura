'use client';

import { useMemo, useState } from 'react';
import appData from '@/data/app_data.json';
import type { FichaData } from '@/lib/ficha-types';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import { DIET, FOOD, FOOD_GROUPS, type Alimento, type Receita } from '@/lib/dietetica';

// Consulta da Dietoterapia Chinesa (Orientação alimentar segundo a MTC),
// sem paciente: orientação por síndrome, alimentos, receitas e 5 Elementos.
// O mesmo conteúdo alimenta o painel da ficha (DietPanel).

const data = appData as unknown as FichaData;
const extra = DIET as unknown as { alertas: Record<string, string>; fontes: string[] };

const ORGAO: Record<string, string> = {
  F: 'Fígado', VB: 'Vesícula Biliar', C: 'Coração', ID: 'Intestino Delgado', BP: 'Baço-Pâncreas',
  E: 'Estômago', P: 'Pulmão', IG: 'Intestino Grosso', R: 'Rim', B: 'Bexiga',
};
const NATUREZAS = ['Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
type Aba = 'sindromes' | 'alimentos' | 'receitas' | 'elementos';

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Nome por extenso: "Defic. Yin do R" -> "Deficiência de Yin do Rim".
const nomeSindrome = (code: string) => {
  const n = data.syndromes[code]?.name ?? code;
  return n
    .replace(/^Defic\. /, 'Deficiência de ')
    .replace(/^BP /, 'Baço-Pâncreas ')
    .replace(/ ([A-Z]{1,2}(?:\/[A-Z]{1,2})?)$/, (_, o: string) => ' ' + o.split('/').map((x) => ORGAO[x] ?? x).join(' e '));
};
const SINDROMES = Object.keys(DIET.sindromes).sort((a, b) => nomeSindrome(a).localeCompare(nomeSindrome(b)));

function ReceitaView({ r }: { r: Receita }) {
  return (
    <div className="diet-recipe">
      <strong>{r.nome}</strong>
      <span className="diet-recipe-meta">{r.tipo} · natureza {r.natureza.toLowerCase()} · {r.tempo} · rende {r.rende}</span>
      <details>
        <summary>Ver receita</summary>
        <div className="diet-recipe-body">
          <strong>Ingredientes</strong>
          <ul>{r.ingredientes.map((i) => <li key={i.texto}>{i.texto}{i.opcional ? ' (opcional)' : ''}</li>)}</ul>
          <strong>Modo de preparo</strong>
          <ol>{r.preparo.map((p) => <li key={p}>{p}</li>)}</ol>
          <p><em>Por que ajuda:</em> {r.porque}</p>
          <p><em>Indicada para:</em> {r.indicacoes.map(nomeSindrome).join(', ')}</p>
        </div>
      </details>
    </div>
  );
}

export default function DietAtlas() {
  const [aba, setAba] = useState<Aba>('sindromes');
  const [sind, setSind] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string | null>(null);
  const [natureza, setNatureza] = useState<string | null>(null);
  const [alimento, setAlimento] = useState<string | null>(null);

  const t = sem(busca.trim());
  const sindromes = SINDROMES.filter((c) => !t || sem(`${nomeSindrome(c)} ${DIET.sindromes[c].principio}`).includes(t));
  const alimentos = useMemo(() => DIET.alimentos.filter((a) =>
    (!grupo || a.grupo === grupo) && (!natureza || a.natureza === natureza) &&
    (!t || sem(`${a.nome} ${a.grupo} ${a.elemento} ${a.obs} ${a.acoes.map((k) => DIET.acoes[k]).join(' ')}`).includes(t))
  ), [t, grupo, natureza]);
  const receitas = DIET.receitas.filter((r) => !t || sem(`${r.nome} ${r.tipo} ${r.porque} ${r.ingredientes.map((i) => i.texto).join(' ')}`).includes(t));

  const trocarAba = (a: Aba) => { setAba(a); setBusca(''); };
  const nomes = (ids: string[]) => ids.map((id) => FOOD.get(id)).filter((a): a is Alimento => !!a);
  const chipAlimento = (a: Alimento, cls: string) => (
    <button key={a.id} type="button" className={'diet-chip ' + cls} title={a.obs || undefined}
      onClick={() => { setAba('alimentos'); setBusca(''); setGrupo(null); setNatureza(null); setAlimento(a.id); }}>
      {a.nome}
    </button>
  );

  const info = sind ? DIET.sindromes[sind] : null;
  const al = alimento ? FOOD.get(alimento) : null;

  return (
    <div className="panel diet">
      <div className="diet-row" role="tablist">
        {([['sindromes', 'Por síndrome'], ['alimentos', `Alimentos (${DIET.alimentos.length})`], ['receitas', `Receitas (${DIET.receitas.length})`], ['elementos', '5 Elementos']] as [Aba, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={'diet-toggle' + (aba === k ? ' on' : '')} onClick={() => trocarAba(k)}>
            {l}
          </button>
        ))}
      </div>

      {aba !== 'elementos' && (
        <input type="search" style={{ marginTop: 12 }} value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder={aba === 'sindromes' ? 'Buscar síndrome (ex.: Yin do Rim, umidade, Fígado)…' : aba === 'alimentos' ? 'Buscar alimento ou ação (ex.: gengibre, umidade, Sangue)…' : 'Buscar receita ou ingrediente (ex.: congee, inhame)…'} />
      )}

      {aba === 'sindromes' && (
        <>
          <div className="diet-row" style={{ marginTop: 10 }}>
            {sindromes.map((c) => (
              <button key={c} type="button" className={'diet-toggle' + (sind === c ? ' on' : '')} aria-pressed={sind === c}
                title={DIET.sindromes[c].principio} onClick={() => setSind(sind === c ? null : c)}>
                {nomeSindrome(c)}
              </button>
            ))}
          </div>
          {info && sind ? (
            <div className="diet-sindrome">
              <h3>{nomeSindrome(sind)}</h3>
              <p><strong>Princípio:</strong> {info.principio}</p>
              <p><strong>Explicação para o paciente:</strong> {info.paciente}</p>
              <p><strong>Natureza dos alimentos:</strong> {info.naturezas.join(', ')} · <strong>Dicas de preparo:</strong> {info.preparo}</p>
              <h4 className="diet-pref-title">Prefira</h4>
              <div className="diet-row">{nomes(info.prefira).map((a) => chipAlimento(a, 'pref'))}</div>
              <h4 className="diet-evite-title">Evite</h4>
              <div className="diet-row">{nomes(info.evite).map((a) => chipAlimento(a, 'evite'))}</div>
              <h4>Receitas indicadas</h4>
              <div className="diet-recipes">
                {DIET.receitas.filter((r) => r.indicacoes.includes(sind)).map((r) => <ReceitaView key={r.id} r={r} />)}
              </div>
            </div>
          ) : (
            <p className="diet-help" style={{ marginTop: 12 }}>Escolha uma síndrome para ver a orientação alimentar, os alimentos e as receitas.</p>
          )}
        </>
      )}

      {aba === 'alimentos' && (
        <>
          <div className="diet-row" style={{ marginTop: 10 }}>
            {FOOD_GROUPS.map((g) => (
              <button key={g} type="button" className={'diet-toggle' + (grupo === g ? ' on' : '')} onClick={() => setGrupo(grupo === g ? null : g)}>{g}</button>
            ))}
          </div>
          <div className="diet-row" style={{ marginTop: 6 }}>
            <span className="diet-help" style={{ margin: 0 }}>Natureza:</span>
            {NATUREZAS.map((n) => (
              <button key={n} type="button" className={'diet-toggle' + (natureza === n ? ' on' : '')} onClick={() => setNatureza(natureza === n ? null : n)}>{n}</button>
            ))}
          </div>
          {al && (
            <div className="diet-food-card" style={{ borderColor: ELEMENT_COLOR[al.elemento] }}>
              <div className="diet-food-head">
                <h3>{al.nome}</h3>
                <button type="button" className="secondary small" onClick={() => setAlimento(null)} aria-label="Fechar">✕</button>
              </div>
              <p className="diet-element-meta">
                {al.grupo} · natureza <strong>{al.natureza.toLowerCase()}</strong> · sabor {al.sabores.join(', ')} ·{' '}
                <span style={{ color: ELEMENT_COLOR[al.elemento] }}>{al.elemento}</span> · {al.orgaos.map((o) => ORGAO[o] ?? o).join(', ')}
              </p>
              {al.acoes.length > 0 && <p><strong>Ações:</strong> {al.acoes.map((k) => DIET.acoes[k] ?? k).join('; ')}.</p>}
              {al.alertas.length > 0 && <p className="diet-notes"><strong>Atenção:</strong> {al.alertas.map((k) => extra.alertas[k] ?? k).join('; ')}.</p>}
              {al.obs && <p>{al.obs}</p>}
              {(() => {
                const pref = SINDROMES.filter((c) => DIET.sindromes[c].prefira.includes(al.id));
                const evit = SINDROMES.filter((c) => DIET.sindromes[c].evite.includes(al.id));
                return (
                  <>
                    {pref.length > 0 && <p><strong>Indicado em:</strong> {pref.map(nomeSindrome).join(', ')}.</p>}
                    {evit.length > 0 && <p className="diet-notes"><strong>Evitar em:</strong> {evit.map(nomeSindrome).join(', ')}.</p>}
                  </>
                );
              })()}
            </div>
          )}
          <p className="diet-help" style={{ marginTop: 10 }}>{alimentos.length} alimentos. Toque num alimento para ver os detalhes.</p>
          <div className="diet-row">
            {alimentos.map((a) => (
              <button key={a.id} type="button" className={'diet-chip' + (alimento === a.id ? ' pref' : '')} onClick={() => setAlimento(a.id)}>
                <span className="diet-dot" style={{ background: ELEMENT_COLOR[a.elemento] }} />{a.nome}
              </button>
            ))}
          </div>
        </>
      )}

      {aba === 'receitas' && (
        <>
          <p className="diet-help" style={{ marginTop: 10 }}>{receitas.length} receitas.</p>
          <div className="diet-recipes">{receitas.map((r) => <ReceitaView key={r.id} r={r} />)}</div>
        </>
      )}

      {aba === 'elementos' && (
        <div style={{ marginTop: 12 }}>
          {Object.entries(DIET.elementos).map(([nome, e]) => (
            <div key={nome} className="diet-element" style={{ borderColor: ELEMENT_COLOR[nome], marginBottom: 10 }}>
              <strong style={{ color: ELEMENT_COLOR[nome] }}>{nome}</strong>
              <span className="diet-element-meta">
                {e.orgaos} · sabor {e.sabor.toLowerCase()} · cor {e.cor.toLowerCase()} · {e.estacao.toLowerCase()}
              </span>
              <p>{e.orientacao}</p>
              <div className="diet-row" style={{ marginTop: 6 }}>{nomes(e.alimentos).map((a) => chipAlimento(a, 'pref'))}</div>
            </div>
          ))}
        </div>
      )}

      <p className="diet-legal">
        {DIET.aviso} Use “orientação alimentar”, não “dieta” ou “prescrição” (Lei 8.234/1991).
      </p>
      <details className="ear-refs">
        <summary>Referências</summary>
        <ul>{extra.fontes.map((f) => <li key={f}>{f}</li>)}</ul>
      </details>
    </div>
  );
}
