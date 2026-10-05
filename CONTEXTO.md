# CONTEXTO DO PROJETO — Método de Anamnese em MTC (by Elias JS · Caminho da Cura)

> Diário de bordo do projeto. **Atualizar ao final de cada dia de trabalho**,
> depois fazer commit e push. Quem abrir uma nova sessão (Claude ou pessoa)
> deve ler este arquivo primeiro.

---

## ▶️ ONDE PARAMOS (leia isto primeiro)

**Última sessão: 05/10/2026 (computador de trabalho).** O dono vai
continuar **no notebook dele**. O app funciona localmente, ligado ao
Supabase. Feito nesta sessão (detalhes no histórico de 05/10):
- Mapa do corpo em **holograma 3D** (gira; camadas pele, ossos, órgãos,
  circulação, nervos, respiração, digestão, urinário, pontos). Aprovado.
- **Orientação Alimentar segundo a MTC** (Dietética), etapas 1 a 3: base de
  141 alimentos + orientação para as 46 síndromes + por Elemento, painel no
  fim do resultado da ficha, **42 receitas** com ingredientes/quantidades/
  preparo, **PDF do paciente** (A5) e botão "Enviar para o paciente".
  Coluna `fichas.diet` já criada no Supabase. Dono aprovou ("Perfeito").

**Próxima coisa a fazer (no notebook):**

1. **Atualizar o notebook:** `git pull` e `npm install` (dependências
   novas: `three`, `exceljs`). Conferir `npm run build`. O `.env.local`
   do notebook já existe (configurado em 04/10). Nada a rodar no Supabase.
2. **Terminar a conta na Vercel.** No computador do trabalho o SMS de
   verificação (celular do dono, final …7878) nunca chegou. Retomar em
   https://vercel.com/signup → "Continue with GitHub" → código SMS. Se não
   chegar: outro celular; plano B é a Netlify (servidores nos EUA no plano
   grátis). O `vercel.json` (região `gru1`) já está no repositório. Depois
   seguir a seção 6, item 6 (variáveis, Site URL/Redirect URLs no Supabase).
   Lembrete: plano Hobby não permite uso comercial (Pro ao começar a cobrar).
3. **Revisão da Dietética pelo dono:** planilha
   `revisao/Dietetica-MTC-revisao.xlsx` (abas Leia-me, Síndromes,
   Alimentos, Elementos, Receitas, Legenda). Quando ele salvar:
   `npm run dietetica:importar` (mostra comentários e problemas; só grava
   se não houver problemas), `npm run build`, commit e push.
4. Depois: etapa 4 opcional da Dietética (receitas por IA), logomarca no
   domínio próprio, Stripe, advogado de LGPD (seção 6).

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
- **jsPDF 4**: PDF da ficha (Ciclo dos 5 Elementos, mapa do corpo e
  sintomas em caixinhas) desenhado à mão, sem imagens além da logo.
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
| `src/data/app_data.json` | 460 perguntas, 46 síndromes, notas clínicas (fiéis à planilha; rótulos com acentos corrigidos em 04/10 — as `key` não mudaram, exceto 2 chaves duplicadas da Tosse) |
| `src/lib/ficha-types.ts`, `ficha-logic.ts` | tipos, cálculo de pontuação, agrupamento (Normal sempre primeiro; itens avulsos juntados num grupo sem título), filtro por sexo (`dataForSex`), regra do "Sem alterações / Normal" (`normalGroups`, `applyNormalDefaults`) |
| `src/lib/pdf-export.ts` | geração do PDF: logo em todas as páginas, Ciclo, síndromes, mapa do corpo, sintomas em 3 colunas igual à tela |
| `src/lib/cycle5.ts` + `src/components/ElementCycle.tsx` | Ciclo dos 5 Elementos (Sheng/Ke), gráfico principal do resultado |
| `src/lib/radar3d.ts` + `src/components/ElementRadar.tsx` | gráfico 3D dos 5 elementos (botão "Ver em 3D") |
| `src/lib/body-map.ts` + `src/components/BodyHologram.tsx` | mapa do corpo: contorno, 10 órgãos e 71 pontos (posições revisadas pelo dono em 05/10). `BodyHologram` mostra o 3D por padrão e o 2D (frente/costas) por botão ou se o aparelho não tiver WebGL; o PDF continua usando o 2D |
| `src/lib/body3d.ts` + `src/components/Body3D.tsx` | corpo 3D estilizado com **three.js** (formas simples, sem modelos externos nem licenças). Usa as mesmas coordenadas 200x440 do 2D; os pontos são colocados na pele por raio (frente/costas). Camadas, enquadramentos (Frente/Costas/Lado/Cabeça/Tronco/Mãos/Pés), toque mostra nome do órgão/osso. Carregado sob demanda (`next/dynamic`, `ssr: false`) |
| `src/components/FichaForm.tsx` | ficha: resultado no final, salvamento automático (2 s), avanço automático entre partes, "voltar"/"corrigir dados" |
| `src/components/PatientForm.tsx` | cadastro e correção do paciente (com Sexo) — usado em `/pacientes/novo` e `/pacientes/[id]/editar` |
| `src/components/Logo.tsx` + `public/logo.jpg` | logo do dono (recortada em círculo na tela e no PDF) |
| `src/components/LogoutButton.tsx` | botão Sair |
| `src/proxy.ts` | protege rotas (sem login → /login). Rotas públicas: /login, /signup, /auth/, /api/public |
| `src/lib/supabaseServer.ts` | cliente Supabase do servidor + `requireUser()` (2ª camada de proteção nas páginas) |
| `src/lib/supabaseClient.ts` | cliente Supabase do navegador |
| `src/app/page.tsx` | painel "Meus pacientes" |
| `src/app/login`, `src/app/signup` | entrar / criar conta de terapeuta |
| `src/app/auth/callback/route.ts` | destino do link de confirmação do e-mail de cadastro |
| `src/app/pacientes/novo/page.tsx`, `src/app/pacientes/[patientId]/editar/page.tsx` | cadastro / correção de paciente |
| `src/app/ficha/[patientId]/page.tsx` | abre a ficha mais recente do paciente |
| `src/data/dietetica.json` + `src/lib/dietetica.ts` + `src/components/DietPanel.tsx` + `src/lib/pdf-dieta.ts` | Orientação alimentar segundo a MTC: conteúdo (revisado pelo dono via planilha), lógica (síndromes escolhidas — automático = 3 mais fortes; tira do "Prefira" o que alguma síndrome manda evitar ou o que tem natureza térmica oposta; restrições do paciente), painel no fim do resultado e PDF A5 do paciente |
| `supabase/schema.sql` | tabelas `patients` e `fichas` + RLS. **Já executado** no Supabase. Pode ser rodado de novo sem problema |
| `CLAUDE.md` | lido automaticamente pelo Claude Code; importa este arquivo |

## 4. Configurar um computador novo (passo a passo)

O Claude deve fazer estes passos pelo dono, explicando cada um:

1. **Instalar o Node.js LTS** (no Windows, sem precisar de administrador):
   `winget install --id OpenJS.NodeJS.LTS -e --scope user --accept-package-agreements --accept-source-agreements --silent`
   Depois disso, o terminal pode não achar `node` até ser reaberto. No
   Bash do Claude Code dá para contornar acrescentando ao PATH a pasta
   `%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v*-win-x64`.
2. **Git e GitHub CLI**: verificar com `git --version`; se faltar,
   `winget install --id Git.Git -e` e `winget install --id GitHub.cli -e`.
   Logo depois de instalar, o PATH do Claude Code ainda não os enxerga: usar
   `C:\Program Files\Git\cmd` e `C:\Program Files\GitHub CLI\gh.exe`.
   Login: `gh auth login --hostname github.com --git-protocol https --web`
   rodado em segundo plano — ele mostra um código de 8 letras; o dono abre
   https://github.com/login/device, cola o código e autoriza. Depois
   `gh auth setup-git` (assim o `git push` funciona sem pedir senha).
   No notebook (04/10) o terminal integrado do app não abriu; isso funcionou.
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
7. `npm run build` para conferir, depois `npm run dev` (em segundo plano;
   o Claude Code desliga processos de fundo após 2 h — se cair, é só ligar
   de novo) e abrir http://localhost:3000 no Chrome do dono. O navegador
   do app não tem o login do dono: telas internas só ele vê.

## 5. Supabase (já criado)

- Projeto: **anamnese-mtc**, região **South America (São Paulo) `sa-east-1`**
  (o 1º foi criado nos EUA por engano, apagado e recriado em SP — melhor
  para LGPD e velocidade).
- URL: `https://bgwyhakqicwmxxjgfbrn.supabase.co`
- `supabase/schema.sql` executado com sucesso em 03/10/2026.
- 05/10/2026: coluna `fichas.diet` (jsonb) criada no SQL Editor — guarda as
  escolhas da Orientação alimentar. Já feito.
- 04/10/2026: coluna `patients.sex` ('M'/'F') criada no SQL Editor (as 3
  linhas `alter table` que estão no `schema.sql`). Já feito.
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
5. [x] Teste local completo (04/10): login, paciente, ficha, salvar,
       PDF, reabrir — o dono testou e aprovou.
6. [ ] Publicar na Vercel (conectar o repositório GitHub; variáveis
       `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; depois
       ajustar Site URL/Redirect URLs no Supabase). `vercel.json` pronto;
       falta a conta (SMS de verificação não chegou no trabalho, 05/10).
7. [x] Logomarca (04/10: logo nova do dono em `public/logo.jpg`).
       [ ] Depois: cobrança (Stripe), domínio próprio.
8. [ ] **Antes de qualquer lançamento comercial: consultar advogado de LGPD**
       (o app trata dados de saúde de pacientes de terceiros). Levar também:
       termos de uso, política de privacidade, contrato de operador de dados.
       E perguntar sobre a Orientação alimentar (Lei 8.234/1991: prescrição
       dietética é privativa do nutricionista — o app usa "orientação
       segundo a MTC" e aviso no PDF).
9. [ ] Dono revisar a planilha da Dietética (alimentos, síndromes,
       elementos, 42 receitas) e importar (`npm run dietetica:importar`).

## 7. Ideias / melhorias anotadas (ainda não feitas)

- **Dietética Chinesa — "Orientação alimentar segundo a MTC"** (plano
  aprovado pelo dono em 05/10/2026):
  1. [x] Base de conhecimento: `src/data/dietetica.json` (141 alimentos com
     natureza/sabor/Elemento/órgãos/ações/alertas; orientação por síndrome
     — princípio, explicação ao paciente, Prefira/Evite, preparo — para as
     46; orientação por Elemento). Planilha de revisão:
     `npm run dietetica:exportar` / `npm run dietetica:importar`
     (`scripts/dietetica-planilha.mjs`). **Aguardando revisão do dono.**
  2. [x] Painel "Orientação alimentar" no fim do resultado da ficha (vem
     preenchido pelas síndromes; terapeuta ajusta; restrições do paciente:
     diabetes, hipertensão, gestação, alergias, vegetariano), PDF próprio
     do paciente (1 coluna, letra grande, para celular) e botão "Enviar para
     o paciente" (Web Share → WhatsApp). Feito em 05/10: `DietPanel.tsx`,
     `lib/dietetica.ts` (junta as síndromes, conflito por natureza
     térmica, restrições), `lib/pdf-dieta.ts` (A5, ~250 KB),
     `lib/download.ts`. Escolhas salvas em `fichas.diet` (jsonb).
  3. [x] Biblioteca de receitas: 42 receitas em `dietetica.json` →
     `receitas` (ingredientes com quantidade e alimento ligado, opcionais,
     passos, "por que ajuda", síndromes indicadas; ≥ 2 por síndrome). O app
     sugere até 8 compatíveis (tira as que levam algo a evitar/barrado ou de
     natureza oposta), marca 3 automaticamente; vão para o PDF. Aba
     "Receitas" na planilha. **Aguardando revisão do dono.**
  4. [ ] (Opcional) Receitas geradas por IA, aprovadas pelo terapeuta
     antes de enviar (custo por uso; recurso do plano pago).
  - ⚠️ Nunca chamar de "dieta"/"prescrição" (Lei 8.234/1991: prescrição
    dietética é privativa do nutricionista). Aviso no PDF. Levar ao advogado.
- **Vercel Hobby (grátis) não permite uso comercial**: ao começar a cobrar,
  mudar para o plano Pro (~US$ 20/mês).

- SMTP próprio para e-mails de cadastro (ver seção 5).
- Tela de "esqueci minha senha".
- Excluir paciente; histórico de várias fichas por paciente
  (hoje a página abre/atualiza sempre a ficha mais recente). Editar
  paciente já existe (04/10).
- PDF tem 9–10 páginas (mostra todas as opções, como a tela). Se o dono
  quiser mais curto: mostrar só as categorias com alguma alteração.
- O dono revisar as posições dos pontos no mapa do corpo.
- Termos de uso / política de privacidade (junto com o advogado de LGPD).

## 8. Histórico (mais recente primeiro)

### 05/10/2026
- Computador de trabalho: baixado o trabalho do notebook (git pull); build OK.
- Vercel: criado `vercel.json` (região São Paulo `gru1`). O cadastro do
  dono travou no SMS de verificação (não chegou no trabalho) — fica para
  casa, no notebook.
- Dietética, etapa 1: `src/data/dietetica.json` + planilha
  `revisao/Dietetica-MTC-revisao.xlsx` para o dono revisar. Nova
  dependência de desenvolvimento `exceljs` (com `overrides` de `uuid`
  ^11 para zerar o npm audit).
- Dietética, etapa 2: painel "Orientação alimentar segundo a MTC" no fim do
  resultado + PDF do paciente (A5) + botão "Enviar para o paciente".
  Testado com página temporária (já apagada) e PDF conferido.
- Dietética, etapa 3: receitas como "receita de cozinha" (pedido do dono)
  no painel e no PDF; "Como preparar" virou "Dicas de preparo".
- Demonstração enquanto se programa: `next.config.js` aceita
  `NEXT_DIST_DIR`. Cópia fixa: `NEXT_DIST_DIR=.next-demo npm run build` e
  `NEXT_DIST_DIR=.next-demo npx next start -p 3000` (os builds normais vão
  para `.next` e não a afetam). Esse build acrescenta `.next-demo` ao
  `tsconfig.json` — desfazer com `git checkout tsconfig.json`.
- Um `npm run dev` antigo ficou rodando escondido e passou a mostrar
  "Jest worker encountered 2 child process exceptions" (porque o `.next`
  foi recompilado por baixo dele). Solução: encerrar o processo node na
  porta 3000 e ligar de novo.
- Dono confirmou que os 71 pontos estão corretos.
- **Mapa do corpo em 3D** (pedido do dono: explorar órgãos, ossos e sistemas
  sem óculos especiais, mantendo os pontos). Escolhido o "holograma
  estilizado" (leve, sem licença) em vez de atlas anatômico realista.
  Nova dependência: `three` 0.186 (+ `@types/three`).
- Testado com Chrome invisível controlado por script (página de teste
  temporária, já apagada): camadas, voo da câmera, seleção de ponto (B23 nas
  costas), toque no fígado, tela de celular.
- ⚠️ Este computador tem pouca memória (~1,4 GB livre): o Claude Code chegou
  a desligar o `npm run dev` sozinho. Fechar programas antes de ligar o app.

### 04/10/2026
- Notebook do dono configurado do zero (Git, GitHub CLI, Node 24 LTS,
  clone em `Documentos\Acupuntura`, `.env.local` com a Publishable key).
- Ficha: rótulos com acentos/espaços corrigidos; Tosse dividida em 3 grupos
  (e corrigido bug: os 3 "Sem alterações" da Tosse tinham a mesma chave);
  Cólica e Corrimento em grupos próprios; "Sem alterações / Normal" sempre
  primeiro, **já vem marcado** e se desmarca ao escolher uma alteração (volta
  sozinho se nenhuma alteração ficar marcada); títulos dos grupos em negrito;
  perguntas em 3 colunas; avanço automático para a próxima parte (pode
  desligar); itens avulsos juntados sem título repetido.
- Paciente ganhou **Sexo** (coluna no Supabase): masculino não vê genitais
  femininos, Menstruação nem os itens de cefaleia ligados ao fluxo menstrual.
  Botões "← Meus pacientes" e "Corrigir dados do paciente".
- **Resultado no final** da ficha: Ciclo dos 5 Elementos (com frase simples
  para leigos; "Ver em 3D" mostra o gráfico 3D), mapa do corpo com visual de
  holograma (órgãos acendem pela cor do elemento; pontos das síndromes em
  amarelo, o ponto clicado fica vermelho com anel pulsando) e síndromes.
- **Salvamento automático** 2 s após cada alteração (o dono perdeu
  marcações ao atualizar a página antes disso).
- PDF: data dd/mm/aaaa, sexo, logo em todas as páginas, Ciclo, página do
  mapa do corpo, sintomas em caixinhas iguais à tela.
- Logo nova do dono; título em todas as telas: "Método de Anamnese em MTC
  by Elias JS · Caminho da Cura".

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
