-- Perfecting v1 — Calculadora ROI (encaminhada por link tokenizado).
-- O visitante acessa app/(calculadora)/calculadora/[token] SEM login; página e
-- autosave usam a SERVICE ROLE key via src/lib/api/calculator-queries.ts.
-- Nenhuma policy para `anon` — o browser nunca fala com o PostgREST direto.
-- Espelha src/lib/database.types.ts — alterar juntos.

-- =============================================================================
-- Links (um por proposta encaminhada a um cliente)
-- =============================================================================

create table if not exists public.calculator_links (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  label           text,                        -- nome interno opcional ("Proposta agosto")
  -- Token derivado por HMAC(CALCULATOR_LINK_SECRET, id:token_version); só o
  -- hash SHA-256 fica no banco. Rotação = token_version + 1 (mata a URL antiga).
  token_version   int  not null default 1,
  token_hash      text not null unique,
  -- Proposta definida pelo interno no modal (REMOVIDA na 0010: a proposta
  -- passou a ser montada pelo próprio visitante, dentro do state).
  config          jsonb not null,
  -- Estado do visitante (autosave). Formato atual em src/lib/calculadora/estado.ts.
  state           jsonb not null default '{}',
  -- Cache para a listagem interna; o detalhe recomputa do state (fonte da verdade).
  result_summary  jsonb,
  expires_at      timestamptz not null,
  -- Status do link é DERIVADO destas colunas (revogado > expirado > concluído > ativo).
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users(id) on delete set null,
  submitted_at    timestamptz,                 -- 1º envio; edição posterior não reseta
  first_access_at timestamptz,
  last_access_at  timestamptz,
  access_count    int  not null default 0,     -- sessões deduplicadas (30 min), não pageviews
  last_saved_at   timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint calculator_links_config_object check (jsonb_typeof(config) = 'object'),
  constraint calculator_links_state_object  check (jsonb_typeof(state)  = 'object')
);

create index if not exists calculator_links_client_id_idx
  on public.calculator_links (client_id, created_at desc);
create index if not exists calculator_links_created_by_idx
  on public.calculator_links (created_by);

-- =============================================================================
-- Eventos de rastreio (imutáveis — sem updated_at, sem trigger)
-- =============================================================================

create table if not exists public.calculator_link_events (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid not null references public.calculator_links(id) on delete cascade,
  -- text extensível (precedente events.type): criado | acesso | passo_concluido |
  -- enviado | editado_pos_envio | revogado | prorrogado | link_rotacionado |
  -- vinculado_a_cliente
  type       text not null,
  payload    jsonb not null default '{}',
  actor_id   uuid references auth.users(id) on delete set null, -- null = visitante
  ip_hash    text,                        -- HMAC do IP (LGPD: nunca o IP cru)
  user_agent text,
  created_at timestamptz not null default now(),
  constraint calculator_link_events_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists calculator_link_events_link_idx
  on public.calculator_link_events (link_id, created_at desc);
-- Dedupe de "acesso" (janela de 30 min) e coalescência de "editado_pos_envio".
create index if not exists calculator_link_events_dedupe_idx
  on public.calculator_link_events (link_id, type, created_at desc);
-- Throttle no banco (funciona entre instâncias serverless, ≠ Map em memória).
create index if not exists calculator_link_events_throttle_idx
  on public.calculator_link_events (ip_hash, created_at desc) where ip_hash is not null;

-- =============================================================================
-- Triggers (reusa public.set_updated_at() do 0001)
-- =============================================================================

create trigger calculator_links_set_updated_at
  before update on public.calculator_links
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — calculadora é 100% interna na UI. Nada para `cliente`, NADA para `anon`.
-- A página pública usa a service role key, que ignora RLS por design; estas
-- policies são o backstop da UI do OS, que fala com anon key + sessão.
-- =============================================================================

alter table public.calculator_links       enable row level security;
alter table public.calculator_link_events enable row level security;

create policy "calculator_links_all_interno" on public.calculator_links
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "calculator_link_events_all_interno" on public.calculator_link_events
  for all to authenticated using (is_interno()) with check (is_interno());
