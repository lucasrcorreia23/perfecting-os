-- Perfecting v1 — schema inicial, triggers e RLS.
-- Aplicar via Supabase CLI (supabase db push) ou SQL Editor do dashboard.

-- =============================================================================
-- Enums
-- =============================================================================

create type public.user_role       as enum ('interno', 'cliente');
create type public.workflow_stage  as enum ('diagnosticar','priorizar','construir','calibrar','executar','medir');
create type public.activity_status as enum ('pendente','em_andamento','concluida');
create type public.client_status   as enum ('ativo','em_risco','pausado','encerrado');

-- =============================================================================
-- Tabelas
-- =============================================================================

create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  company             text,
  email               text,
  phone               text,           -- com DDI, usado para WhatsApp (wa.me)
  status              public.client_status not null default 'ativo',
  stage               public.workflow_stage not null default 'diagnosticar',
  stage_entered_at    timestamptz not null default now(),
  stage_deadline_days int not null default 25,   -- SLA por etapa ("25 dias")
  notes               text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        public.user_role not null default 'interno',
  client_id   uuid references public.clients(id) on delete set null, -- só p/ role 'cliente'
  preferences jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  stage       public.workflow_stage not null,   -- etapa a que a atividade pertence
  title       text not null,
  description text,
  status      public.activity_status not null default 'pendente',
  due_date    date,                              -- prazo da atividade
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.client_files (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  size_bytes   bigint,
  mime_type    text,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Feed de "Atividades Recentes" da Home (log de eventos)
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.clients(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  type       text not null,  -- 'cliente_criado' | 'etapa_alterada' | 'atividade_criada'
                             -- | 'atividade_concluida' | 'arquivo_enviado' | 'arquivo_excluido'
  payload    jsonb not null default '{}',  -- ex.: { "from": "diagnosticar", "to": "priorizar" }
  created_at timestamptz not null default now()
);

create index on public.activities (client_id, stage);
create index on public.client_files (client_id);
create index on public.events (created_at desc);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Todo signup cria um profile 'interno' (v1). Usuários 'cliente' serão criados
-- por convite numa fase futura.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'interno');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mudou de etapa → reinicia a contagem de dias na etapa.
create or replace function public.set_stage_entered_at()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_entered_at = now();
  end if;
  return new;
end;
$$;

create trigger clients_stage_entered_at
  before update on public.clients
  for each row execute function public.set_stage_entered_at();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — funções auxiliares (security definer evita recursão nas policies
-- de profiles, que consultam a própria tabela profiles)
-- =============================================================================

create or replace function public.is_interno() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'interno') $$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as
$$ select client_id from profiles where id = auth.uid() $$;

-- =============================================================================
-- RLS — policies
-- Matriz: interno = acesso total; cliente = somente o próprio cliente.
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.activities   enable row level security;
alter table public.client_files enable row level security;
alter table public.events       enable row level security;

-- profiles: interno lê/atualiza todos; cliente somente o próprio
create policy "profiles_select_interno" on public.profiles
  for select to authenticated using (is_interno());
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_interno" on public.profiles
  for update to authenticated using (is_interno()) with check (is_interno());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- clients: interno tudo; cliente select do próprio
create policy "clients_select_interno" on public.clients
  for select to authenticated using (is_interno());
create policy "clients_insert_interno" on public.clients
  for insert to authenticated with check (is_interno());
create policy "clients_update_interno" on public.clients
  for update to authenticated using (is_interno()) with check (is_interno());
create policy "clients_delete_interno" on public.clients
  for delete to authenticated using (is_interno());
create policy "clients_select_cliente" on public.clients
  for select to authenticated using (id = my_client_id());

-- activities: interno tudo; cliente select do próprio cliente
create policy "activities_all_interno" on public.activities
  for all to authenticated using (is_interno()) with check (is_interno());
create policy "activities_select_cliente" on public.activities
  for select to authenticated using (client_id = my_client_id());

-- client_files: interno tudo; cliente select/insert do próprio cliente
create policy "client_files_all_interno" on public.client_files
  for all to authenticated using (is_interno()) with check (is_interno());
create policy "client_files_select_cliente" on public.client_files
  for select to authenticated using (client_id = my_client_id());
create policy "client_files_insert_cliente" on public.client_files
  for insert to authenticated with check (client_id = my_client_id());

-- events: interno select/insert; cliente select do próprio cliente
create policy "events_select_interno" on public.events
  for select to authenticated using (is_interno());
create policy "events_insert_interno" on public.events
  for insert to authenticated with check (is_interno());
create policy "events_select_cliente" on public.events
  for select to authenticated using (client_id = my_client_id());
