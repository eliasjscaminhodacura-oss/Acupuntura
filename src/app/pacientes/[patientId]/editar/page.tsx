import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabaseServer';
import PatientForm, { type PatientRecord } from '@/components/PatientForm';

export const dynamic = 'force-dynamic';

export default async function EditarPacientePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const { supabase } = await requireUser();

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patient) notFound();

  return <PatientForm patient={patient as PatientRecord} />;
}
