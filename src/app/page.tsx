import Link from 'next/link';
import { requireUser } from '@/lib/supabaseServer';
import LogoutButton from '@/components/LogoutButton';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          <Logo size={64} />
          <div>
            <div className="kicker">Método de Anamnese em MTC by Elias JS · Caminho da Cura</div>
            <h1 style={{ margin: '2px 0 0' }}>Meus pacientes</h1>
          </div>
        </div>
        <LogoutButton />
      </div>

      <div className="panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href="/pacientes/novo">
          <button>+ Novo paciente</button>
        </Link>
        <Link href="/auriculoterapia">
          <button className="secondary">Auriculoterapia</button>
        </Link>
        <Link href="/analgesia">
          <button className="secondary">Analgesia em Acupuntura</button>
        </Link>
        <Link href="/dietoterapia">
          <button className="secondary">Dietoterapia Chinesa</button>
        </Link>
        <Link href="/fitoterapia">
          <button className="secondary">Fitoterapia Chinesa</button>
        </Link>
        <Link href="/analise-facial">
          <button className="secondary">Análise Facial</button>
        </Link>
      </div>

      <div className="panel">
        {(!patients || patients.length === 0) && (
          <p style={{ color: '#6b675c' }}>Nenhum paciente cadastrado ainda.</p>
        )}
        {patients?.map((p) => (
          <div className="patient-row" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              {p.phone && <div style={{ fontSize: 13, color: '#6b675c' }}>{p.phone}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/pacientes/${p.id}/editar`}>
                <button className="secondary small">Corrigir dados</button>
              </Link>
              <Link href={`/ficha/${p.id}`}>
                <button className="secondary">Abrir ficha</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
