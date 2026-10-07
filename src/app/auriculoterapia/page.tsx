import Link from 'next/link';
import { requireUser } from '@/lib/supabaseServer';
import LogoutButton from '@/components/LogoutButton';
import Logo from '@/components/Logo';
import EarAtlas from '@/components/EarAtlas';

export const dynamic = 'force-dynamic';

export default async function AuriculoterapiaPage() {
  await requireUser();

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          <Logo size={64} />
          <div>
            <div className="kicker">Método de Anamnese em MTC by Elias JS · Caminho da Cura</div>
            <h1 style={{ margin: '2px 0 0' }}>Auriculoterapia</h1>
          </div>
        </div>
        <LogoutButton />
      </div>

      <p style={{ margin: '0 0 12px' }}>
        <Link href="/"><button className="secondary small">← Meus pacientes</button></Link>
      </p>

      <EarAtlas />
    </div>
  );
}
