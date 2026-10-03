import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import FichaForm from '@/components/FichaForm';

export const dynamic = 'force-dynamic';

export default async function FichaPage({ params }: { params: { patientId: string } }) {
  const supabase = createServerSupabaseClient();

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, birth_date, phone, address')
    .eq('id', params.patientId)
    .single();

  if (!patient) notFound();

  const { data: ficha } = await supabase
    .from('fichas')
    .select('id, answers, chief_complaint')
    .eq('patient_id', params.patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <FichaForm
      patient={patient}
      fichaId={ficha?.id ?? null}
      initialAnswers={(ficha?.answers as Record<string, boolean>) ?? {}}
      initialComplaint={ficha?.chief_complaint ?? ''}
    />
  );
}
