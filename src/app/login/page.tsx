'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.code === 'email_not_confirmed'
          ? 'Sua conta ainda não foi confirmada. Abra o e-mail de confirmação (veja também o Spam) e clique no link.'
          : 'E-mail ou senha incorretos.'
      );
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 380 }}>
      <div className="brand">
        <div>
          <div className="kicker">Método EliasJS · Caminho da Cura</div>
          <h1>Entrar</h1>
        </div>
      </div>
      <form className="panel" onSubmit={handleSubmit}>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Senha</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p style={{ fontSize: 14 }}>
        Ainda não tem conta? <Link href="/signup">Cadastre-se</Link>
      </p>
    </div>
  );
}
