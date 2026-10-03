# Ficha de Anamnese MTC — Método EliasJS · Caminho da Cura

Aplicativo web para terapeutas de Medicina Tradicional Chinesa (MTC)
preencherem a Ficha de Anamnese, visualizarem o diagnóstico pelos 5
Elementos e gerarem o PDF — com **login individual** e **dados de
pacientes totalmente privados entre terapeutas** (multiusuário / SaaS).

## Como foi construído

- **Next.js 16** (React 19) — o site/aplicativo em si.
- **Supabase** — login dos terapeutas (Auth) e banco de dados dos
  pacientes e fichas (Postgres), com *Row Level Security* garantindo
  que um terapeuta nunca veja dados de outro.
- **jsPDF** — geração do PDF da ficha, incluindo o gráfico dos 5
  elementos.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), entre na sua conta e
   clique em **New project**.
2. Escolha um nome (ex: "anamnese-mtc"), uma senha forte para o banco
   e a região mais próxima (ex: South America - São Paulo).
3. Aguarde a criação (1–2 minutos).
4. Vá em **SQL Editor** → **New query**, cole todo o conteúdo do
   arquivo [`supabase/schema.sql`](./supabase/schema.sql) deste
   projeto e clique em **Run**. Isso cria as tabelas de pacientes e
   fichas, já com a proteção de privacidade entre terapeutas.
5. Vá em **Project Settings → API**. Copie:
   - **Project URL**
   - **anon public key**

### 2. Configurar as variáveis de ambiente

Na raiz do projeto, copie o arquivo `.env.local.example` para
`.env.local` e cole os dois valores copiados no passo anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Instalar dependências e testar localmente

Requer o [Node.js](https://nodejs.org) (versão LTS) instalado. No terminal,
na pasta do projeto:

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000` no navegador. A primeira tela
pedirá para criar uma conta de terapeuta (`/signup`).

### 4. Publicar na internet (Vercel — recomendado)

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta
   GitHub.
2. Clique em **Add New → Project** e selecione o repositório
   `acupuntura`.
3. Em **Environment Variables**, adicione as duas mesmas variáveis do
   passo 2 (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Clique em **Deploy**. Em poucos minutos o app estará disponível em
   um endereço `https://acupuntura-xxxx.vercel.app` — que depois pode
   ser trocado por um domínio próprio (ex: `www.caminhodacura.com.br`)
   nas configurações do projeto na Vercel.

## Estrutura do projeto

```
src/
  app/            páginas (login, cadastro, lista de pacientes, ficha)
  proxy.ts        protege as páginas: quem não fez login vai para /login
  components/     formulário da ficha, gráfico de 5 elementos, etc.
  lib/            lógica de pontuação, geração de PDF, clientes Supabase
  data/           app_data.json — todas as 460 perguntas, 46 síndromes
                  e textos clínicos extraídos da planilha original
supabase/
  schema.sql      script para criar as tabelas e as regras de privacidade
```

## Próximos passos sugeridos

- Adicionar a logomarca (o arquivo de imagem ainda precisa ser colocado
  em `src/app/` e referenciado no cabeçalho — foi usado antes em outra
  versão do projeto).
- Cobrança/assinatura (ex: Stripe), caso o plano seja vender o acesso a
  outros terapeutas.
- Consultar um advogado especializado em LGPD antes do lançamento
  comercial, já que o app processa dados de saúde de pacientes de
  terceiros.
