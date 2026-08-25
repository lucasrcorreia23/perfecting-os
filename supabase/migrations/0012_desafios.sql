-- Perfecting v1 — módulo Desafios: registro interno de bugs, atritos e lacunas,
-- classificados por categoria × fluxo e medidos por recorrência.
-- Sem client_id: é registro de produto, não de conta — não há leitura de cliente,
-- e por isso a RLS aqui é uma policy por tabela em vez da matriz do 0001.
-- Nenhuma policy para `anon`: não existe API pública neste módulo.
-- Espelha src/lib/database.types.ts — alterar juntos.

-- =============================================================================
-- Enums
-- =============================================================================

-- O módulo se chama "desafios", não "bugs", e o `tipo` existe para manter o eixo
-- CATEGORIA limpo: sem ele, "bug" viraria categoria e a tabela carregaria dois
-- eixos ao mesmo tempo (que TIPO de problema é × em que ÁREA ele mora). Aí o
-- cruzamento categoria × fluxo — a peça central do módulo — leria lixo, com
-- "Bug × Clientes" e "Dados incorretos × Clientes" na mesma coluna.
create type public.desafio_tipo as enum ('bug', 'atrito', 'lacuna');

-- Enum novo, e NÃO o public.criticidade do 0007 (baixa|media|alta, das
-- atividades da POC). Severidade de bug precisa de `critica` — "trava todo
-- mundo" não é "alta" — e `alter type ... add value` no enum compartilhado
-- mexeria em activities junto. O repositório já separou post_status de
-- funnel_status, que têm os MESMOS três valores.
create type public.desafio_severidade as enum ('critica', 'alta', 'media', 'baixa');

-- `nao_reproduz` é desfecho, não descarte: "tentei e não acontece" é informação
-- diferente de "não vamos tratar". `reincidente` ficou de fora de propósito —
-- recorrência é número, e status de reincidência seria a segunda fonte da
-- verdade que este módulo existe para não ter.
create type public.desafio_status as enum
  ('aberto', 'em_analise', 'resolvido', 'nao_reproduz', 'descartado');

-- Obs.: ambiente, rota e passos de reprodução NÃO viram enum — é a mesma nota
-- do 0008 sobre o `questions` jsonb: enum que não constrange nada só cria
-- migration para cada valor novo. Idem para o resultado de uma ocorrência, que
-- aqui nem existe como conceito (ver desafio_ocorrencias).

-- =============================================================================
-- Taxonomias — categoria e fluxo são cadastráveis pela UI, não enums
-- =============================================================================
-- As duas tabelas são deliberadamente simétricas: o CRUD é escrito uma vez e
-- parametrizado.

create table if not exists public.desafio_categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  -- Hex da PALETA (§1 do guideline). O CHECK valida a FORMA; o conjunto dos 8
  -- swatches vive em src/lib/constants.ts e é o seletor que o impõe — listar os
  -- 8 hexes aqui criaria a segunda fonte da verdade da paleta.
  cor        text not null default '#475569',
  ordem      int not null default 0,
  arquivada  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint desafio_categorias_nome_nao_vazio check (btrim(nome) <> ''),
  constraint desafio_categorias_cor_hex check (cor ~ '^#[0-9a-fA-F]{6}$')
);

-- Unicidade INSENSÍVEL A CAIXA e sem espaço nas pontas: é o motivo inteiro de a
-- taxonomia ser tabela em vez de texto livre — "Checkout", "checkout" e
-- "Checkout " não podem virar três linhas no cruzamento.
create unique index if not exists desafio_categorias_nome_idx
  on public.desafio_categorias (lower(btrim(nome)));

-- `ordem` existe porque o eixo de fluxos é uma JORNADA (login → workflow →
-- clientes); ordem alfabética ali seria ativamente errada. Na UI é um campo
-- numérico simples — sem drag-and-drop: @dnd-kit continua isolado no board.
create table if not exists public.desafio_fluxos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  cor        text not null default '#475569',
  ordem      int not null default 0,
  arquivado  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint desafio_fluxos_nome_nao_vazio check (btrim(nome) <> ''),
  constraint desafio_fluxos_cor_hex check (cor ~ '^#[0-9a-fA-F]{6}$')
);

create unique index if not exists desafio_fluxos_nome_idx
  on public.desafio_fluxos (lower(btrim(nome)));

-- =============================================================================
-- Desafios
-- =============================================================================

create table if not exists public.desafios (
  id            uuid primary key default gen_random_uuid(),
  -- Rótulo legível (DES-014): o entregável do módulo é um JSON lido por gente e
  -- conversa de time, e uuid não se cola no chat. Identity resolve a
  -- concorrência POR CONSTRUÇÃO — sem max()+1, sem lock, sem retry.
  -- A sequência TEM BURACOS (um insert com rollback queima um número). Isso é
  -- aceito: `codigo` é RÓTULO, nunca CONTAGEM. Não "consertar".
  -- Não entra em Insert nem em Update — `generated always` recusa escrita.
  codigo        int generated always as identity,
  titulo        text not null,
  descricao     text,
  tipo          public.desafio_tipo not null default 'bug',
  severidade    public.desafio_severidade not null default 'media',
  status        public.desafio_status not null default 'aberto',
  -- NULLABLE com on delete restrict, e os dois lados são de propósito:
  -- nullable porque um desafio se registra às pressas e se classifica depois
  -- (obrigar a taxonomia no cadastro faz inventar categoria só para conseguir
  -- salvar, que é o lixo que a tabela veio evitar); restrict porque apagar uma
  -- categoria com histórico apagaria o cruzamento em silêncio — a action recusa
  -- com a contagem, no precedente do deleteFunnel. `set null` está fora: ele é
  -- exatamente o oposto do que o módulo existe para fazer.
  categoria_id  uuid references public.desafio_categorias(id) on delete restrict,
  fluxo_id      uuid references public.desafio_fluxos(id) on delete restrict,
  -- Recorrência, contador manual. Havendo >= 1 ocorrência, o LOG vence e este
  -- par vira histórico de leitura. NUNCA somar as duas fontes — quem registra a
  -- primeira ocorrência normalmente já tinha digitado o contador à mão, e somar
  -- contaria a mesma medição duas vezes. A regra vive em src/lib/desafios.ts.
  tentativas    int not null default 0,
  falhas        int not null default 0,
  -- Corpo do relato: são os três campos que um `descricao` livre sempre perde,
  -- e são o que faz o JSON exportado servir a quem vai corrigir.
  passos        text,
  esperado      text,
  obtido        text,
  -- UMA coluna livre, não quatro (dispositivo/so/browser/versao): quatro campos
  -- que ninguém preenche e sobre os quais ninguém filtra.
  ambiente      text,
  rota          text,
  -- Link externo (Drive, Loom, print). Coluna em vez de bucket: o cascade não
  -- alcança o Storage (decisão já registrada no repositório), e um bucket de
  -- prints internos ou vaza, ou expira. Revisitar só no segundo pedido real.
  evidencia_url text,
  resolucao     text,
  resolvido_em  timestamptz,
  observacoes   text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint desafios_codigo_unico unique (codigo),
  constraint desafios_titulo_nao_vazio check (btrim(titulo) <> ''),
  constraint desafios_contadores_nao_negativos check (tentativas >= 0 and falhas >= 0),
  -- Backstop do que validateDesafioInput já barra com mensagem em pt-BR.
  constraint desafios_falhas_ate_tentativas check (falhas <= tentativas),
  constraint desafios_evidencia_url_http
    check (evidencia_url is null or evidencia_url ~* '^https?://'),
  -- Espelha marketing_posts_published_at_required: resolvido SEMPRE tem data.
  -- Só em `resolvido`, nunca em `descartado`/`nao_reproduz` — descartar é um
  -- juízo, não uma resolução.
  constraint desafios_resolvido_em_required
    check (status <> 'resolvido' or resolvido_em is not null)
);

create index if not exists desafios_categoria_id_idx on public.desafios (categoria_id);
create index if not exists desafios_fluxo_id_idx on public.desafios (fluxo_id);
create index if not exists desafios_status_idx on public.desafios (status);
create index if not exists desafios_created_at_idx on public.desafios (created_at desc);
create index if not exists desafios_created_by_idx on public.desafios (created_by);

-- =============================================================================
-- Ocorrências — o log que vence o contador
-- =============================================================================

create table if not exists public.desafio_ocorrencias (
  id             uuid primary key default gen_random_uuid(),
  desafio_id     uuid not null references public.desafios(id) on delete cascade,
  ocorrido_em    timestamptz not null default now(),
  -- Uma linha é uma SESSÃO DE MEDIÇÃO, não uma tentativa: "de 10, 7 bugaram" é
  -- UMA linha, e não dez. É por isso que não existe enum de resultado aqui — um
  -- par falhou/passou seria um boolean fantasiado, e ainda cobraria dez cliques
  -- para registrar a frase que originou o módulo. O caso unitário é 1/1.
  tentativas     int not null default 1,
  falhas         int not null default 1,
  nota           text,
  ambiente       text,  -- sobrescreve o do desafio nesta medição
  registrado_por uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint desafio_ocorrencias_tentativas_minimas check (tentativas >= 1),
  constraint desafio_ocorrencias_falhas_nao_negativas check (falhas >= 0),
  constraint desafio_ocorrencias_falhas_ate_tentativas check (falhas <= tentativas)
);

create index if not exists desafio_ocorrencias_desafio_id_idx
  on public.desafio_ocorrencias (desafio_id, ocorrido_em desc);

-- =============================================================================
-- Triggers (reusa public.set_updated_at() do 0001)
-- =============================================================================

create trigger desafio_categorias_set_updated_at
  before update on public.desafio_categorias
  for each row execute function public.set_updated_at();

create trigger desafio_fluxos_set_updated_at
  before update on public.desafio_fluxos
  for each row execute function public.set_updated_at();

create trigger desafios_set_updated_at
  before update on public.desafios
  for each row execute function public.set_updated_at();

-- Ocorrência é medição imutável: corrige-se excluindo e registrando de novo.
-- Sem updated_at, sem trigger — mesma nota de marketing_funnel_versions.

-- =============================================================================
-- RLS — módulo 100% interno. Nada para `anon`, nada para `cliente`.
-- =============================================================================

alter table public.desafio_categorias  enable row level security;
alter table public.desafio_fluxos      enable row level security;
alter table public.desafios            enable row level security;
alter table public.desafio_ocorrencias enable row level security;

create policy "desafio_categorias_all_interno" on public.desafio_categorias
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "desafio_fluxos_all_interno" on public.desafio_fluxos
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "desafios_all_interno" on public.desafios
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "desafio_ocorrencias_all_interno" on public.desafio_ocorrencias
  for all to authenticated using (is_interno()) with check (is_interno());

-- =============================================================================
-- Taxonomia inicial — ponto de partida DESCARTÁVEL
-- =============================================================================
-- Não é opinião sobre o produto: sem isto o módulo estreia com a matriz vazia e
-- a primeira pessoa a usá-lo tem de inventar a taxonomia inteira antes de
-- registrar o primeiro bug. A tela /desafios/taxonomias renomeia, arquiva e
-- exclui o que não servir. `on conflict do nothing` cobre a reaplicação.

insert into public.desafio_categorias (nome, descricao, cor, ordem) values
  ('Erro ou quebra',     'A tela quebra, a ação falha ou aparece mensagem de erro.',   '#E11D48', 1),
  ('Dados incorretos',   'A tela responde, mas o número ou o texto está errado.',      '#D97706', 2),
  ('Visual e layout',    'Alinhamento, corte de conteúdo, contraste, sobreposição.',   '#7C3AED', 3),
  ('Navegação',          'Link, volta, rota ou foco levam ao lugar errado.',           '#2E63CD', 4),
  ('Desempenho',         'Lentidão, travamento ou espera sem resposta.',               '#0891B2', 5),
  ('Permissão e acesso', 'Alguém vê ou faz algo que o papel não permite.',             '#DB2777', 6)
on conflict do nothing;

insert into public.desafio_fluxos (nome, descricao, cor, ordem) values
  ('Login e cadastro', 'Entrar, criar conta, recuperar senha.',              '#2E63CD', 1),
  ('Início',           'Painel de KPIs e atividade recente.',                '#0891B2', 2),
  ('Workflow',         'Kanban de etapas e arrastar cliente.',               '#7C3AED', 3),
  ('Clientes',         'Listagem, cadastro, detalhe, atividades, arquivos.', '#0F9F2E', 4),
  ('Marketing',        'Blog, funis e leads.',                               '#DB2777', 5),
  ('Calculadora',      'Link público, quiz, relatório e envio.',             '#D97706', 6),
  ('Perfil',           'Dados pessoais e preferências.',                     '#475569', 7)
on conflict do nothing;
