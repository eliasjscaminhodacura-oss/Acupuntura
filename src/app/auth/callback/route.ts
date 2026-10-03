import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

// Destino do link de confirmação enviado por e-mail no cadastro:
// troca o código recebido por uma sessão e leva o terapeuta ao painel.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  // Link inválido/expirado (ou aberto em outro navegador): a conta pode já
  // estar confirmada, então basta fazer login normalmente.
  return NextResponse.redirect(`${origin}/login`);
}
