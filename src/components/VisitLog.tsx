'use client';

import { useState } from 'react';
import { describeEvent, formatDateTimeBR, type FichaEvent } from '@/lib/ficha-eventos';

type Props = {
  createdAt: string | null; // abertura da ficha (fichas.created_at)
  updatedAt: string | null; // última alteração (fichas.updated_at)
  events: FichaEvent[] | null; // null = tabela ainda não existe no banco
  onRegisterReturn: (note: string) => Promise<boolean>;
};

const ICON: Record<FichaEvent['kind'], string> = { abertura: '📋', alteracao: '✏️', retorno: '🔁' };

// Quadro "Registro de atendimentos": datas de abertura, última alteração,
// retornos do paciente e histórico completo.
export default function VisitLog({ createdAt, updatedAt, events, onRegisterReturn }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const returns = events?.filter((e) => e.kind === 'retorno') ?? [];
  const lastReturn = returns[0];

  async function submit() {
    setBusy(true);
    setMessage(null);
    const ok = await onRegisterReturn(note);
    setBusy(false);
    if (ok) {
      setNote('');
      setShowForm(false);
      setMessage('Retorno registrado.');
    } else {
      setMessage('Não foi possível registrar o retorno. Verifique sua conexão e tente de novo.');
    }
  }

  return (
    <div className="panel visit-log">
      <div className="panel-head">
        <h3 style={{ margin: 0 }}>Registro de atendimentos</h3>
        {events && (
          <button className="small" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '🔁 Registrar retorno do paciente'}
          </button>
        )}
      </div>

      <div className="visit-facts">
        <div><span>Ficha aberta em</span><strong>{createdAt ? formatDateTimeBR(createdAt) : 'ainda não salva'}</strong></div>
        <div><span>Última alteração</span><strong>{updatedAt ? formatDateTimeBR(updatedAt) : '—'}</strong></div>
        {events && (
          <div>
            <span>Retornos</span>
            <strong>
              {returns.length === 0 ? 'nenhum' : `${returns.length} · último em ${formatDateTimeBR(lastReturn.started_at)}`}
            </strong>
          </div>
        )}
      </div>

      {showForm && (
        <div className="visit-form">
          <label htmlFor="return-note">Observação do retorno (opcional)</label>
          <textarea
            id="return-note"
            rows={2}
            value={note}
            placeholder="Ex.: relata melhora do sono; dor lombar persiste"
            onChange={(e) => setNote(e.target.value)}
          />
          <button onClick={submit} disabled={busy}>{busy ? 'Registrando…' : 'Registrar retorno agora'}</button>
        </div>
      )}

      {message && <p className="visit-message">{message}</p>}

      {events === null && (
        <p className="visit-message">
          Para registrar retornos e o histórico de alterações, falta atualizar o banco de dados (peça ao Claude).
        </p>
      )}

      {events && events.length > 0 && (
        <>
          <button className="link-button" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? '▲ Esconder histórico' : `▼ Ver histórico completo (${events.length})`}
          </button>
          {showHistory && (
            <ul className="visit-history">
              {events.map((e) => (
                <li key={e.id} className={`visit-${e.kind}`}>
                  <span className="visit-icon">{ICON[e.kind]}</span>
                  <div>
                    {describeEvent(e)}
                    {e.note && <div className="visit-note">{e.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
