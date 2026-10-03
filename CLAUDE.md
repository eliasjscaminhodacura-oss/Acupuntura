# Instruções para o Claude Code

Leia o contexto completo do projeto antes de qualquer coisa:

@CONTEXTO.md

## Regras de trabalho

- O dono não programa: responda em português, em passos simples, e explique
  antes de pedir qualquer clique ou copiar/colar.
- Continue a partir do que existe; não recomece o projeto.
- Ao final de cada dia de trabalho (ou quando o dono pedir "fechar o dia"):
  atualizar a seção de status e o histórico em `CONTEXTO.md`, fazer commit e
  push para `main`.
- Antes de commitar mudanças de código, rodar `npm run build` e confirmar
  que passa.
- Nunca commitar `.env.local` nem chaves do Supabase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
