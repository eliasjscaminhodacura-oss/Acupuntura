import { ANALGESIA, PONTOS, REFERENCIAS, type PontoAuricular } from '@/lib/auriculo';

const NOME = new Map(PONTOS.map((p) => [p.codigo, p.nome]));

// Cuidado (contraindicação) e fontes de um ponto, no cartão do ponto.
export function PontoExtras({ ponto }: { ponto: PontoAuricular }) {
  return (
    <>
      {ponto.cuidado && (
        <p className="ear-caution"><strong>⚠ Cuidado:</strong> {ponto.cuidado}</p>
      )}
      {ponto.souza && <p className="ear-fontes">No livro de Souza: {ponto.souza}</p>}
      <p className="ear-fontes">Fontes: {ponto.fontes.join(', ')}</p>
    </>
  );
}

// Analgesia por auriculoterapia: o que é, preparo, limites e cuidados.
export function AnalgesiaInfo() {
  return (
    <details className="panel ear-analgesia">
      <summary><strong>{ANALGESIA.titulo}</strong></summary>
      <p className="ear-caution"><strong>⚠ </strong>{ANALGESIA.aviso}</p>
      {ANALGESIA.secoes.map((s) => (
        <div key={s.titulo}>
          <h4>{s.titulo}</h4>
          <ul>{s.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
      <h4>Programas de analgesia do livro</h4>
      <p className="ear-fontes">{ANALGESIA.programasNota}</p>
      <ul className="ear-programas">
        {ANALGESIA.programas.map((p) => (
          <li key={p.nome}>
            <strong>{p.nome}</strong> <span className="ear-fontes">(cap. {p.cap})</span>
            {p.pontos.length > 0 && <div>Orelha: {p.pontos.map((c) => `${NOME.get(c) ?? c} (${c})`).join(', ')}{p.orelha ? ` — ${p.orelha.toLowerCase()}` : ''}.</div>}
            {p.estimulacao && <div>{p.estimulacao}</div>}
            {p.sistemicos && <div>Pontos do corpo: {p.sistemicos}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}

// Lista das referências bibliográficas da auriculoterapia.
export default function AuriculoRefs() {
  return (
    <details className="ear-refs">
      <summary>Referências</summary>
      <ul>
        {REFERENCIAS.map((r) => (
          <li key={r.id}><strong>{r.id}</strong> — {r.texto}</li>
        ))}
      </ul>
    </details>
  );
}
