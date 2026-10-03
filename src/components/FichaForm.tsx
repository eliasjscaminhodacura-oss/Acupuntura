'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import appData from '@/data/app_data.json';
import type { Answers, FichaData } from '@/lib/ficha-types';
import { computeScores, topSyndromes, groupQuestionsByCategory, groupBySubcat } from '@/lib/ficha-logic';
import ElementRadar from './ElementRadar';
import { buildPdfBlob } from '@/lib/pdf-export';

const data = appData as unknown as FichaData;

type Patient = {
  id: string;
  name: string;
  birth_date: string | null;
  phone: string | null;
  address: string | null;
};

type Props = {
  patient: Patient;
  fichaId: string | null;
  initialAnswers: Answers;
  initialComplaint: string;
};

export default function FichaForm({ patient, fichaId, initialAnswers, initialComplaint }: Props) {
  const supabase = createClient();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [complaint, setComplaint] = useState(initialComplaint);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentFichaId, setCurrentFichaId] = useState(fichaId);

  const groups = useMemo(() => groupQuestionsByCategory(data), []);
  const result = useMemo(() => computeScores(answers, data), [answers]);
  const top = useMemo(() => topSyndromes(result, data, 8), [result]);

  function toggle(key: string) {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { data: userData } = await supabase.auth.getUser();
    const therapistId = userData.user?.id;
    if (!therapistId) {
      setSaving(false);
      setSaveError('Sessão expirada. Faça login novamente para salvar.');
      return;
    }

    const payload = {
      therapist_id: therapistId,
      patient_id: patient.id,
      chief_complaint: complaint,
      answers,
      syndrome_scores: result.syndromeScores,
      element_scores: result.elementScores,
    };

    let error;
    if (currentFichaId) {
      ({ error } = await supabase.from('fichas').update(payload).eq('id', currentFichaId));
    } else {
      const res = await supabase.from('fichas').insert(payload).select('id').single();
      error = res.error;
      if (res.data) setCurrentFichaId(res.data.id);
    }
    setSaving(false);
    if (error) {
      setSaveError('Não foi possível salvar a ficha. Verifique sua conexão e tente novamente.');
      return;
    }
    setSavedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  async function handlePdf() {
    const blob = buildPdfBlob(data, answers, {
      name: patient.name,
      dob: patient.birth_date || undefined,
      phone: patient.phone || undefined,
      address: patient.address || undefined,
      complaint,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#6b675c' }}>
            Método EliasJS · Caminho da Cura
          </div>
          <h1 style={{ margin: '2px 0 0' }}>Ficha de Anamnese — {patient.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={handlePdf}>Gerar PDF</button>
          <button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button>
        </div>
      </div>

      {saveError && <div className="error">{saveError}</div>}
      {savedAt && !saveError && <p style={{ color: '#3E6259', fontSize: 13 }}>Salvo às {savedAt}.</p>}

      <div className="panel">
        <label htmlFor="complaint">Queixa principal</label>
        <textarea
          id="complaint"
          rows={2}
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
        />
      </div>

      <div className="panel" style={{ textAlign: 'center' }}>
        <h3 style={{ marginTop: 0 }}>Diagnóstico pelos 5 Elementos</h3>
        <ElementRadar scores={result.elementScores} />
      </div>

      {top.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Síndromes identificadas</h3>
          {top.map((s) => {
            const note = data.clinical_notes[s.code];
            return (
              <div key={s.code} style={{ marginBottom: 14 }}>
                <strong>{s.info?.name || s.code}</strong>{' '}
                <span style={{ color: '#6b675c', fontSize: 13 }}>
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
      )}

      {groups.map((group) => (
        <div className="panel category" key={group.catCode}>
          <h3>{group.catName}</h3>
          {groupBySubcat(group.questions).map(({ subcat, questions: qs }) => (
            <div key={subcat}>
              <div className="subcat">{subcat}</div>
              {qs.map((q) => (
                <label key={q.id} className="item-check">
                  <input
                    type="checkbox"
                    checked={!!answers[q.key]}
                    onChange={() => toggle(q.key)}
                  />
                  {q.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div className="panel" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="secondary" onClick={handlePdf}>Gerar PDF</button>
        <button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button>
      </div>
    </div>
  );
}
