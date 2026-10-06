import type { createClient } from './supabaseClient';

// Registro de atendimentos da ficha (tabela "ficha_eventos"): abertura,
// sessões de alteração e retornos do paciente.

type Supabase = ReturnType<typeof createClient>;

export type FichaEventKind = 'abertura' | 'alteracao' | 'retorno';

export type FichaEvent = {
  id: string;
  kind: FichaEventKind;
  note: string | null;
  started_at: string;
  ended_at: string;
};

export const EVENT_LABEL: Record<FichaEventKind, string> = {
  abertura: 'Abertura da ficha',
  alteracao: 'Alteração na ficha',
  retorno: 'Retorno do paciente',
};

// Alterações com menos que isso de intervalo contam como a mesma sessão.
const SESSION_GAP_MS = 30 * 60 * 1000;

const COLUMNS = 'id, kind, note, started_at, ended_at';

// Mais recente primeiro. Devolve null se a tabela ainda não existir no banco.
export async function loadEvents(supabase: Supabase, fichaId: string): Promise<FichaEvent[] | null> {
  const { data, error } = await supabase
    .from('ficha_eventos')
    .select(COLUMNS)
    .eq('ficha_id', fichaId)
    .order('started_at', { ascending: false });
  if (error) return null;
  return data as FichaEvent[];
}

type Ids = { therapistId: string; fichaId: string; patientId: string };

export async function addEvent(
  supabase: Supabase,
  ids: Ids,
  kind: FichaEventKind,
  note?: string
): Promise<FichaEvent | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('ficha_eventos')
    .insert({
      therapist_id: ids.therapistId,
      ficha_id: ids.fichaId,
      patient_id: ids.patientId,
      kind,
      note: note?.trim() || null,
      started_at: now,
      ended_at: now,
    })
    .select(COLUMNS)
    .single();
  return error ? null : (data as FichaEvent);
}

// Depois de salvar uma alteração: se a sessão mais recente (abertura,
// retorno ou alteração) terminou há menos de 30 min, só estende o fim dela;
// senão abre uma nova sessão de alteração. Devolve a lista atualizada.
export async function recordChange(supabase: Supabase, ids: Ids, events: FichaEvent[]): Promise<FichaEvent[]> {
  const last = events[0];
  const now = new Date();
  if (last && now.getTime() - new Date(last.ended_at).getTime() < SESSION_GAP_MS) {
    const ended_at = now.toISOString();
    const { error } = await supabase.from('ficha_eventos').update({ ended_at }).eq('id', last.id);
    return error ? events : [{ ...last, ended_at }, ...events.slice(1)];
  }
  const created = await addEvent(supabase, ids, 'alteracao');
  return created ? [created, ...events] : events;
}

// "06/10/2026 às 10:12" (horário de Brasília, igual no servidor e no navegador)
export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

export function formatTimeBR(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

// Texto curto de um evento, ex.: "Retorno do paciente — 06/10/2026 às 10:00 (até 10:25)"
export function describeEvent(e: FichaEvent): string {
  const sameMinute = formatDateTimeBR(e.started_at) === formatDateTimeBR(e.ended_at);
  const sameDay =
    new Date(e.started_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) ===
    new Date(e.ended_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const until = sameMinute ? '' : ` (até ${sameDay ? formatTimeBR(e.ended_at) : formatDateTimeBR(e.ended_at)})`;
  return `${EVENT_LABEL[e.kind]} — ${formatDateTimeBR(e.started_at)}${until}`;
}
