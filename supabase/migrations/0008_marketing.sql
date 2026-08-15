-- Perfecting v1 — módulo Marketing: CMS de blog + funis de qualificação.
-- Consumido pelo site externo via app/api/publico/*, que usa a SERVICE ROLE key.
-- Nenhuma tabela aqui tem policy para o role `anon`: o site nunca fala com o
-- PostgREST direto, sempre com o nosso route handler.
-- Espelha src/lib/database.types.ts — alterar juntos.

-- =============================================================================
-- Enums
-- =============================================================================

create type public.post_status       as enum ('rascunho','publicado','arquivado');
create type public.funnel_status     as enum ('rascunho','publicado','arquivado');
create type public.lead_status       as enum ('novo','em_contato','qualificado','descartado','convertido');
create type public.lead_qualificacao as enum ('frio','morno','quente');

-- Obs.: o TIPO de campo da pergunta (texto_curto, escolha_unica, escala…) NÃO
-- vira enum de PG — vive dentro do jsonb `questions`, onde um enum não
-- constrangeria nada. Fica só em src/lib/marketing-funnel.ts, validado lá.

-- =============================================================================
-- Posts (CMS de blog)
-- =============================================================================

create table if not exists public.marketing_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,                 -- resumo (card do site + fallback de og:description)
  body_md         text not null default '',
  status          public.post_status not null default 'rascunho',
  published_at    timestamptz,          -- futuro => "agendado" (estado derivado)
  cover_path      text,                 -- caminho no bucket marketing-media
  cover_alt       text,
  seo_title       text,
  seo_description text,
  canonical_url   text,
  noindex         boolean not null default false,
  tags            text[] not null default '{}',
  reading_minutes int not null default 1,   -- calculado no save (readingMinutes())
  author_id       uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint marketing_posts_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Invariante da qual a API pública depende: publicado SEMPRE tem data.
  constraint marketing_posts_published_at_required
    check (status <> 'publicado' or published_at is not null)
);

create index if not exists marketing_posts_author_id_idx
  on public.marketing_posts (author_id);
-- Índice parcial casado com a query quente da API pública.
create index if not exists marketing_posts_live_idx
  on public.marketing_posts (published_at desc) where status = 'publicado';
create index if not exists marketing_posts_tags_idx
  on public.marketing_posts using gin (tags);
create index if not exists marketing_posts_updated_at_idx
  on public.marketing_posts (updated_at desc);

-- =============================================================================
-- Funis (rascunho editável) + versões publicadas (imutáveis)
-- =============================================================================

create table if not exists public.marketing_funnels (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  status           public.funnel_status not null default 'rascunho',
  questions        jsonb not null default '[]',   -- RASCUNHO em edição
  submit_label     text not null default 'Enviar',
  success_message  text not null
    default 'Recebemos suas respostas. Em breve entraremos em contato.',
  redirect_url     text,
  score_thresholds jsonb not null default '{"morno": 40, "quente": 70}',
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint marketing_funnels_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint marketing_funnels_questions_array
    check (jsonb_typeof(questions) = 'array')
);

create table if not exists public.marketing_funnel_versions (
  id           uuid primary key default gen_random_uuid(),
  funnel_id    uuid not null references public.marketing_funnels(id) on delete cascade,
  version      int  not null,
  questions    jsonb not null,            -- snapshot imutável do schema publicado
  score_max    int  not null default 0,   -- teto congelado (funnelMaxScore)
  thresholds   jsonb not null,            -- limiares congelados junto
  published_by uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (funnel_id, version),
  constraint marketing_funnel_versions_questions_array
    check (jsonb_typeof(questions) = 'array')
);

-- FK circular: a coluna só pode existir depois da tabela de versões. Um único
-- `create table` com as duas FKs falharia.
alter table public.marketing_funnels
  add column if not exists published_version_id uuid
    references public.marketing_funnel_versions(id) on delete set null;

create index if not exists marketing_funnels_created_by_idx
  on public.marketing_funnels (created_by);
create index if not exists marketing_funnels_published_version_id_idx
  on public.marketing_funnels (published_version_id);
create index if not exists marketing_funnel_versions_funnel_id_idx
  on public.marketing_funnel_versions (funnel_id);
create index if not exists marketing_funnel_versions_published_by_idx
  on public.marketing_funnel_versions (published_by);

-- =============================================================================
-- Leads (uma linha por envio do formulário no site externo)
-- =============================================================================

create table if not exists public.marketing_leads (
  id                uuid primary key default gen_random_uuid(),
  funnel_id         uuid not null references public.marketing_funnels(id) on delete cascade,
  funnel_version_id uuid references public.marketing_funnel_versions(id) on delete set null,
  -- Campos promovidos via `maps_to` das perguntas (viram o cliente na conversão)
  name              text,
  email             text,
  phone             text,
  company           text,
  role_title        text,
  answers           jsonb not null default '{}',  -- { [questionId]: valor }
  score             int not null default 0,
  score_max         int not null default 0,       -- congelado da versão
  score_pct         int not null default 0,
  qualificacao      public.lead_qualificacao not null default 'frio',
  status            public.lead_status not null default 'novo',
  client_id         uuid references public.clients(id) on delete set null,
  notes             text,
  source_url        text,                         -- página do site que enviou
  utm               jsonb not null default '{}',
  ip_hash           text,                         -- HMAC do IP (LGPD: nunca o IP cru)
  user_agent        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint marketing_leads_score_pct_range check (score_pct between 0 and 100),
  constraint marketing_leads_answers_object  check (jsonb_typeof(answers) = 'object')
);

create index if not exists marketing_leads_funnel_id_idx
  on public.marketing_leads (funnel_id);
create index if not exists marketing_leads_funnel_version_id_idx
  on public.marketing_leads (funnel_version_id);
create index if not exists marketing_leads_client_id_idx
  on public.marketing_leads (client_id);
create index if not exists marketing_leads_created_at_idx
  on public.marketing_leads (created_at desc);
create index if not exists marketing_leads_status_idx
  on public.marketing_leads (status);
-- Throttle no banco (funciona entre instâncias serverless, ≠ Map em memória).
create index if not exists marketing_leads_throttle_idx
  on public.marketing_leads (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists marketing_leads_email_idx
  on public.marketing_leads (lower(email)) where email is not null;

-- =============================================================================
-- Triggers (reusa public.set_updated_at() do 0001)
-- =============================================================================

create trigger marketing_posts_set_updated_at
  before update on public.marketing_posts
  for each row execute function public.set_updated_at();

create trigger marketing_funnels_set_updated_at
  before update on public.marketing_funnels
  for each row execute function public.set_updated_at();

create trigger marketing_leads_set_updated_at
  before update on public.marketing_leads
  for each row execute function public.set_updated_at();

-- Versões são imutáveis: sem updated_at, sem trigger.

-- =============================================================================
-- RLS — marketing é 100% interno. Nada para `cliente`, NADA para `anon`.
-- A API pública usa a service role key, que ignora RLS por design; estas
-- policies são o backstop da UI do OS, que fala com anon key + sessão.
-- =============================================================================

alter table public.marketing_posts           enable row level security;
alter table public.marketing_funnels         enable row level security;
alter table public.marketing_funnel_versions enable row level security;
alter table public.marketing_leads           enable row level security;

create policy "marketing_posts_all_interno" on public.marketing_posts
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "marketing_funnels_all_interno" on public.marketing_funnels
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "marketing_funnel_versions_all_interno" on public.marketing_funnel_versions
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "marketing_leads_all_interno" on public.marketing_leads
  for all to authenticated using (is_interno()) with check (is_interno());

-- =============================================================================
-- Storage — bucket público de mídia do blog
-- Caminho: marketing-media/posts/{post_id}/{uuid}-{nome-sanitizado}.ext
-- Separado de client-files e restrito a imagens até 5 MB pelo próprio Storage.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media', 'marketing-media', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
on conflict (id) do nothing;

create policy "marketing_media_select_public" on storage.objects
  for select to public
  using (bucket_id = 'marketing-media');

create policy "marketing_media_insert_interno" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketing-media' and public.is_interno());

create policy "marketing_media_update_interno" on storage.objects
  for update to authenticated
  using (bucket_id = 'marketing-media' and public.is_interno())
  with check (bucket_id = 'marketing-media' and public.is_interno());

create policy "marketing_media_delete_interno" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marketing-media' and public.is_interno());
