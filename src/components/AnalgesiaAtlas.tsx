'use client';

import { useState, type CSSProperties } from 'react';
import raw from '@/data/analgesia.json';
import { ANALGESIA, PONTOS, REFERENCIAS, REGIAO } from '@/lib/auriculo';

// Aba "Analgesia em Acupuntura": fundamentos, auriculoterapia, pontos do
// corpo, eletroacupuntura, outras técnicas e programas cirúrgicos.
// Conteúdo em src/data/analgesia.json (base: Silvério-Lopes, 2013) e
// auriculo.json → analgesia (Souza e protocolos por tipo de dor).

type Bloco = { titulo: string; fonte: string; itens: string[] };
type Dados = {
  aviso: string;
  fundamentos: Bloco[];
  auriculo: {
    base: string;
    pontos: { codigo: string; porque: string }[];
    fonte: string;
    eletro: { texto: string; pares: { efeito: string; negativo: string; positivo: string | null; obs?: string }[] };
    dort: string;
  };
  corpo: { classicos: { ponto: string; texto: string }[]; fonte: string; gestantes: string[] };
  eletro: Record<'frequencias' | 'modulacao' | 'polaridade' | 'dorLocal' | 'contra' | 'cuidados' | 'eletropuntura', string[]>;
  tecnicas: { nome: string; fonte: string; itens: string[] }[];
  fontes: string[];
};
const D = raw as Dados;
const PONTO = new Map(PONTOS.map((p) => [p.codigo, p]));
const nome = (c: string) => `${PONTO.get(c)?.nome ?? c} (${c})`;

type Aba = 'fundamentos' | 'auriculo' | 'corpo' | 'eletro' | 'tecnicas' | 'programas';
const ABAS: [Aba, string][] = [
  ['fundamentos', 'Fundamentos'],
  ['auriculo', 'Auriculoterapia'],
  ['corpo', 'Pontos do corpo e gestantes'],
  ['eletro', 'Eletroacupuntura'],
  ['tecnicas', 'Outras técnicas'],
  ['programas', 'Programas cirúrgicos'],
];

function Lista({ itens }: { itens: string[] }) {
  return <ul className="anal-list">{itens.map((i) => <li key={i}>{i}</li>)}</ul>;
}

export default function AnalgesiaAtlas() {
  const [aba, setAba] = useState<Aba>('fundamentos');
  const refs = REFERENCIAS.filter((r) => D.fontes.includes(r.id));

  return (
    <div className="panel analgesia">
      <p className="ear-caution" style={{ marginTop: 0 }}><strong>⚠ </strong>{D.aviso}</p>
      <div className="diet-row" role="tablist">
        {ABAS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={'diet-toggle' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>
        ))}
      </div>

      {aba === 'fundamentos' && D.fundamentos.map((b) => (
        <section key={b.titulo}>
          <h3>{b.titulo}</h3>
          <Lista itens={b.itens} />
          <p className="ear-fontes">Fontes: {b.fonte}</p>
        </section>
      ))}

      {aba === 'auriculo' && (
        <>
          <h3>Pontos analgésicos da orelha</h3>
          <p>{D.auriculo.base}</p>
          <ul className="anal-pontos">
            {D.auriculo.pontos.map((p) => {
              const pt = PONTO.get(p.codigo);
              return (
                <li key={p.codigo}>
                  <span className="auriculo-dot" style={{ background: pt ? REGIAO[pt.regiao].cor : '#999' } as CSSProperties} />
                  <strong>{nome(p.codigo)}</strong> — {p.porque}
                </li>
              );
            })}
          </ul>
          <p className="ear-fontes">Fontes: {D.auriculo.fonte} Para ver onde fica cada ponto, abra a <a href="/auriculoterapia">aba Auriculoterapia</a>.</p>

          <h3>Protocolos por tipo de dor</h3>
          <p className="ear-fontes">{ANALGESIA.protocolosDorNota}</p>
          <ul className="ear-programas">
            {ANALGESIA.protocolosDor.map((p) => (
              <li key={p.nome}>
                <strong>{p.nome}</strong>
                <div>Pontos: {p.pontos.map(nome).join(', ')}.</div>
                <div>{p.extra}</div>
                <div className="ear-fontes">Sessões: {p.sessoes}</div>
              </li>
            ))}
          </ul>

          <h3>LER/DORT — protocolo de estudo</h3>
          <p>{D.auriculo.dort}</p>

          <h3>Eletroacupuntura na orelha</h3>
          <p>{D.auriculo.eletro.texto}</p>
          <ul className="anal-list">
            {D.auriculo.eletro.pares.map((p) => (
              <li key={p.efeito}>
                <strong>{p.efeito}:</strong> {nome(p.negativo)} no pólo negativo (preto) com {p.positivo ? nome(p.positivo) : p.obs} no positivo (vermelho).
              </li>
            ))}
          </ul>
          <p className="ear-fontes">Fontes: Silvério-Lopes (cap. 5); Araújo & Silvério-Lopes (cap. 8).</p>
        </>
      )}

      {aba === 'corpo' && (
        <>
          <h3>Pontos analgésicos clássicos do corpo</h3>
          <ul className="anal-list">
            {D.corpo.classicos.map((c) => <li key={c.ponto}><strong>{c.ponto}:</strong> {c.texto}</li>)}
          </ul>
          <p className="ear-fontes">Fontes: {D.corpo.fonte}</p>
          <h3>Gestantes</h3>
          <Lista itens={D.corpo.gestantes} />
          <p className="ear-fontes">Fontes: Quimelli (cap. 9); Camilotti (cap. 2); Tano & Silvério-Lopes (cap. 4); Cassu & Luna; Martini & Becker.</p>
        </>
      )}

      {aba === 'eletro' && (
        <>
          <h3>Frequências</h3>
          <Lista itens={D.eletro.frequencias} />
          <h3>Forma do estímulo</h3>
          <Lista itens={D.eletro.modulacao} />
          <h3>Onde colocar cada pólo</h3>
          <Lista itens={D.eletro.polaridade} />
          <h3>Montagens para cada tipo de dor</h3>
          <Lista itens={D.eletro.dorLocal} />
          <h3>Contraindicações</h3>
          <Lista itens={D.eletro.contra} />
          <h3>Cuidados na aplicação</h3>
          <Lista itens={D.eletro.cuidados} />
          <h3>Eletropuntura (sem agulha)</h3>
          <Lista itens={D.eletro.eletropuntura} />
          <p className="ear-fontes">Fontes: Silvério-Lopes (caps. 5 e 10); Cassu & Luna; Luiz et al.; Martini & Becker.</p>
        </>
      )}

      {aba === 'tecnicas' && D.tecnicas.map((t) => (
        <section key={t.nome}>
          <h3>{t.nome}</h3>
          <Lista itens={t.itens} />
          <p className="ear-fontes">Fonte: {t.fonte} — em Silvério-Lopes (org.), 2013.</p>
        </section>
      ))}

      {aba === 'programas' && (
        <>
          <h3>Programas de analgesia cirúrgica (Souza)</h3>
          <p className="ear-fontes">{ANALGESIA.programasNota}</p>
          <ul className="ear-programas">
            {ANALGESIA.programas.map((p) => (
              <li key={p.nome}>
                <strong>{p.nome}</strong> <span className="ear-fontes">(cap. {p.cap})</span>
                {p.pontos.length > 0 && <div>Orelha: {p.pontos.map(nome).join(', ')}{p.orelha ? ` — ${p.orelha.toLowerCase()}` : ''}.</div>}
                {p.estimulacao && <div>{p.estimulacao}</div>}
                {p.sistemicos && <div>Pontos do corpo: {p.sistemicos}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      <details className="ear-refs">
        <summary>Referências</summary>
        <ul>{refs.map((r) => <li key={r.id}><strong>{r.id}</strong> — {r.texto}</li>)}</ul>
      </details>
    </div>
  );
}
