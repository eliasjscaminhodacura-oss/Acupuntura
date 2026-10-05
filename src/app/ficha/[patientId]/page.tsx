import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabaseServer';
import FichaForm from '@/components/FichaForm';
import type { PatientRecord } from '@/components/PatientForm';

export const dynamic = 'force-dynamic';

export default async function FichaPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const { supabase } = await requireUser();

  // "*" para continuar funcionando mesmo antes da coluna "sex" existir no banco.
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patient) notFound();

  const { data: ficha } = await supabase
    .from('fichas')
    .select('id, answers, chief_complaint')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <FichaForm
      patient={{ ...(patient as PatientRecord), sex: patient.sex ?? null }}
      fichaId={ficha?.id ?? null}
      initialAnswers={(ficha?.answers as Record<string, boolean>) ?? {}}
      initialComplaint={ficha?.chief_complaint ?? ''}
    />
  );
}
