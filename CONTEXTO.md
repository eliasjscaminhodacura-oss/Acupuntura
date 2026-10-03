# CONTEXTO DO PROJETO — Ficha de Anamnese MTC (Método EliasJS · Caminho da Cura)

> Diário de bordo do projeto. **Atualizar ao final de cada dia de trabalho**,
> depois fazer commit e push. Quem abrir uma nova sessão (Claude ou pessoa)
> deve ler este arquivo primeiro.

## 1. Quem é o dono e como trabalhar com ele

- Terapeuta de Medicina Tradicional Chinesa (MTC). **Não sabe programar.**
- Explicar tudo em **português**, em passos simples, antes de pedir para
  clicar em algo ou copiar/colar qualquer coisa.
- Dar continuidade ao que já existe — **não recomeçar do zero**.
- Repositório: https://github.com/eliasjscaminhodacura-oss/acupuntura (branch `main`).
- Pasta local (Windows): `C:\Users\x178898\CLAUDE_PROJECTS\acupuntura`.

## 2. O que é o produto

Origem: planilha Excel "FICHA DE ANAMNESE - 2018 - CEATA" com 460 perguntas
de sintomas em 21 categorias, que mapeiam para 46 síndromes de MTC (cada uma
ligada a um órgão, a um dos 5 Elementos e a uma "alma" — Hun/Shen/Yi/Po/Zhi —
com leitura psicossomática). Virou primeiro um protótipo HTML (Artifact no
claude.ai, só com localStorage).

**Objetivo atual:** SaaS para vender acesso a outros terapeutas de MTC:
login individual, dados de pacientes 100% privados entre terapeutas,
robustez para cobrar (futuro: Stripe + domínio próprio).

## 3. Arquitetura

- **Next.js 16** (App Router, pasta `src/`) + **React 19** + TypeScript 5.
- **Supabase**: Auth (login dos terapeutas) + Postgres com Row Level Security
  (`auth.uid() = therapist_id`).
- **jsPDF 4**: PDF da ficha com radar dos 5 elementos desenhado à mão.
- Hospedagem planejada: **Vercel**.

Arquivos principais:

| Arquivo | Função |
|---|---|
| `src/data/app_data.json` | 460 perguntas, 46 síndromes, notas clínicas (fiéis à planilha) |
| `src/lib/ficha-types.ts`, `ficha-logic.ts` | tipos e cálculo de pontuação |
| `src/lib/pdf-export.ts` | geração do PDF |
| `src/components/FichaForm.tsx` | formulário da ficha (cálculo em tempo real, salvar, PDF) |
| `src/components/ElementRadar.tsx` | radar SVG dos 5 elementos |
| `src/proxy.ts` | protege rotas (redireciona para /login). No Next 16 "middleware" virou "proxy"; tem que ficar em `src/` |
| `src/lib/supabaseServer.ts` | cliente Supabase do servidor + `requireUser()` (2ª camada de proteção) |
| `src/lib/supabaseClient.ts` | cliente Supabase do navegador |
| `src/app/...` | páginas: login, signup, painel de pacientes, novo paciente, ficha |
| `supabase/schema.sql` | tabelas `patients` e `fichas` + RLS. Pode ser rodado mais de uma vez |

## 4. Ambiente local (Windows)

- Node.js 24 LTS instalado via `winget` (escopo do usuário) em 03/10/2026.
  Se o terminal não achar `node`/`npm`, feche e abra de novo o terminal
  (o PATH foi atualizado na instalação).
- Comandos: `npm install`, `npm run dev` (testar em http://localhost:3000),
  `npm run build` (validar), `npm run typecheck`.
- `.env.local` (NÃO vai para o GitHub) precisa de
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 5. Status das pendências

1. [x] Acesso de rede ao npm — funciona (03/10/2026).
2. [x] `npm install` + `npm run build` — compila sem erros.
3. [x] Correções/atualizações (ver histórico de 03/10/2026).
4. [ ] Criar projeto no Supabase e rodar `supabase/schema.sql` (passo a passo com o dono).
5. [ ] Criar `.env.local` e testar localmente: cadastro, login, paciente,
       ficha, radar, PDF, salvar e reabrir.
6. [ ] Publicar na Vercel com as variáveis de ambiente.
7. [ ] Depois: logomarca (trazer a imagem do protótipo antigo — `buildPdfBlob`
       já aceita `logoDataUrl`), cobrança (Stripe), domínio próprio.
8. [ ] **Antes de qualquer lançamento comercial: consultar advogado de LGPD**
       (o app trata dados de saúde de pacientes de terceiros).

## 6. Ideias / melhorias anotadas (ainda não feitas)

- No Supabase, conferir em Authentication → URL Configuration a "Site URL"
  (localhost no teste; endereço da Vercel depois), senão o link do e-mail de
  confirmação de cadastro aponta para o lugar errado.
- Tela de "esqueci minha senha".
- Editar/excluir paciente; histórico de várias fichas por paciente
  (hoje a página abre/atualiza sempre a ficha mais recente).
- Termos de uso / política de privacidade (junto com o advogado de LGPD).

## 7. Histórico (mais recente primeiro)

### 03/10/2026
- Sessão nova no Claude Code em Windows. Rede ao npm OK (sem o 403 de antes).
- Clonado o repositório; instalado Node.js 24 LTS.
- Primeiro build (Next 14.2.15) passou, mas `npm audit` acusou falhas
  críticas (inclusive uma que permitia burlar a proteção de login do
  middleware). **Atualizado tudo**: Next 16, React 19, @supabase/ssr 0.12,
  supabase-js 2.117, jsPDF 4 → 0 vulnerabilidades.
- Descoberto que o `middleware.ts` estava na raiz, mas com a pasta `src/`
  o Next o ignorava (proteção de rotas nunca rodava). Agora é `src/proxy.ts`.
  Testado: sem login, `/` e `/ficha/...` redirecionam para `/login`.
- Páginas do servidor agora também checam login (`requireUser`).
- `schema.sql`: pode rodar de novo sem erro; ficha só pode ser ligada a
  paciente do próprio terapeuta; função de `updated_at` com `search_path` fixo.
- Formulário da ficha mostra erro se o salvamento falhar.
- Criados `CONTEXTO.md` (este arquivo) e `CLAUDE.md` (carrega este arquivo
  automaticamente em toda sessão do Claude Code).
- Próximo passo: criar o projeto Supabase com o dono (pendência 4).
