'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Logo from './Logo';

export type PatientRecord = {
  id: string;
  name: string;
  sex: 'M' | 'F' | null;
  birth_date: string | null;
  phone: string | null;
  address: string | null;
};

// Cadastro de paciente novo (sem "patient") ou correção dos dados de um
// paciente já existente (com "patient").
export default function PatientForm({ patient }: { patient?: PatientRecord }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!patient;
  const [name, setName] = useState(patient?.name ?? '');
  const [sex, setSex] = useState<'M' | 'F' | ''>(patient?.sex ?? '');
  const [dob, setDob] = useState(patient?.birth_date ?? '');
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sex) {
      setError('Selecione o sexo do paciente.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const therapistId = userData.user?.id;
    if (!therapistId) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    const fields = {
      name,
      sex,
      birth_date: dob || null,
      phone: phone || null,
      address: address || null,
    };

    let patientId = patient?.id;
    let saveError;
    if (editing) {
      ({ error: saveError } = await supabase.from('patients').update(fields).eq('id', patient.id));
    } else {
      const res = await supabase
        .from('patients')
        .insert({ therapist_id: therapistId, ...fields })
        .select('id')
        .single();
      saveError = res.error;
      patientId = res.data?.id;
    }

    setLoading(false);
    if (saveError || !patientId) {
      setError(
        saveError?.message?.includes('sex')
          ? 'O banco de dados ainda não tem o campo "sexo". Peça ao Claude para atualizar o Supabase.'
          : saveError?.message || 'Não foi possível salvar.'
      );
      return;
    }
    router.push(`/ficha/${patientId}`);
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="brand">
        <Logo size={64} />
        <div>
          <div className="kicker">Método de Anamnese em MTC by Elias JS · Caminho da Cura</div>
          <h1>{editing ? 'Corrigir dados do paciente' : 'Novo paciente'}</h1>
        </div>
      </div>
      <form className="panel" onSubmit={handleSubmit}>
        <label htmlFor="name">Nome completo</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />

        <label>Sexo</label>
        <div className="sex-choice">
          <label className="item-check">
            <input type="radio" name="sex" checked={sex === 'M'} onChange={() => setSex('M')} />
            Masculino
          </label>
          <label className="item-check">
            <input type="radio" name="sex" checked={sex === 'F'} onChange={() => setSex('F')} />
            Feminino
          </label>
        </div>

        <label htmlFor="dob">Data de nascimento</label>
        <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <label htmlFor="phone">Telefone</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label htmlFor="address">Endereço</label>
        <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href={editing ? `/ficha/${patient.id}` : '/'}>
            <button type="button" className="secondary">{editing ? '← Voltar à ficha' : '← Meus pacientes'}</button>
          </Link>
          <button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : editing ? 'Salvar e voltar à ficha' : 'Salvar e abrir ficha'}
          </button>
        </div>
      </form>
    </div>
  );
}
