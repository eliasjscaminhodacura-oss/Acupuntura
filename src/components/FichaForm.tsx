'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import appData from '@/data/app_data.json';
import type { Answers, FichaData } from '@/lib/ficha-types';
import {
  computeScores,
  topSyndromes,
  groupQuestionsByCategory,
  groupBySubcat,
  dataForSex,
  formatDateBR,
  SEX_LABEL,
  normalGroups,
  applyNormalDefaults,
  type NormalGroup,
} from '@/lib/ficha-logic';
import ElementRadar from './ElementRadar';
import ElementCycle from './ElementCycle';
import BodyHologram from './BodyHologram';
import { buildBodyResult } from '@/lib/body-map';
import Logo, { loadLogoDataUrl } from './Logo';
import type { PatientRecord } from './PatientForm';
import { buildPdfBlob } from '@/lib/pdf-export';
import { downloadBlob } from '@/lib/download';
import DietPanel from './DietPanel';
import { normalizeDiet, type DietState } from '@/lib/dietetica';

const allData = appData as unknown as FichaData;

const AUTO_SCROLL_KEY = 'ficha-auto-scroll';
const AUTO_SCROLL_DELAY_MS = 1200;
const AUTOSAVE_DELAY_MS = 2000;

type Props = {
  patient: PatientRecord;
  fichaId: string | null;
  initialAnswers: Answers;
  initialComplaint: string;
  initialDiet: unknown;
};

export default function FichaForm({ patient, fichaId, initialAnswers, initialComplaint, initialDiet }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(() =>
    applyNormalDefaults(initialAnswers, normalGroups(dataForSex(allData, patient.sex)))
  );
  const [complaint, setComplaint] = useState(initialComplaint);
  const [diet, setDiet] = useState<DietState>(() => normalizeDiet(initialDiet));
  // true se o banco ainda não tem a coluna fichas.diet (schema.sql não rodado)
  const [dietNotSaved, setDietNotSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [saveRetry, setSaveRetry] = useState(0);

  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs com os valores mais recentes, usados pelo salvamento automático
  // (evita duas fichas criadas ao mesmo tempo e detecta mudanças feitas
  // enquanto um salvamento estava em andamento).
  const answersRef = useRef(answers);
  const complaintRef = useRef(complaint);
  const dietRef = useRef(diet);
  const dietColumnMissing = useRef(false);
  const fichaIdRef = useRef(fichaId);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  answersRef.current = answers;
  complaintRef.current = complaint;
  dietRef.current = diet;

  // Só as perguntas que valem para o sexo do paciente
  const data = useMemo(() => dataForSex(allData, patient.sex), [patient.sex]);
  const groups = useMemo(
    () => groupQuestionsByCategory(data).map((g) => ({ ...g, subcats: groupBySubcat(g.questions) })),
    [data]
  );
  // chave de cada item -> grupo com "Sem alterações / Normal" a que pertence
  const normalByKey = useMemo(() => {
    const map = new Map<string, NormalGroup>();
    for (const g of normalGroups(data)) {
      map.set(g.normal, g);
      g.others.forEach((k) => map.set(k, g));
    }
    return map;
  }, [data]);
  const result = useMemo(() => computeScores(answers, data), [answers, data]);
  const top = useMemo(() => topSyndromes(result, data, 8), [result, data]);
  const body = useMemo(
    () => buildBodyResult(data, result.syndromeScores, top.map((s) => s.code)),
    [data, result, top]
  );
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(AUTO_SCROLL_KEY) === 'off') setAutoScroll(false);
    } catch {}
  }, []);

  // Avisa antes de fechar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  // Salvamento automático: alguns segundos depois da última alteração
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => { void handleSave(); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [answers, complaint, diet, dirty, saveRetry]);

  function changeAutoScroll(on: boolean) {
    setAutoScroll(on);
    try {
      localStorage.setItem(AUTO_SCROLL_KEY, on ? 'on' : 'off');
    } catch {}
  }

  // Ao marcar um item do último grupo de uma categoria, rola sozinho para a
  // próxima categoria (com uma pequena pausa, para dar tempo de marcar mais
  // de um item no mesmo grupo).
  function scheduleScroll(catIndex: number) {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    const next = categoryRefs.current[catIndex + 1];
    if (!autoScroll || !next) return;
    scrollTimer.current = setTimeout(() => {
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, AUTO_SCROLL_DELAY_MS);
  }

  // "Sem alterações / Normal" e as alterações do mesmo grupo se excluem:
  // marcar uma alteração desmarca o Normal; sem nenhuma alteração, o Normal
  // volta a ficar marcado; marcar o Normal limpa as alterações do grupo.
  function toggle(key: string, catIndex: number, isLastSubcat: boolean) {
    const group = normalByKey.get(key);
    const checking = !answers[key];
    if (group && key === group.normal && !checking) return; // Normal só sai ao marcar uma alteração
    setAnswers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (group) {
        if (key === group.normal) group.others.forEach((k) => { next[k] = false; });
        else next[group.normal] = !group.others.some((k) => next[k]);
      }
      return next;
    });
    setDirty(true);
    if (checking && isLastSubcat) scheduleScroll(catIndex);
    else if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }

  // Antes de sair da ficha, salva o que estiver pendente.
  async function leave(href: string) {
    if (dirty && !(await handleSave())) {
      if (!window.confirm('Não foi possível salvar as últimas alterações. Sair mesmo assim?')) return;
    }
    router.push(href);
  }

  // Salva a ficha no Supabase (automático ou pelo botão). Devolve true se
  // tudo o que está na tela ficou salvo.
  async function handleSave(): Promise<boolean> {
    if (savingRef.current) {
      pendingRef.current = true;
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    const snapAnswers = answersRef.current;
    const snapComplaint = complaintRef.current;
    const snapDiet = dietRef.current;
    const scores = computeScores(snapAnswers, data);

    let error: unknown = null;
    const { data: userData } = await supabase.auth.getUser();
    const therapistId = userData.user?.id;
    if (!therapistId) {
      error = 'sessão';
    } else {
      const base = {
        therapist_id: therapistId,
        patient_id: patient.id,
        chief_complaint: snapComplaint,
        answers: snapAnswers,
        syndrome_scores: scores.syndromeScores,
        element_scores: scores.elementScores,
      };
      const write = async (payload: Record<string, unknown>) => {
        if (fichaIdRef.current) {
          return (await supabase.from('fichas').update(payload).eq('id', fichaIdRef.current)).error;
        }
        const res = await supabase.from('fichas').insert(payload).select('id').single();
        if (res.data) fichaIdRef.current = res.data.id;
        return res.error;
      };
      error = await write(dietColumnMissing.current ? base : { ...base, diet: snapDiet });
      // Banco sem a coluna "diet" (schema.sql ainda não rodado): salva o resto.
      if (error && !dietColumnMissing.current && /diet/.test(String((error as { message?: string }).message))) {
        dietColumnMissing.current = true;
        setDietNotSaved(true);
        error = await write(base);
      }
    }

    savingRef.current = false;
    setSaving(false);
    if (error) {
      setSaveError(
        error === 'sessão'
          ? 'Sessão expirada. Faça login novamente para salvar.'
          : 'Não foi possível salvar a ficha. Verifique sua conexão — vamos tentar de novo na próxima alteração.'
      );
      return false;
    }

    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const changedMeanwhile =
      pendingRef.current || answersRef.current !== snapAnswers || complaintRef.current !== snapComplaint ||
      dietRef.current !== snapDiet;
    pendingRef.current = false;
    if (changedMeanwhile) {
      setSaveRetry((n) => n + 1); // salva de novo o que mudou durante este salvamento
      return false;
    }
    setDirty(false);
    return true;
  }

  async function handlePdf() {
    const logo = await loadLogoDataUrl();
    const blob = buildPdfBlob(
      data,
      answers,
      {
        name: patient.name,
        sex: patient.sex ? SEX_LABEL[patient.sex] : undefined,
        dob: patient.birth_date || undefined,
        phone: patient.phone || undefined,
        address: patient.address || undefined,
        complaint,
      },
      logo
    );
    downloadBlob(blob, `ficha-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  const patientSummary = [
    patient.sex ? SEX_LABEL[patient.sex] : null,
    patient.birth_date ? `Nascimento: ${formatDateBR(patient.birth_date)}` : null,
    patient.phone,
  ].filter(Boolean).join(' · ');

  return (
    <div className="container">
      <div className="nav-row">
        <button className="secondary small" onClick={() => leave('/')}>← Meus pacientes</button>
        <button className="secondary small" onClick={() => leave(`/pacientes/${patient.id}/editar`)}>
          Corrigir dados do paciente
        </button>
      </div>

      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          <Logo size={76} />
          <div>
            <div className="kicker">Método de Anamnese em MTC by Elias JS · Caminho da Cura</div>
            <h1 style={{ margin: '2px 0 0' }}>Ficha de Anamnese — {patient.name}</h1>
            {patientSummary && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{patientSummary}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={handlePdf}>Gerar PDF</button>
          <button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button>
        </div>
      </div>

      {!patient.sex && (
        <div className="panel notice">
          O sexo deste paciente ainda não foi informado, por isso aparecem as perguntas masculinas e femininas.{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); leave(`/pacientes/${patient.id}/editar`); }}>
            Informar agora
          </a>
        </div>
      )}

      {saveError && <div className="error">{saveError}</div>}
      {!saveError && (
        <p className="save-status">
          {saving
            ? 'Salvando…'
            : dirty
              ? 'Salvando automaticamente em instantes…'
              : savedAt
                ? `✓ Tudo salvo automaticamente (${savedAt})`
                : 'As marcações são salvas automaticamente.'}
        </p>
      )}

      <div className="panel">
        <label htmlFor="complaint">Queixa principal</label>
        <textarea
          id="complaint"
          rows={2}
          value={complaint}
          onChange={(e) => { setComplaint(e.target.value); setDirty(true); }}
        />
      </div>

      <div className="auto-scroll-row">
        <label className="item-check auto-scroll">
          <input type="checkbox" checked={autoScroll} onChange={(e) => changeAutoScroll(e.target.checked)} />
          Ao marcar o último grupo de cada parte, ir sozinho para a próxima parte
        </label>
        <button
          className="secondary small"
          onClick={() => categoryRefs.current[groups.length]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Ir para o resultado ↓
        </button>
      </div>

      {groups.map((group, catIndex) => (
        <div
          className="panel category"
          key={group.catCode}
          ref={(el) => { categoryRefs.current[catIndex] = el; }}
        >
          <h3>{group.catName}</h3>
          {group.subcats.map(({ subcat, questions: qs }, subIndex) => {
            const isLastSubcat = subIndex === group.subcats.length - 1;
            return (
              <div key={subIndex}>
                {subcat ? <div className="subcat">{subcat}</div> : <div style={{ height: 8 }} />}
                <div className="item-grid">
                  {qs.map((q) => (
                    <label key={q.id} className={answers[q.key] ? 'item-check checked' : 'item-check'}>
                      <input
                        type="checkbox"
                        checked={!!answers[q.key]}
                        onChange={() => toggle(q.key, catIndex, isLastSubcat)}
                      />
                      {q.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Resultado no final da investigação. O ref no índice groups.length faz
          o avanço automático da última parte (Pulso) descer até aqui. */}
      <div className="results" ref={(el) => { categoryRefs.current[groups.length] = el; }}>
        <h2 className="results-title">Resultado da investigação</h2>

        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Diagnóstico pelos 5 Elementos</h3>
            <button className="secondary small" onClick={() => setShow3d((v) => !v)}>
              {show3d ? 'Ver o Ciclo' : 'Ver em 3D'}
            </button>
          </div>
          {show3d ? <ElementRadar scores={result.elementScores} /> : <ElementCycle scores={result.elementScores} />}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Mapa do corpo — órgãos e pontos sugeridos</h3>
          <BodyHologram body={body} />
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Síndromes identificadas</h3>
          {top.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Nenhuma síndrome ainda. Marque os sintomas acima para ver o resultado.
            </p>
          )}
          {top.map((s) => {
            const note = data.clinical_notes[s.code];
            return (
              <div key={s.code} style={{ marginBottom: 14 }}>
                <strong>{s.info?.name || s.code}</strong>{' '}
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                  ({s.info?.organ_name}) — {s.score} ponto(s)
                </span>
                {note && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    <div><em>Princípio:</em> {note.principio}</div>
                    <div><em>Pontos:</em> {note.pontos}</div>
                    <div><em>Leitura Psicossomática ({s.info?.alma}):</em> {note.psicossomatica}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DietPanel
          data={data}
          ranked={top.map((s) => s.code)}
          elementScores={result.elementScores}
          patientName={patient.name}
          diet={diet}
          onChange={(next) => { setDiet(next); setDirty(true); }}
          notSaved={dietNotSaved}
        />
      </div>

      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <button className="secondary" onClick={() => leave('/')}>← Meus pacientes</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={handlePdf}>Gerar PDF</button>
          <button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button>
        </div>
      </div>
    </div>
  );
}
