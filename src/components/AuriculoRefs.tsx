import { ANALGESIA, REFERENCIAS, type PontoAuricular } from '@/lib/auriculo';

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
