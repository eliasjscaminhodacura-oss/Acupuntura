'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function NovoPacientePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const therapistId = userData.user?.id;
    if (!therapistId) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('patients')
      .insert({
        therapist_id: therapistId,
        name,
        birth_date: dob || null,
        phone: phone || null,
        address: address || null,
      })
      .select('id')
      .single();

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/ficha/${data.id}`);
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1>Novo paciente</h1>
      <form className="panel" onSubmit={handleSubmit}>
        <label htmlFor="name">Nome completo</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="dob">Data de nascimento</label>
        <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <label htmlFor="phone">Telefone</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label htmlFor="address">Endereço</label>
        <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Salvar e abrir ficha'}</button>
      </form>
    </div>
  );
}
