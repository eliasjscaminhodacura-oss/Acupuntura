'use client';

import { useState } from 'react';
import appData from '@/data/app_data.json';
import type { FichaData } from '@/lib/ficha-types';
import { ELEMENT_COLOR } from '@/lib/ficha-logic';
import { ELEMENTOS, FACIAL, type Elemento } from '@/lib/facial';
import FaceIllustration from './FaceIllustration';

// Consulta da Análise Facial segundo a MTC (sem paciente).

const data = appData as unknown as FichaData;
const nomeSind = (c: string) => data.syndromes[c]?.name ?? c;
type Aba = 'tipos' | 'mapa' | 'cores' | 'sinais';

export default function FacialAtlas() {
  const [aba, setAba] = useState<Aba>('tipos');
  const [tipo, setTipo] = useState<Elemento>('Madeira');
  const [mapaId, setMapaId] = useState(FACIAL.mapas[0].id);
  const [zona, setZona] = useState<string | null>(null);
  const mapa = FACIAL.mapas.find((m) => m.id === mapaId)!;
  const z = mapa.zonas.find((x) => x.id === zona);
  const t = FACIAL.tipos[tipo];

  return (
    <div className="panel facial">
      <div className="diet-row" role="tablist">
        {([['tipos', 'Os 5 tipos'], ['mapa', 'Mapa do rosto'], ['cores', 'Cores da tez'], ['sinais', 'Sinais']] as [Aba, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={'diet-toggle' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>
        ))}
      </div>

      {aba === 'tipos' && (
        <>
          <div className="facial-gallery">
            {ELEMENTOS.map((e) => (
              <button key={e} type="button" className={'facial-thumb' + (tipo === e ? ' on' : '')} style={{ borderColor: ELEMENT_COLOR[e] }}
                onClick={() => setTipo(e)} aria-pressed={tipo === e}>
                <FaceIllustration tipo={e} />
                <span style={{ color: ELEMENT_COLOR[e] }}>{e}</span>
              </button>
            ))}
          </div>
          <div className="facial-tipo" style={{ borderColor: ELEMENT_COLOR[tipo] }}>
            <div className="facial-tipo-img"><FaceIllustration tipo={tipo} /></div>
            <div>
              <h3 style={{ color: ELEMENT_COLOR[tipo] }}>{t.titulo}</h3>
              <p><em>{t.resumo}</em></p>
              <h4>Rosto</h4>
              <ul>{t.rosto.map((x) => <li key={x}>{x}</li>)}</ul>
              <h4>Corpo</h4>
              <ul>{t.corpo.map((x) => <li key={x}>{x}</li>)}</ul>
              <h4>Temperamento</h4>
              <ul>{t.temperamento.map((x) => <li key={x}>{x}</li>)}</ul>
              <p><strong>Estações:</strong> {t.estacao}</p>
              <p><strong>Tendências de desequilíbrio:</strong> {t.tendencias}</p>
              <p><strong>Síndromes mais comuns:</strong> {t.sindromes.map(nomeSind).join(', ')}.</p>
            </div>
          </div>
          <p className="diet-help" style={{ marginTop: 10 }}>
            Poucas pessoas são de um tipo puro: o mais comum é uma mistura, com um Elemento predominante. Ilustrações esquemáticas: o formato do rosto vale para qualquer cor de pele, e o tom
            de cada desenho indica só a tez típica do Elemento (veja “Cores da tez”).
          </p>
        </>
      )}

      {aba === 'mapa' && (
        <>
          <div className="diet-row" style={{ marginTop: 12 }}>
            {FACIAL.mapas.map((m) => (
              <button key={m.id} type="button" className={'diet-toggle' + (mapaId === m.id ? ' on' : '')} onClick={() => { setMapaId(m.id); setZona(null); }}>{m.nome}</button>
            ))}
          </div>
          <p className="diet-help" style={{ marginTop: 8 }}>{mapa.descricao}</p>
          <div className="facial-tipo">
            <div className="facial-tipo-img">
              <FaceIllustration tipo="neutro" zonas={mapa.zonas} selecionada={zona} onZona={setZona} cores={ELEMENT_COLOR} titulo={mapa.nome} />
            </div>
            <div>
              {z ? (
                <div className="diet-element" style={{ borderColor: z.elemento ? ELEMENT_COLOR[z.elemento] : 'var(--border)' }}>
                  <strong>{z.nome}</strong>
                  <span className="diet-element-meta">{z.orgao}{z.elemento ? ` · ${z.elemento}` : ''}</span>
                  <p>{z.sinais}</p>
                </div>
              ) : (
                <p className="diet-help">Toque numa área colorida do rosto (ou na lista) para ver o órgão correspondente.</p>
              )}
              <ul className="facial-zonas">
                {mapa.zonas.map((x) => (
                  <li key={x.id} className={zona === x.id ? 'on' : undefined} onClick={() => setZona(x.id)}>
                    <span className="diet-dot" style={{ background: x.elemento ? ELEMENT_COLOR[x.elemento] : '#6b675c' }} />
                    <strong>{x.nome}</strong> — {x.orgao}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {aba === 'cores' && (
        <div style={{ marginTop: 12 }}>
          {FACIAL.cores.map((c) => (
            <div key={c.id} className="diet-element facial-cor" style={{ borderColor: ELEMENT_COLOR[c.elemento] }}>
              <span className="facial-amostra" style={{ background: c.amostra }} />
              <div>
                <strong>{c.nome}</strong>
                <span className="diet-element-meta">{c.elemento} · {c.orgao}</span>
                <p>{c.significado}</p>
              </div>
            </div>
          ))}
          <p className="diet-principle"><strong>Brilho da tez:</strong> {FACIAL.brilho}</p>
        </div>
      )}

      {aba === 'sinais' && (
        <div style={{ marginTop: 12 }}>
          {FACIAL.observacoes.filter((g) => !g.unico).map((g) => (
            <div key={g.grupo}>
              <h4>{g.grupo}</h4>
              <ul className="facial-sinais">
                {g.itens.map((o) => (
                  <li key={o.id}>
                    {o.elemento && <span className="diet-dot" style={{ background: ELEMENT_COLOR[o.elemento] }} />}
                    <strong>{o.label}</strong>
                    {o.sindromes.length > 0 && <> — {o.sindromes.map(nomeSind).join(', ')}</>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="diet-legal">{FACIAL.aviso}</p>
      <details className="ear-refs">
        <summary>Referências</summary>
        <ul>{FACIAL.fontes.map((f) => <li key={f}>{f}</li>)}</ul>
      </details>
    </div>
  );
}
