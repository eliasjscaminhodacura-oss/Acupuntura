'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function SignupPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="container" style={{ maxWidth: 380 }}>
        <div className="panel">
          <p>Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login.</p>
          <Link href="/login">Ir para o login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 380 }}>
      <div className="brand">
        <div>
          <div className="kicker">Método EliasJS · Caminho da Cura</div>
          <h1>Criar conta de terapeuta</h1>
        </div>
      </div>
      <form className="panel" onSubmit={handleSubmit}>
        <label htmlFor="name">Nome completo</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Senha</label>
        <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <p style={{ fontSize: 14 }}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </div>
  );
}
