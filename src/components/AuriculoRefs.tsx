import { REFERENCIAS, type PontoAuricular } from '@/lib/auriculo';

// Cuidado (contraindicação) e fontes de um ponto, no cartão do ponto.
export function PontoExtras({ ponto }: { ponto: PontoAuricular }) {
  return (
    <>
      {ponto.cuidado && (
        <p className="ear-caution"><strong>⚠ Cuidado:</strong> {ponto.cuidado}</p>
      )}
      <p className="ear-fontes">Fontes: {ponto.fontes.join(', ')}</p>
    </>
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
