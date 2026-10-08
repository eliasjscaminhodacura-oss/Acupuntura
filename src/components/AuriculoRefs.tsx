import { REFERENCIAS, type PontoAuricular } from '@/lib/auriculo';

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

// Atalho para a aba Analgesia em Acupuntura.
export function AnalgesiaInfo() {
  return (
    <p className="panel ear-analgesia">
      <strong>Analgesia:</strong> pontos analgésicos da orelha, protocolos por tipo de dor, eletroacupuntura e os
      programas de analgesia cirúrgica de Souza estão na aba{' '}
      <a href="/analgesia">Analgesia em Acupuntura</a>.
    </p>
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
