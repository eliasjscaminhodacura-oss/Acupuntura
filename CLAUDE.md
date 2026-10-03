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
