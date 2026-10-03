-- Esquema do banco para o app "Ficha de Anamnese — Método EliasJS"
-- Execute este arquivo no painel do Supabase em: SQL Editor > New query > colar tudo > Run
-- (Pode ser executado mais de uma vez sem problemas.)
--
-- Modelo:
--  - Cada terapeuta é um usuário do Supabase Auth (auth.users), criado
--    automaticamente quando ele se cadastra no app (/signup).
--  - "patients" guarda os pacientes de cada terapeuta.
--  - "fichas" guarda cada ficha de anamnese preenchida (os dados do
--    questionário em JSON, mais os resultados calculados).
--  - Row Level Security (RLS) garante, no próprio banco, que um
--    terapeuta NUNCA veja pacientes ou fichas de outro terapeuta —
--    mesmo que haja um erro de programação no app, o banco bloqueia.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients enable row level security;

drop policy if exists "therapists_select_own_patients" on public.patients;
create policy "therapists_select_own_patients"
  on public.patients for select
  using (auth.uid() = therapist_id);

drop policy if exists "therapists_insert_own_patients" on public.patients;
create policy "therapists_insert_own_patients"
  on public.patients for insert
  with check (auth.uid() = therapist_id);

drop policy if exists "therapists_update_own_patients" on public.patients;
create policy "therapists_update_own_patients"
  on public.patients for update
  using (auth.uid() = therapist_id)
  with check (auth.uid() = therapist_id);

drop policy if exists "therapists_delete_own_patients" on public.patients;
create policy "therapists_delete_own_patients"
  on public.patients for delete
  using (auth.uid() = therapist_id);

-- ---------------------------------------------------------------------
-- Fichas de anamnese
-- ---------------------------------------------------------------------
create table if not exists public.fichas (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  chief_complaint text,
  answers jsonb not null default '{}'::jsonb,       -- respostas do questionário (chave do item -> marcado/não)
  syndrome_scores jsonb not null default '{}'::jsonb, -- contagens por síndrome
  element_scores jsonb not null default '{}'::jsonb,  -- contagens pelos 5 elementos
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fichas enable row level security;

drop policy if exists "therapists_select_own_fichas" on public.fichas;
create policy "therapists_select_own_fichas"
  on public.fichas for select
  using (auth.uid() = therapist_id);

drop policy if exists "therapists_insert_own_fichas" on public.fichas;
create policy "therapists_insert_own_fichas"
  on public.fichas for insert
  with check (
    auth.uid() = therapist_id
    and exists (select 1 from public.patients p
                where p.id = patient_id and p.therapist_id = auth.uid())
  );

drop policy if exists "therapists_update_own_fichas" on public.fichas;
create policy "therapists_update_own_fichas"
  on public.fichas for update
  using (auth.uid() = therapist_id)
  with check (
    auth.uid() = therapist_id
    and exists (select 1 from public.patients p
                where p.id = patient_id and p.therapist_id = auth.uid())
  );

drop policy if exists "therapists_delete_own_fichas" on public.fichas;
create policy "therapists_delete_own_fichas"
  on public.fichas for delete
  using (auth.uid() = therapist_id);

-- ---------------------------------------------------------------------
-- Atualiza "updated_at" automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists fichas_set_updated_at on public.fichas;
create trigger fichas_set_updated_at
  before update on public.fichas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------------------
create index if not exists idx_patients_therapist on public.patients(therapist_id);
create index if not exists idx_fichas_therapist on public.fichas(therapist_id);
create index if not exists idx_fichas_patient on public.fichas(patient_id);
