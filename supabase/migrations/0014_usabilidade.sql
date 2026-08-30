-- Perfecting v1 — testes de usabilidade: sessões moderadas com roteiro fixo,
-- as respostas de cada uma, e os achados que ligam o que se viu no teste ao
-- módulo Desafios.
-- Sem client_id, como no 0012: é pesquisa de produto, não de conta — por isso a
-- RLS aqui é uma policy por tabela em vez da matriz do 0001.
-- Nenhuma policy para `anon`: não existe API pública neste módulo.
-- Espelha src/lib/database.types.ts — alterar juntos.
--
-- A REGRA DE CORTE COLUNA × JSONB, que explica por que este schema é tão magro:
-- uma pergunta do roteiro só vira COLUNA quando algo além da leitura depende
-- dela — qual roteiro se aplica (perfil, varejo) e o eixo de ordenação e
-- cruzamento (fluxo, realizado_em). Dispositivo, sistema operacional, navegador
-- e duração são distribuições e nada mais, então moram em `respostas`. O ganho é
-- concreto: acrescentar "Opera" ao navegador é uma linha em
-- src/lib/usabilidade/roteiro.ts, não uma migration.
-- `observacoes` é coluna e não fere a regra: é nota do analista, não resposta.

-- =============================================================================
-- Enums
-- =============================================================================

-- Estes DOIS são enum porque governam estrutura: `perfil` decide qual metade do
-- roteiro se aplica, e `fluxo` é o eixo de cruzamento. Os outros campos de
-- escolha do Bloco 0 não são enum, de propósito — ver a regra no topo.
create type public.teste_perfil as enum ('gestor', 'vendedor');

create type public.teste_fluxo as enum
  ('configuracao', 'preparacao', 'pre_chamada', 'chamada', 'feedback');

-- Como a sessão entrou. Conjunto fechado, produzido por código, nunca digitado,
-- e vira chip na tela: aqui o enum constrange de verdade.
create type public.teste_origem as enum ('ficha', 'transcricao', 'manual');

-- `desafio_id is null` sozinho confunde "ninguém olhou ainda" com "olhamos e
-- decidimos que não vira desafio" — é `sem_dados` virando zero outra vez. Sem
-- este enum, a lista de achados pendentes é um to-do que nunca encolhe.
create type public.teste_achado_status as enum
  ('aberto', 'virou_desafio', 'descartado');

-- =============================================================================
-- Sessões
-- =============================================================================

create table if not exists public.teste_sessoes (
  id             uuid primary key default gen_random_uuid(),
  -- Vira "TU-014" em codigoSessao(), nunca no banco. Identity resolve a
  -- concorrência por construção; a sequência TEM BURACOS (um insert com
  -- rollback queima um número) e isso é aceito: codigo é RÓTULO, nunca
  -- CONTAGEM. Mesma nota do 0012. Não "consertar".
  codigo         int generated always as identity,
  perfil         public.teste_perfil not null,
  fluxo          public.teste_fluxo not null,
  varejo         boolean not null default false,
  realizado_em   date not null,
  -- A versão do roteiro que esta sessão respondeu. Nunca reescrita: mudar o
  -- roteiro não muda o significado de sessão antiga. Molde da relação entre
  -- marketing_leads e marketing_funnel_versions, com a diferença de que o
  -- snapshot vive em código — por isso a tela precisa saber renderizar resposta
  -- cujo id saiu do roteiro, em vez de deixá-la sumir.
  roteiro_versao int not null,
  respostas      jsonb not null default '{}'::jsonb,
  origem         public.teste_origem not null default 'manual',
  observacoes    text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint teste_sessoes_codigo_unico unique (codigo),
  constraint teste_sessoes_respostas_objeto check (jsonb_typeof(respostas) = 'object'),
  constraint teste_sessoes_roteiro_versao_positiva check (roteiro_versao >= 1)
);

create index if not exists teste_sessoes_realizado_em_idx
  on public.teste_sessoes (realizado_em desc);
create index if not exists teste_sessoes_perfil_idx on public.teste_sessoes (perfil);
create index if not exists teste_sessoes_fluxo_idx on public.teste_sessoes (fluxo);
create index if not exists teste_sessoes_created_by_idx on public.teste_sessoes (created_by);

-- =============================================================================
-- Transcrição — tabela 1:1 DE PROPÓSITO
-- =============================================================================
-- Uma transcrição de 40 minutos tem dezenas de KB. Na mesma linha da sessão, o
-- primeiro `select *` da listagem arrastaria tudo — e o molde que se copia neste
-- repositório (DESAFIO_SELECT, em src/components/desafios/mapear-desafio.ts) usa
-- exatamente `*`. "A query não seleciona" é disciplina, que a próxima pessoa não
-- herda; tabela separada é estrutura, e torna o erro impossível em vez de
-- meramente testado. Custa um join numa tela só, a do detalhe.

create table if not exists public.teste_transcricoes (
  sessao_id uuid primary key references public.teste_sessoes(id) on delete cascade,
  texto     text not null,
  created_at timestamptz not null default now(),
  constraint teste_transcricoes_texto_nao_vazio check (btrim(texto) <> '')
);

-- =============================================================================
-- Achados — a ponte para Desafios
-- =============================================================================

create table if not exists public.teste_achados (
  id            uuid primary key default gen_random_uuid(),
  sessao_id     uuid not null references public.teste_sessoes(id) on delete cascade,
  -- De qual pergunta veio. Null é legítimo: muito achado nasce de observação
  -- livre, não de uma resposta. Não é FK — o roteiro mora em código.
  pergunta_id   text,
  resumo        text not null,
  -- Nullable de propósito: no modo ficha não há transcrição de onde citar, e
  -- `not null` obrigaria a pessoa a digitar "n/a" — que é ruído com cara de dado.
  trecho        text,
  -- Reusam os enums do 0012 porque o achado NÃO é conceito paralelo ao desafio:
  -- é o desafio antes de ser promovido, e criarDesafioDoAchado copia os dois
  -- campos direto. Enums gêmeos exigiriam tabela de tradução e divergiriam no
  -- primeiro valor que entrasse só de um lado. (O 0012 recusou reusar
  -- `criticidade` porque lá os conjuntos diferiam e o enum era compartilhado com
  -- `activities`; o teste que aquele precedente estabelece é "os dois têm razão
  -- independente para mudar?", e aqui não têm.)
  tipo          public.desafio_tipo not null default 'atrito',
  severidade    public.desafio_severidade not null default 'media',
  status        public.teste_achado_status not null default 'aberto',
  categoria_id  uuid references public.desafio_categorias(id) on delete restrict,
  fluxo_id      uuid references public.desafio_fluxos(id) on delete restrict,
  -- `set null` aqui NÃO contradiz a proibição do 0012, que era sobre
  -- categoria_id/fluxo_id: lá, apagar uma categoria destruiria a classificação
  -- que o desafio TINHA. Aqui a direção é inversa — o achado é a EVIDÊNCIA
  -- (citação de uma sessão real) e o desafio é o registro derivado. `cascade`
  -- apagaria evidência por causa de um derivado; `restrict` faria deleteDesafio
  -- falhar com erro genérico.
  desafio_id    uuid references public.desafios(id) on delete set null,
  -- Gravado no vínculo e NUNCA limpo. Sem ele, `set null` tornaria "nunca virou
  -- desafio" e "virou DES-014 e o desafio foi excluído" indistinguíveis — o
  -- mesmo defeito de ler 0/0 como 0%. Com ele, estadoDoVinculo() devolve três
  -- estados em vez de dois.
  desafio_codigo int,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint teste_achados_resumo_nao_vazio check (btrim(resumo) <> ''),
  constraint teste_achados_codigo_com_vinculo
    check (desafio_id is null or desafio_codigo is not null)
);

create index if not exists teste_achados_sessao_id_idx
  on public.teste_achados (sessao_id, created_at desc);
create index if not exists teste_achados_desafio_id_idx on public.teste_achados (desafio_id);
create index if not exists teste_achados_status_idx on public.teste_achados (status);
create index if not exists teste_achados_categoria_id_idx on public.teste_achados (categoria_id);
create index if not exists teste_achados_fluxo_id_idx on public.teste_achados (fluxo_id);

-- =============================================================================
-- Triggers (reusa public.set_updated_at() do 0001)
-- =============================================================================

create trigger teste_sessoes_set_updated_at
  before update on public.teste_sessoes
  for each row execute function public.set_updated_at();

create trigger teste_achados_set_updated_at
  before update on public.teste_achados
  for each row execute function public.set_updated_at();

-- A transcrição é o material bruto da sessão: corrige-se recolando, não
-- editando em pedaços. Sem updated_at, sem trigger — mesma nota de
-- desafio_ocorrencias e de marketing_funnel_versions.

-- =============================================================================
-- RLS — módulo 100% interno. Nada para `anon`, nada para `cliente`.
-- =============================================================================

alter table public.teste_sessoes      enable row level security;
alter table public.teste_transcricoes enable row level security;
alter table public.teste_achados      enable row level security;

create policy "teste_sessoes_all_interno" on public.teste_sessoes
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "teste_transcricoes_all_interno" on public.teste_transcricoes
  for all to authenticated using (is_interno()) with check (is_interno());

create policy "teste_achados_all_interno" on public.teste_achados
  for all to authenticated using (is_interno()) with check (is_interno());
