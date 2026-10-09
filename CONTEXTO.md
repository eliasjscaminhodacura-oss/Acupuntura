# CONTEXTO DO PROJETO — Método de Anamnese em MTC (by Elias JS · Caminho da Cura)

> Diário de bordo do projeto. **Atualizar ao final de cada dia de trabalho**,
> depois fazer commit e push. Quem abrir uma nova sessão (Claude ou pessoa)
> deve ler este arquivo primeiro.

---

## ▶️ ONDE PARAMOS (leia isto primeiro)

**Última sessão: 08/10/2026 (notebook do dono).** O app está publicado em
**https://acupuntura-eta.vercel.app** (Vercel; cada `git push` para `main`
atualiza o site em 1–2 min; o dono já usa com pacientes reais).
**Tudo o que foi feito em 08/10 está publicado** (`main`) e o dia foi
fechado (CONTEXTO atualizado, commit e push). Não há ramos pendentes nem
nada a rodar no Supabase. Na tela inicial ("Meus pacientes") há agora os
botões: + Novo paciente, Auriculoterapia, Analgesia em Acupuntura,
Dietoterapia Chinesa, Análise Facial e Fitoterapia Chinesa. Na ficha, depois
das síndromes, vêm os painéis: Análise facial, Fitoterapia, Orientação
alimentar e Auriculoterapia (todos salvos no Supabase e no PDF).

Feito em 08/10 (detalhes no histórico):
- **Mapa do corpo 2D ilustrado (estilo atlas)**, pedido do dono a partir de
  uma imagem de referência (de banco de imagens — não podia ser usada):
  corpo inteiro, frente e costas, com **músculos, ossos, artérias e veias**
  do BodyParts3D encaixados no corpo MakeHuman e os órgãos por cima;
  masculino ou feminino pelo sexo do paciente; contorno de holograma do
  corpo; pontos e órgãos comprometidos por cima. Também no PDF. Ver
  `scripts/corpo-ilustrado/LEIA-ME.md`.
- Antes disso (substituído pela ilustração, fica como reserva): órgãos com
  silhueta real e contorno 2D masculino/feminino no mapa antigo.
- **Auriculoterapia revisada com 4 livros** do dono (publicada): 130 pontos
  (eram 93), cuidados de segurança, fontes por ponto, referências,
  sugestões revisadas, regra que tira pontos contraindicados e protocolos
  prontos. O ramo `auriculo-revisao` já foi juntado com `main`.
- **Aba "Dietoterapia Chinesa"** (publicada; pedido do dono para divulgar o
  método): tela `/dietoterapia` de consulta sem paciente (por síndrome,
  alimentos, receitas, 5 Elementos).
- **Análise Facial segundo a MTC** (publicada): aba `/analise-facial`
  (5 tipos do Ling Shu 64 com rostos desenhados em SVG, mapas do rosto Su
  Wen 32 e Ling Shu 49, cores da tez, sinais) e painel na ficha (sinais
  marcados → Elemento e síndromes, comparando com a anamnese; vai no PDF).
  Coluna `fichas.facial` criada no Supabase pelo dono em 08/10.
- **Auriculoterapia com o Tratado de Souza** (publicada): 216 pontos
  (86 novos do Souza, 43 no dorso — códigos D1–D43; frente com letras
  LOe…, ATf…, COd… etc.), nome/nº de Souza nos equivalentes (campo
  `souza`), quadro "Analgesia" (cap. X resumido + 13 programas dos caps.
  XLIV/XLV em `auriculo.json → analgesia.programas`) e protocolo
  "+ Analgesia" no painel da ficha.
- **Aba "Analgesia em Acupuntura"** (`/analgesia`, publicada): base no livro
  de Sandra Silvério-Lopes (org.), *Analgesia por Acupuntura* (Omnipax,
  2013, CC BY-NC-ND) + artigos de Cassu & Luna (2004), Martini & Becker
  (2009) e Luiz et al. (2012). 6 partes: Fundamentos, Auriculoterapia
  (pontos analgésicos, 8 protocolos por tipo de dor, DORT, eletro na
  orelha), Pontos do corpo e gestantes, Eletroacupuntura, Outras técnicas
  (YNSA, quiro, magneto, laser) e Programas cirúrgicos (Souza). O quadro de
  Analgesia da aba Auriculoterapia virou atalho para esta aba.
- **Fitoterapia Chinesa** (`/fitoterapia`, publicada): 61 fórmulas clássicas
  ligadas às 46 síndromes e 133 ervas (sem doses), revisadas com Bensky &
  Gamble (ervas), Maciocia (síndrome → fórmula), Oliveira (2016), Miyamoto
  e apostila de remédios patenteados. Aba de consulta (Fórmulas, Ervas, Por
  síndrome, Fundamentos e segurança) e painel na ficha (sugere pelas
  síndromes; condições do paciente — gestante, anticoagulante, pressão
  alta, vegetariano — geram aviso e desmarcam a fórmula; vai no PDF).
  Coluna `fichas.fitoterapia` criada pelo dono em 08/10.

**Jeito de trabalhar combinado com o dono:** testar no `localhost:3000`
e, quando ele disser **"publicar"**, rodar `npm run build`, atualizar este
arquivo, commit e push (a Vercel publica sozinha). Trabalhos grandes: num
ramo separado até o "publicar". Conferir a publicação: no notebook,
`gh api repos/eliasjscaminhodacura-oss/Acupuntura/commits/<sha>/status`; no
trabalho (sem `gh` no PATH), ver se os arquivos novos respondem 200 no site.

**Próxima coisa a fazer:**

1. **Ao abrir no outro computador:** `git pull` e `npm install`. Conferir
   `npm run build`. Nada a rodar no Supabase. 09/10 (publicado): piscar do
   Ciclo no celular; **"Onde encontrar no Brasil"** na Fitoterapia
   (produtos Taimin e TaoZen). Se o dono mandar outras lojas, acrescentar
   em `scripts/produtos-brasil.mjs` e rodar `npm run fitoterapia:produtos`
   (atualizar a lista de tempos em tempos: as lojas mudam o catálogo).
   **Revisão das síndromes com os livros publicada (09/10)** — 69
   síndromes, com Pericárdio e Triplo Aquecedor (ver histórico 09/10).
   Dono ainda vai rever as dietas novas (`revisado: false`). O ramo
   `sindromes-livros` já foi juntado ao `main` e pode ser apagado.
   Se o `npm run dev` der erro de hidratação com dados velhos, encerrar o
   processo node da porta 3000 e ligar de novo.
2. **Auriculoterapia — Souza completo** (08/10): todos os 200 pontos e os
   13 programas de analgesia (caps. XLIV e XLV) estão no app. As Adendas
   (obesidade, tabagismo, alcoolismo) só têm figura sem nomes — não
   entraram. Posições dos pontos novos são aproximadas: o dono pode pedir
   ajustes (mudar `uv` e `npm run auriculo:posicionar`).
3. **Corpo ilustrado — se o dono pedir ajustes:** tronco um pouco estreito
   em relação à referência e uma pequena "ponta" na lateral do quadril
   feminino. Regras de encaixe em `scripts/corpo-ilustrado.mjs`
   (`armWeight`, faixa da virilha, pé girado, escala da cabeça). Ainda não
   entraram nervos, traqueia, esôfago e ureteres (o 3D continua só com os
   órgãos).
4. **Auriculoterapia, etapa 3:** registrar os pontos usados em cada sessão
   (no Registro de atendimentos).
5. Dietética: se o dono quiser revisar item a item, planilha
   `revisao/Dietetica-MTC-revisao.xlsx` → `npm run dietetica:importar`.
6. **Fitoterapia:** conteúdo gerado por `node scripts/fitoterapia-dados.mjs`
   (editar o script, não o JSON). Dono pode revisar fórmulas/ervas.
   **Análise Facial**: o dono deve revisar o
   conteúdo (`src/data/facial.json`, feito sem livros, pelos clássicos);
   se trouxer livros, conferir e citar.
7. Depois: receitas por IA (opcional), domínio próprio, Stripe, advogado de
   LGPD (seção 6). Lembrete: Vercel Hobby não permite uso comercial (Pro ao
   começar a cobrar).

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
| `src/lib/body-map.ts` + `src/components/BodyHologram.tsx` | mapa do corpo: contorno (neutro, masculino, feminino), 10 órgãos e 71 pontos (posições revisadas pelo dono em 05/10). `BodyHologram` mostra o 3D por padrão e o 2D (frente/costas) por botão ou se o aparelho não tiver WebGL. No 2D usa o **corpo ilustrado** quando existe; senão, o mapa antigo |
| `src/lib/corpo-ilustrado.ts` + `src/data/corpo-ilustrado*.json` + `public/corpo/ilustrado-*` | corpo ilustrado (atlas): fotos (webp na tela, jpg no PDF), contorno, órgãos e pontos no plano da imagem. Gerado por `npm run corpo:ilustrado` + página de fotos (ver `scripts/corpo-ilustrado/LEIA-ME.md`) |
| `src/lib/organs2d.ts` + `scripts/orgaos-2d.mjs` + `scripts/contorno.mjs` | silhuetas reais dos órgãos para o mapa antigo (reserva); `npm run corpo:orgaos2d` |
| `src/lib/body3d.ts` + `src/components/Body3D.tsx` | corpo 3D com **three.js** (no ramo `corpo-real`: pele = corpo realista MakeHuman; antes: formas simples). Usa as mesmas coordenadas 200x440 do 2D; os pontos são colocados na pele por raio (frente/costas). Camadas, enquadramentos (Frente/Costas/Lado/Cabeça/Tronco/Mãos/Pés), toque mostra nome do órgão/osso. Carregado sob demanda (`next/dynamic`, `ssr: false`) |
| `src/components/FichaForm.tsx` | ficha: resultado no final, salvamento automático (2 s), avanço automático entre partes, "voltar"/"corrigir dados" |
| `src/components/ScrollButtons.tsx` | botões flutuantes ↑ início / ↓ final (em todas as telas, via `layout.tsx`) |
| `src/lib/ficha-eventos.ts` + `src/components/VisitLog.tsx` | Registro de atendimentos: abertura, sessões de alteração e retornos (tabela `ficha_eventos`) |
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
| `src/data/auriculo.json` + `src/data/auriculo-3d.json` + `src/lib/auriculo.ts` | Auriculoterapia: pontos (nome, chinês, região, localização, indicações, e onde ficam numa vista: `uv` 0–100) e as posições 3D/2D geradas por `npm run auriculo:posicionar` (`scripts/auriculo-posicionar.mjs`, raios na malha). Para corrigir um ponto: mudar o `uv` e rodar o script |
| `public/auriculo/orelha.glb`, `frente.webp`, `dorso.webp` | orelha 3D (escaneamento "Human Ear" de thunk3d.scanner, Sketchfab, **CC BY 4.0 — crédito obrigatório no rodapé**), recortada/simplificada (~680 KB, meshopt), orelha ESQUERDA em mm (X para trás, Y para cima, Z para fora); imagens 2D renderizadas do mesmo modelo |
| `src/lib/ear3d.ts` + `src/components/Ear3D.tsx`, `Ear2D.tsx`, `EarAtlas.tsx`, `src/app/auriculoterapia/page.tsx` | tela de Auriculoterapia. `src/lib/holo.ts` = material "holograma" comum ao corpo e à orelha. `.glb` liberado no `proxy.ts` como as imagens |
| `src/components/DietAtlas.tsx` + `src/app/dietoterapia/page.tsx` | aba Dietoterapia Chinesa (consulta sem paciente: por síndrome com nome por extenso, alimentos com filtros, receitas, 5 Elementos, referências) |
| `src/data/facial.json` + `src/lib/facial.ts` + `src/components/FaceIllustration.tsx`, `FacialAtlas.tsx`, `FacialPanel.tsx` + `src/app/analise-facial/page.tsx` | Análise Facial: conteúdo (tipos, mapas, cores, sinais → síndromes), cálculo (`analisar`: constituição pelo formato do rosto; Elemento em destaque só sem empate), rostos desenhados em SVG (mesma pele de base com tom do Elemento — tez não é etnia), aba de consulta e painel da ficha (salvo em `fichas.facial`, texto no PDF) |
| `src/data/analgesia.json` + `src/components/AnalgesiaAtlas.tsx` + `src/app/analgesia/page.tsx` | aba Analgesia em Acupuntura (texto em analgesia.json; protocolos por dor e programas de Souza vêm de `auriculo.json → analgesia`; referências em `auriculo.json → referencias`) |
| `scripts/fitoterapia-dados.mjs` → `src/data/fitoterapia.json` + `src/lib/fitoterapia.ts` + `src/components/FitoAtlas.tsx`, `FitoPanel.tsx` + `src/app/fitoterapia/page.tsx` | Fitoterapia Chinesa: ervas (natureza, sabor, meridianos, ações, cuidados, alertas gest/anticoag/pressao/toxica/animal/mineral), fórmulas (composição sem dose, síndromes — a 1ª síndrome da lista = fórmula principal ★), painel da ficha (`fichas.fitoterapia`), PDF |
| `scripts/produtos-brasil.mjs` → `src/data/produtos-brasil.json` + `src/lib/produtos.ts` + `src/components/ProdutosBrasil.tsx` | Fórmulas à venda no Brasil (Taimin: 2 páginas do site, ervas em latim → tabela `LATIM`; TaoZen: dados públicos que o próprio site usa, `/api/apps/<id>/entities/Formula`). Guarda só nome, forma, composição e link (sem preço, texto ou foto). Liga cada produto à fórmula do app: "mesma" (mesmo nome-base) ou "parecida" (≥ 3 ervas em comum e Jaccard ≥ 0,5, sem contar alcaçuz/gengibre/tâmara). `EXTRAS` = ervas que não estão no app, com avisos (Xi Jiao proibido, Ying Su Ke e Ma Huang controlados etc.). Aba "Onde encontrar no Brasil", linha "No Brasil" no `FormulaCard` e etiqueta no `FitoPanel` |
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
- 08/10/2026: coluna `fichas.fitoterapia` (jsonb) criada no SQL Editor —
  fórmulas escolhidas na ficha. Já feito; conferido.
- 08/10/2026: coluna `fichas.facial` (jsonb) criada no SQL Editor —
  sinais da análise facial marcados na ficha. Já feito; conferido.
- 07/10/2026: coluna `fichas.auriculo` (jsonb) criada no SQL Editor —
  pontos de auriculoterapia escolhidos na ficha. Já feito.
- 06/10/2026: tabela `ficha_eventos` (registro de atendimentos, com RLS)
  criada no SQL Editor — bloco final do `schema.sql`. Já feito; conferido
  (sem login a API devolve lista vazia).
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
6. [x] Publicado na Vercel (06/10): https://acupuntura-eta.vercel.app —
       variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
       configuradas na Vercel; no Supabase, Site URL =
       `https://acupuntura-eta.vercel.app` e Redirect URLs =
       `https://acupuntura-eta.vercel.app/**` e `http://localhost:3000/**`.
       [x] Verificação em duas etapas da conta Vercel (07/10, chave nova).
7. [x] Logomarca (04/10: logo nova do dono em `public/logo.jpg`).
       [ ] Depois: cobrança (Stripe), domínio próprio.
8. [ ] **Antes de qualquer lançamento comercial: consultar advogado de LGPD**
       (o app trata dados de saúde de pacientes de terceiros). Levar também:
       termos de uso, política de privacidade, contrato de operador de dados.
       E perguntar sobre a Orientação alimentar (Lei 8.234/1991: prescrição
       dietética é privativa do nutricionista — o app usa "orientação
       segundo a MTC" e aviso no PDF). Levar também (08/10): **Fitoterapia
       Chinesa** (quem pode indicar ervas; regularização na Anvisa; o app
       não dá doses; 09/10: lista de produtos de lojas — Taimin, TaoZen —
       dentro do app) e **Analgesia** (anestesia cirúrgica é ato médico; o
       app fala em analgesia complementar, com aviso).
9. [x] Dietética revisada (06/10) com base em Hirsch (Manual do Herói) e
       Arantes (Dietoterapia Chinesa, Roca 2015); dono aprovou.
       [ ] Opcional: dono revisar a planilha item a item e importar
       (`npm run dietetica:importar`).

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
- **Analgesia/anestesia por acupuntura e auriculoterapia** (pedido do dono
  em 08/10: "interessa aos profissionais"). Base: Souza, cap. X (p. 81–83:
  vantagens da analgesia auricular, bloqueios) e cap. XLV (programas de
  analgesia aurículo-sistêmica, p. 345+). Ideia: seção/protocolos na
  Auriculoterapia. Cuidado: apresentar como analgesia complementar; anestesia
  cirúrgica é ato médico — levar ao advogado junto com o resto.
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

### 09/10/2026
- Computador de trabalho: `git pull` do trabalho de 08/10 + `npm install`;
  build OK.
- Celular do dono: o elemento mais comprometido no Ciclo não piscava (só o
  halo parado) porque o aparelho pede "menos movimento" (economia de
  bateria / remover animações) e o CSS desligava a animação. Agora, nesse
  caso, `.cycle-pulse` e `.holo-point-ring` piscam só com opacidade
  (`soft-blink`, sem crescer); só a varredura `.holo-scan` fica parada.
  Dono testou e aprovou; publicado.
- **Fitoterapia — "Onde encontrar no Brasil"** (pedido do dono, publicado):
  202 produtos (Taimin 16 remédios prontos; TaoZen 186 fórmulas em ervas
  para decocção), 44 iguais a fórmulas do app e 25 parecidos; 42 das 61
  fórmulas do app têm produto. A TaoZen às vezes lista menos ervas que a
  fórmula clássica (ex.: Xue Fu Zhu Yu Tang com 6 de 11): o app mostra o
  que falta e o que sobra. Sem produto: You Gui Wan, Shen Fu Tang, Yin Qiao
  San, Ba Zheng San, Bai Tou Weng Tang e outras (19). Levar ao advogado:
  citar marcas/lojas num app vendido (pode parecer propaganda) — aviso no
  app diz que as lojas não têm ligação e não é recomendação de marca.
- **Revisão das síndromes com livros de referência** (pedido do dono; ramo
  `sindromes-livros`). Livros na pasta `D:\` do computador do trabalho:
  McDonald & Penner, *Zang Fu Syndromes* (1994, texto em inglês); Maciocia,
  *Os Fundamentos da Medicina Chinesa* 2ª ed. (texto; cap. 32–42 = padrões
  dos órgãos); Auteroche, *O Diagnóstico na Medicina Chinesa*; apostila *Os
  8 Princípios*; Maciocia, *Ginecologia* parte 2 (OCR sem acentos). *A
  Prática da Medicina Chinesa* e o 2º arquivo dos *Fundamentos* são só
  imagem (não lidos). Texto extraído com `pdfjs-dist` na pasta temporária.
  Feito por `scripts/sindromes-livros.mjs` (rodar uma vez; já rodado):
  - 17 síndromes novas (códigos: DefYnF, FinvBP, FinvE, FlmMente,
    RnaoRecQi, FrioCanalF, DefFrioID, CalorIG, SecIG, EstXueE, CalorXue,
    EstgQiC, CalorP, DefXueBP, UmdCalorE, DefFrioB, CalorQiF) com notas
    clínicas, dieta (`dietetica.json`, `revisado: false`), aurículo e
    fórmulas → 63 síndromes.
  - Nomes corrigidos (códigos iguais, fichas salvas continuam valendo):
    ColapsQiBP = "Afundamento Qi do BP", DefQiVB = "Deficiência da VB",
    ObstID = "Dor por Qi no ID", UmdFrioIG = "Frio no IG". Tirados sintomas
    de canal (braço, ombro, dente, torcicolo, reumatismo) do ID/IG e
    "pressão alta" da VB; "transpiração profusa e fria" passou do BP para o
    Colapso do Yang do C.
  - 29 perguntas novas (ansiedade, assusta-se, indecisão, confusão mental,
    voz fraca, resfria-se fácil, falta de ar ao esforço, arrotos, vômito
    claro, borborigmos, alterna fezes, queimação no ânus, sangue/areia na
    urina, urgência, gotejamento, queda de cabelo, língua Vermelha etc.) →
    489 perguntas.
  - **Pulso e língua passaram a pontuar** (antes os 10 pulsos e várias
    línguas não estavam ligados a nada), pelos 8 Princípios.
  - **Padrões combinados** (`src/lib/combinados.ts`): 15 pares de
    McDonald/Maciocia, mostrados no resultado e no PDF quando as duas
    síndromes estão entre as 6 mais fortes (≥ 2 pontos).
  - Fitoterapia: 16 fórmulas novas (Yi Guan Jian, Tong Xie Yao Fang, Si Ni
    San, Di Tan Tang, Ren Shen Hu Tao Tang, Nuan Gan Jian, Xiao Jian Zhong
    Tang, Ma Zi Ren Wan, Run Chang Wan, Shi Xiao San, Dan Shen Yin, Qing
    Jing San, Ban Xia Hou Po Tang, Xie Bai San, Ba Zhen Tang, Dan Zhi Xiao
    Yao San) e 10 ervas → 77 fórmulas, 143 ervas; todas as 63 síndromes têm
    fórmula. Lista de produtos refeita (52 iguais, 25 parecidas).
  - Simulação de 3 casos: resultado coerente (ex.: "barriga solta com o
    nervoso + pulso em Corda" → Fígado invade o BP em 1º).
  - Ao publicar, fichas antigas podem mudar um pouco de resultado.
- **Gráfico "Órgãos mais comprometidos" corrigido** (dono testou a paciente
  Brenda Lia): a % era relativa ao órgão mais forte (= 100%) e não batia
  com o ciclo. Agora cada órgão mostra a % de todos os sinais marcados,
  agrupado por elemento (título do elemento com a mesma % do ciclo; os
  órgãos de um elemento somam essa %). Rótulos do corpo 2D/3D e do PDF
  também. `intensity` continua só para o desenho (`src/lib/body-map.ts`).
- **Pericárdio e Triplo Aquecedor** (tabela do dono: Fogo = Coração e
  Pericárdio / ID e TA). `scripts/pericardio-ta.mjs` (já rodado):
  5 síndromes do Pericárdio de Maciocia, *Fundamentos* cap. 33 (DefXueCS,
  FgCS, FlmFgCS, EstgQiCS, EstXueCS), ligadas só aos sintomas que as
  diferenciam do Coração (tórax, falta de ar, mãos frias, menstruação,
  relacionamentos) para não contar o Coração em dobro; e "Via das águas do
  TA" (AguasTA: inchaços, edema, urina diminuída), porque os livros não têm
  síndrome Zang Fu própria do TA. Pontos, fórmulas (Gui Pi, Xie Xin, Wen
  Dan, Ban Xia Hou Po, Xue Fu Zhu Yu, Wu Ling San), dieta e aurículo →
  69 síndromes, todas com fórmula. Não há figura de CS/TA no corpo 2D/3D.
  O rótulo do Fogo no ciclo continua "Coração / Intestino Delgado".

### 08/10/2026
- **Fitoterapia Chinesa:** feita primeiro pelos clássicos e logo revisada com
  5 materiais do dono (Bensky & Gamble — conferência automática da natureza
  pelo campo "Properties"; Maciocia — busca de cada fórmula e da síndrome
  próxima no texto; apostila; dissertação; amostra do Miyamoto). Segurança:
  sem doses, Mu Tong só de Akebia (nunca Aristolochia), sem Zhu Sha
  (mercúrio), Shen Fu Tang marcada como emergência.
- **Analgesia em Acupuntura:** o dono mandou 6 PDFs (2 eram cópias). O livro
  de Silvério-Lopes tem texto extraível, mas com acentos quebrados (LaTeX:
  "´a", "¸c") — corrigir com sed ao ler. O artigo de Luiz et al. só deu para
  ler como imagem. Conteúdo resumido com nossas palavras, com fonte por bloco.
- **Souza, Tratado de Auriculoterapia** (scans do dono em Downloads:
  "Documento sem título 08-10-2026*.pdf"): lidos os 200 pontos (p. 97–205;
  texto nas páginas ímpares, fotos nas pares) e os caps. X, XLIV e XLV.
  Notas de leitura (resumo, não trecho) ficaram na pasta temporária da
  sessão. Ferramentas: `pdfjs-dist` + `@napi-rs/canvas` para virar
  imagem e recortar; imagem com os pontos por cima para conferir posições.
  Um `next dev` antigo seguia rodando escondido com dados velhos (erro de
  hidratação "215 vs 130"): encerrar o processo da porta 3000 e religar.
- **Análise Facial segundo a MTC** (pedido do dono, com "fotos" dos tipos):
  explicado que fotos de pessoas reais não podem ser usadas (direitos e
  imagem); o dono escolheu ilustrações desenhadas, consulta + painel na
  ficha, e conteúdo pelos clássicos (sem livros). Na 1ª versão dos desenhos
  cada tipo tinha uma cor de pele muito diferente (o tipo Água parecia uma
  pessoa negra) — corrigido para a mesma pele de base com leve tom do
  Elemento, com aviso de que tez não é etnia.
- **Aba Dietoterapia Chinesa** (`/dietoterapia`, `DietAtlas.tsx`): mesma
  base do painel da ficha, para consulta e divulgação. Nomes das síndromes
  por extenso só nesta tela ("Defic. Yin do R" → "Deficiência de Yin do
  Rim"). Botões "em breve" de Fitoterapia e Análise Facial na tela inicial.
- **Auriculoterapia revisada com 4 livros** (pasta
  `Documents\ELIAS\ACUPUNTURA`): Souza, *Tratado de Auriculoterapia*
  (FIB, 2001; PDF escaneado, lido como imagem, faltam as p. 36–207);
  Scavone, *Manual de Auriculoterapia* (2016; pontos chineses p. 207–243,
  pontos mestres franceses p. 166–204); Neves, *Manual prático de
  auriculoterapia* (2009; OCR ruim); SMS-Rio, *Auriculoterapia na APS*
  (2024, CC BY-NC). Feito: `auriculo.json` com `referencias`, campos
  `cuidado` e `fontes` por ponto (sem `fontes` = GB/T + Scavone); 37
  pontos novos com códigos de região + letra (LOa Ansiedade, TGa Fome, ATa
  Tálamo, COa Pulmão superior etc.), posicionados por régua a partir dos
  pontos GB/T; sinônimos nos antigos (Olho 1/Visão 1, Ponto Zero/Diafragma,
  Neurastenia = LO4, Cérebro = AT2,3,4i, Asma = AT1,2,4i); cuidados:
  Suprarrenal (pressão alta), Rim (cálculo renal), Simpático (distensão
  abdominal), Útero/Pelve/Abdômen (gestantes). `auriculo-sugestoes.json`
  ganhou `evitar` (tira pontos da sugestão por sintoma/síndrome, com aviso)
  e `protocolos` (Triângulo Cibernético, Ansiedade, Dor osteomuscular,
  Tabagismo — botões no painel da ficha). Componente
  `AuriculoRefs.tsx`; PDF mostra cuidados e referências. Scripts usados
  ficaram na pasta temporária (não no projeto).
- Notebook: `git pull` do trabalho de 07/10 + `npm install`; build OK.
- Pedido do dono: órgãos no mapa 2D "mais reais". 1ª versão: silhuetas
  reais (do 3D, pela régua inversa do `body-warp`) e foto dos órgãos com
  luz; contorno 2D masculino/feminino. O dono não gostou e mandou uma imagem
  de atlas (banco de imagens — direitos autorais, não usada).
- **Corpo ilustrado** (escolha do dono: corpo inteiro): músculos (323
  peças), ossos (203), artérias e veias do BodyParts3D encaixados no
  MakeHuman. Tronco pelo `makeFit` (sem a trava do períneo:
  `clampFloor: false`, medido sem os braços); braços e pernas pelas juntas
  dos ossos (úmero, rádio/ulna, falange; fêmur, tíbia, pé), com mistura nas
  emendas; o pé do atlas (escaneado deitado, pé esticado) é girado no
  tornozelo; cabeça com escala própria. As cadeias do corpo começam onde o
  tronco põe ombro e quadril (evita "abas"). Fotos ortográficas tiradas no
  navegador (3 passadas: ossos+músculos, vasos, órgãos); pontos de
  `build()` do `corpo-real.mjs` (agora importável sem efeitos).
- No Windows, o `tar` do Git Bash não abre o zip do atlas ("C:" vira
  servidor): `orgaos-bp3d.mjs` usa o `tar.exe` do sistema.
- PDF com o corpo ilustrado: ~1 MB.
- Dica: textos com crases (`) em comandos do Bash viram comandos — para
  editar este arquivo, usar um script em arquivo, não `node -e`.

### 07/10/2026
- Computador de trabalho: `git pull` do trabalho de 06/10 + `npm install`;
  build OK.
- Vercel: verificação em duas etapas trocada por chave nova (botão
  "Replace" em Account Settings → Authentication), app Google
  Authenticator no celular do dono; ele anotou os códigos de recuperação.
  A chave antiga foi apagada do celular (testado com janela anônima).
- **Auriculoterapia, etapa 1** (publicada): dono escolheu mapa chinês +
  pontos brasileiros (lista a enviar) e a versão completa (atlas +
  sugestão pela ficha + registro da sessão). Orelha escolhida pelo dono
  entre 3 modelos CC BY: escaneamento real "Human Ear" (thunk3d.scanner,
  CC BY 4.0, crédito no rodapé). Conta Sketchfab criada via Epic Games.
  Processamento (recorte elíptico, vista lateral, simplificação com
  gltf-transform) feito com ferramentas na pasta temporária; resultado em
  `public/auriculo/`. `.glb` liberado no `proxy.ts` (como as imagens).
- **Auriculoterapia, etapa 2** (publicada): pontos sugeridos na ficha;
  coluna `fichas.auriculo` criada no Supabase pelo dono.
- **Corpo realista, etapas 1 e 2** (publicadas): MakeHuman (CC0) montado
  por script (malha base + alvos de gênero + esqueleto para pôr em posição
  anatômica); pontos levados por `body-warp.ts`; órgãos do BodyParts3D
  (licença atual CC BY 4.0) e útero/ovários de "Pelvic Organs from MRI"
  (baixado pelo dono). Correção: o períneo do atlas é medido pelos ísquios
  (as coxas se encostam na pele do atlas). Material holograma passou para
  `src/lib/holo.ts`.
- Conferência visual feita com Chrome sem tela controlado por script
  (puppeteer-core e páginas de teste temporárias, já apagadas).
- ⚠️ Este computador ficou sem memória duas vezes: o Claude Code desligou o
  `npm run dev` e as ferramentas de imagem. Fechar programas antes.

### 06/10/2026
- Notebook: `git pull` do trabalho de 05/10 + `npm install`; build OK.
- **Site publicado na Vercel:** https://acupuntura-eta.vercel.app. A conta
  foi criada pelo GitHub; a tela opcional de verificação em duas etapas foi
  cancelada (chave vazou para uma aba de pesquisa) — refazer depois. No
  passo das variáveis, colar as duas linhas `NOME=valor` no campo Key
  funcionou (a Vercel separa sozinha). NÃO usar a integração "Adicionar
  Supabase" da Vercel (criaria outro banco). Supabase: Site URL e Redirect
  URLs ajustados. Dono testou login e fichas no site: OK.
- **Registro de atendimentos** (pedido do dono: data e hora da abertura,
  das alterações e dos retornos): tabela `ficha_eventos`
  (`kind` = abertura | alteracao | retorno, `note`, `started_at`,
  `ended_at`); `src/lib/ficha-eventos.ts` e `src/components/VisitLog.tsx`.
  Alterações seguidas com menos de 30 min de intervalo estendem a mesma
  sessão (não lotam o histórico). Botão "Registrar retorno do paciente" com
  observação opcional; histórico completo; datas também no PDF. Horário
  sempre de Brasília (`America/Sao_Paulo`). Se a tabela não existir, a
  ficha continua funcionando e avisa.
- Botões flutuantes ↑ (voltar ao início) e ↓ (ir para o final) em todas as
  telas (`src/components/ScrollButtons.tsx`, no `layout.tsx`); cada um só
  aparece quando faz sentido. Pedido do dono para navegar na ficha longa.
- **Dietética revisada com dois livros** do dono (PDFs em
  `DocumentosELIASLIVROSACUPUNTURA`): Sonia Hirsch, *Manual do Herói* (tabela
  Categorix: natureza/sabor/elemento; Banco da Cozinha; contraindicações) e
  Andrea Arantes, *Dietoterapia Chinesa* (cap. 25). Texto extraído com
  `pdfjs-dist` (o Read do Claude não renderiza PDF nesta máquina). Regra:
  mudar só quando os dois livros concordam; manter quando divergem. Feito:
  13 naturezas (aveia Fresco; manga/tomate/aspargo Frio; melão/pepino/
  abacaxi Fresco; alho Morno; porco Fresco; pimentão Quente; boi e couve
  Neutro; ostra Fresco — os livros dizem fria, mas assim ela continua em
  DefJgR/DefXueC, decisão do dono); 24 avisos "Atenção:" no campo `obs`
  (aparecem ao passar o mouse no alimento do painel); algas na restrição
  Gestante; "(omita se houver catarro)" no mel/açúcar de 4 receitas;
  campo `fontes` no dietetica.json. Planilha de revisão reexportada.
  Direitos autorais: só resumos com nossas palavras, nunca trechos.
- Dica: para o dono colar SQL, ele costuma copiar outra coisa no caminho —
  copiar de novo com `Set-Clipboard` e pedir para não copiar nada antes do
  Ctrl+V.

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
