# CONTEXTO DO PROJETO — Ficha de Anamnese MTC (Método EliasJS · Caminho da Cura)

> Diário de bordo do projeto. **Atualizar ao final de cada dia de trabalho**,
> depois fazer commit e push. Quem abrir uma nova sessão (Claude ou pessoa)
> deve ler este arquivo primeiro.

---

## ▶️ ONDE PARAMOS (leia isto primeiro)

**Última sessão: 03/10/2026.** O app **já funciona localmente** ligado ao
Supabase de verdade. O dono criou a conta de terapeuta dele, fez login e
cadastrou um paciente de teste, e a ficha abriu.

**Próxima coisa a fazer:**

1. Se for um computador novo (o dono vai instalar o Claude Code do zero
   num notebook), seguir a **seção 4 (Configurar um computador novo)**.
2. Terminar os testes locais que ficaram faltando (seção 6, item 5):
   marcar sintomas → conferir radar e síndromes → **Salvar ficha** →
   **Gerar PDF** e conferir o arquivo → voltar ao painel e **reabrir** a
   ficha (as marcações devem continuar) → **Sair** e entrar de novo.
3. Depois: publicar na Vercel (seção 6, item 6).

---

## 1. Quem é o dono e como trabalhar com ele

- Terapeuta de Medicina Tradicional Chinesa (MTC). **Não sabe programar** e
  não conhece termos técnicos.
- Explicar tudo em **português**, em passos simples e numerados, antes de
  pedir para clicar em algo ou copiar/colar qualquer coisa. Dizer o nome
  exato dos botões e onde ficam na tela.
- Quando ele precisar colar algo (ex.: script SQL), dá para copiar para a
  área de transferência dele com PowerShell `Set-Clipboard` e dizer
  "aperte Ctrl+V" — funcionou bem.
- Dar continuidade ao que já existe — **não recomeçar do zero**.
- Comandos que exigem login interativo (ex.: `git push` na 1ª vez) ele roda
  digitando `! comando` na caixa do Claude Code.

## 2. O que é o produto

Origem: planilha Excel "FICHA DE ANAMNESE - 2018 - CEATA" com 460 perguntas
de sintomas em 21 categorias, que mapeiam para 46 síndromes de MTC (cada uma
ligada a um órgão, a um dos 5 Elementos e a uma "alma" — Hun/Shen/Yi/Po/Zhi —
com leitura psicossomática). Virou primeiro um protótipo HTML (Artifact no
claude.ai, só com localStorage, sem login).

**Objetivo atual:** SaaS para vender acesso a outros terapeutas de MTC que
têm dificuldade no diagnóstico: login individual, dados de pacientes 100%
privados entre terapeutas, robustez para cobrar (futuro: Stripe + domínio
próprio).

## 3. Arquitetura e arquivos

- **Next.js 16.3** (App Router, pasta `src/`, Turbopack) + **React 19** +
  TypeScript 5 (não usar TS 7 — novo demais para o Next).
- **Supabase** (`@supabase/ssr` 0.12, `supabase-js` 2.117): Auth (login dos
  terapeutas) + Postgres com Row Level Security (`auth.uid() = therapist_id`).
- **jsPDF 4**: PDF da ficha com radar dos 5 elementos desenhado à mão.
- Hospedagem planejada: **Vercel** (região dos servidores deve ser São Paulo
  `gru1`, igual ao banco).
- **Next 16 mudou muita coisa**: antes de mexer em APIs do Next, ler a
  documentação que vem instalada em `node_modules/next/dist/docs/`.
  - "middleware" agora se chama **proxy** (`src/proxy.ts`, função `proxy`).
  - `cookies()` e `params` são assíncronos (usar `await`).
  - `next lint` não existe mais (o script virou `npm run typecheck`).
  - `next dev` acrescenta sozinho um bloco ao `CLAUDE.md` — é normal, pode
    commitar.

| Arquivo | Função |
|---|---|
| `src/data/app_data.json` | 460 perguntas, 46 síndromes, notas clínicas (fiéis à planilha) |
| `src/lib/ficha-types.ts`, `ficha-logic.ts` | tipos e cálculo de pontuação |
| `src/lib/pdf-export.ts` | geração do PDF (`buildPdfBlob` já aceita `logoDataUrl` para a futura logo) |
| `src/components/FichaForm.tsx` | formulário da ficha (cálculo em tempo real, salvar com aviso de erro, PDF) |
| `src/components/ElementRadar.tsx` | radar SVG dos 5 elementos |
| `src/components/LogoutButton.tsx` | botão Sair |
| `src/proxy.ts` | protege rotas (sem login → /login). Rotas públicas: /login, /signup, /auth/, /api/public |
| `src/lib/supabaseServer.ts` | cliente Supabase do servidor + `requireUser()` (2ª camada de proteção nas páginas) |
| `src/lib/supabaseClient.ts` | cliente Supabase do navegador |
| `src/app/page.tsx` | painel "Meus pacientes" |
| `src/app/login`, `src/app/signup` | entrar / criar conta de terapeuta |
| `src/app/auth/callback/route.ts` | destino do link de confirmação do e-mail de cadastro |
| `src/app/pacientes/novo/page.tsx` | cadastro de paciente |
| `src/app/ficha/[patientId]/page.tsx` | abre a ficha mais recente do paciente |
| `supabase/schema.sql` | tabelas `patients` e `fichas` + RLS. **Já executado** no Supabase. Pode ser rodado de novo sem problema |
| `CLAUDE.md` | lido automaticamente pelo Claude Code; importa este arquivo |

## 4. Configurar um computador novo (passo a passo)

O Claude deve fazer estes passos pelo dono, explicando cada um:

1. **Instalar o Node.js LTS** (no Windows, sem precisar de administrador):
   `winget install --id OpenJS.NodeJS.LTS -e --scope user --accept-package-agreements --accept-source-agreements --silent`
   Depois disso, o terminal pode não achar `node` até ser reaberto. No
   Bash do Claude Code dá para contornar acrescentando ao PATH a pasta
   `%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v*-win-x64`.
2. **Git**: verificar com `git --version`; se faltar,
   `winget install --id Git.Git -e`.
3. **Baixar o projeto**: `git clone https://github.com/eliasjscaminhodacura-oss/acupuntura.git`
   e abrir o Claude Code dentro dessa pasta.
4. Configurar o autor dos commits (só no repositório):
   `git config user.name "eliasjscaminhodacura-oss"` e
   `git config user.email "eliasjs.caminhodacura@gmail.com"`.
5. `npm install`.
6. **Criar o arquivo `.env.local`** na raiz (ele NÃO está no GitHub, de
   propósito) com:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://bgwyhakqicwmxxjgfbrn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
   ```
   A chave se pega em: supabase.com → projeto `anamnese-mtc` → ⚙️ Project
   Settings → **API Keys** → **Publishable key** (começa com
   `sb_publishable_`). Pedir ao dono para copiar e colar na conversa. Essa
   chave é pública por natureza (fica no navegador); **nunca** usar/pedir a
   "Secret key" nem a "service_role".
7. `npm run build` para conferir, depois `npm run dev` e abrir
   http://localhost:3000.
8. 1º `git push`: o dono roda `! git push origin main` para fazer login no
   GitHub pelo navegador (Git Credential Manager).

## 5. Supabase (já criado)

- Projeto: **anamnese-mtc**, região **South America (São Paulo) `sa-east-1`**
  (o 1º foi criado nos EUA por engano, apagado e recriado em SP — melhor
  para LGPD e velocidade).
- URL: `https://bgwyhakqicwmxxjgfbrn.supabase.co`
- `supabase/schema.sql` executado com sucesso em 03/10/2026.
- Testado: sem login, a API devolve lista vazia de pacientes (RLS ok).
- Conta de terapeuta do dono criada. O e-mail de confirmação não foi
  clicado/não chegou; a conta foi confirmada manualmente no SQL Editor com:
  `update auth.users set email_confirmed_at = now() where email = '...';`
- ⚠️ O envio de e-mail grátis do Supabase é limitado (~2–3 por hora) e cai
  em spam. **Antes de abrir para outros terapeutas**: configurar um SMTP
  próprio (ex.: Resend/Brevo) em Authentication → Emails → SMTP Settings, e
  ajustar Authentication → URL Configuration → **Site URL** e **Redirect
  URLs** (incluir `http://localhost:3000/**` e o endereço da Vercel
  `/auth/callback`).

## 6. Status das pendências

1. [x] Acesso de rede ao npm — funciona.
2. [x] `npm install` + `npm run build` — compila sem erros.
3. [x] Correções/atualizações de segurança (ver histórico).
4. [x] Projeto Supabase criado (São Paulo) e `schema.sql` executado.
5. [ ] Teste local completo. **Já OK:** cadastro de terapeuta, login,
       cadastro de paciente, abrir ficha. **Falta conferir:** radar/síndromes
       ao marcar sintomas, salvar, PDF, reabrir ficha salva, sair/entrar.
6. [ ] Publicar na Vercel (conectar o repositório GitHub; variáveis
       `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; depois
       ajustar Site URL/Redirect URLs no Supabase).
7. [ ] Depois: logomarca (trazer a imagem gerada por IA do protótipo antigo
       em HTML), cobrança (Stripe), domínio próprio.
8. [ ] **Antes de qualquer lançamento comercial: consultar advogado de LGPD**
       (o app trata dados de saúde de pacientes de terceiros). Levar também:
       termos de uso, política de privacidade, contrato de operador de dados.

## 7. Ideias / melhorias anotadas (ainda não feitas)

- SMTP próprio para e-mails de cadastro (ver seção 5).
- Tela de "esqueci minha senha".
- Editar/excluir paciente; histórico de várias fichas por paciente
  (hoje a página abre/atualiza sempre a ficha mais recente).
- Termos de uso / política de privacidade (junto com o advogado de LGPD).

## 8. Histórico (mais recente primeiro)

### 03/10/2026
- Sessão no Claude Code em Windows (computador de trabalho). Rede ao npm OK
  (sem o 403 da sessão anterior). Clonado o repositório; instalado Node.js
  24 LTS via winget. Python **não** está instalado nessa máquina (usar Node
  para scripts).
- Primeiro build (Next 14.2.15) passou, mas `npm audit` acusou falhas
  críticas (inclusive uma que permitia burlar a proteção de login do
  middleware). **Atualizado tudo**: Next 16, React 19, @supabase/ssr 0.12,
  supabase-js 2.117, jsPDF 4 → 0 vulnerabilidades.
- Descoberto que o `middleware.ts` estava na raiz, mas com a pasta `src/`
  o Next o ignorava (proteção de rotas nunca rodava). Agora é `src/proxy.ts`.
  Testado: sem login, `/` e `/ficha/...` redirecionam para `/login`.
- Páginas do servidor agora também checam login (`requireUser`).
- `schema.sql`: pode rodar de novo sem erro; ficha só pode ser ligada a
  paciente do próprio terapeuta; função de `updated_at` com `search_path`
  fixo. (Houve um bug: `$$` tinha virado `$` — corrigido.)
- Formulário da ficha mostra erro se o salvamento falhar.
- Login mostra mensagem específica quando o e-mail não foi confirmado.
- Nova rota `/auth/callback` para o link de confirmação do cadastro.
- Supabase criado em São Paulo, schema executado, `.env.local` configurado,
  app rodando em localhost:3000. Dono fez login e cadastrou paciente.
- Criados `CONTEXTO.md` (este arquivo) e `CLAUDE.md`. Adicionado
  `.gitattributes` (finais de linha LF).
- Dono parou para instalar o Claude Code no notebook dele.
