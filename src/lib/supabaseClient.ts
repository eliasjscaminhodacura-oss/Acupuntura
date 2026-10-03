'use client';

import { createBrowserClient } from '@supabase/ssr';

// Cliente Supabase para uso no navegador (componentes "use client").
// As credenciais vêm de variáveis de ambiente públicas (seguras para o
// navegador porque o acesso aos dados é controlado pelas políticas de
// Row Level Security no banco, não pela chave em si).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
