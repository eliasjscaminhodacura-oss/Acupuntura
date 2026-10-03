import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="kicker" style={{ fontSize: 12, textTransform: 'uppercase', color: '#6b675c' }}>
            Método EliasJS · Caminho da Cura
          </div>
          <h1 style={{ margin: '2px 0 0' }}>Meus pacientes</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="panel">
        <Link href="/pacientes/novo">
          <button>+ Novo paciente</button>
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
            <Link href={`/ficha/${p.id}`}>
              <button className="secondary">Abrir ficha</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
