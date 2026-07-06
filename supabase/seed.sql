-- Perfecting v1 — seed com os 5 clientes reais (sem mocks).
-- Idempotente: limpa os dados antes de inserir, então pode ser reaplicado a
-- qualquer momento (inclusive por `supabase db reset`). Colunas de ator ficam
-- NULL (o seed não referencia auth.users).
--
-- As atividades espelham o cronograma canônico da POC (planilha "Atividades
-- da POC - V1"; fonte TS: src/lib/methodology.ts — alterar os dois juntos):
-- 21 passos, 8 semanas, 50 dias, com Semana, Prazo, Dias totais, Responsável
-- (categoria) e Tipo (síncrono/assíncrono). Cada cliente recebe a jornada
-- completa; um "ponteiro" define o passo atual (anteriores concluídas, o
-- atual em andamento, os seguintes pendentes).

begin;

-- Limpa dados existentes. O cascade das FKs cobre activities, client_files e
-- events ligados a clientes; a linha seguinte remove eventos órfãos.
delete from public.clients;
delete from public.events;

-- 5 clientes, cada um na sua etapa atual do workflow (UUIDs fixos → reaplicável).
insert into public.clients (id, name, stage, status) values
  ('00000000-0000-4000-8000-000000000001', 'RD',      'executar',     'ativo'),
  ('00000000-0000-4000-8000-000000000002', 'Suri',    'priorizar',    'ativo'),
  ('00000000-0000-4000-8000-000000000003', 'Fiesc',   'medir',        'ativo'),
  ('00000000-0000-4000-8000-000000000004', 'GM',      'diagnosticar', 'ativo'),
  ('00000000-0000-4000-8000-000000000005', 'Engenho', 'diagnosticar', 'ativo');

-- Cronograma canônico (21 passos) + ponteiro de passo atual por cliente:
--   RD      → #15 Confecção do relatório de resultados (semana 2)  [executar]
--   Suri    → #7  Testes de roleplay e feedbacks                   [priorizar]
--   Engenho → #4  Criação das trilhas e apresentação               [diagnosticar]
--   Fiesc / GM (sem status informado) → primeiro passo da etapa atual.
with tpl(ord, stage, week, duration_days, cumulative_days, title, responsavel, tipo) as (
  values
    (1,  'diagnosticar'::public.workflow_stage, 1, 1, 1,  'Aceite Formal',                                                                              'ambos'::public.responsavel_categoria,      'assincrono'::public.atividade_tipo),
    (2,  'diagnosticar', 1, 1, 2,  'Canal de comunicação (WPP) aberto',                                                          'perfecting', 'assincrono'),
    (3,  'diagnosticar', 1, 2, 4,  'Diagnóstico de dores e anamnese realizadas',                                                 'cliente',    'assincrono'),
    (4,  'diagnosticar', 1, 2, 6,  'Criação das trilhas e apresentação',                                                         'perfecting', 'assincrono'),
    (5,  'diagnosticar', 2, 1, 7,  'Reunião de apresentação das trilhas e validação',                                            'ambos',      'sincrono'),
    (6,  'priorizar',    2, 0, 7,  'Criação da conta e liberação dos acessos',                                                   'perfecting', 'assincrono'),
    (7,  'priorizar',    2, 6, 13, 'Testes de roleplay e feedbacks',                                                             'cliente',    'assincrono'),
    (8,  'construir',    3, 1, 14, 'Reunião de alinhamentos, definição de cadência de treinamentos e foco do piloto',            'ambos',      'sincrono'),
    (9,  'calibrar',     3, 1, 15, 'Calibração de roleplays com base nos feedbacks trazidos e no foco definido',                 'perfecting', 'assincrono'),
    (10, 'calibrar',     3, 3, 18, 'Validação das melhorias',                                                                    'cliente',    'assincrono'),
    (11, 'executar',     4, 3, 21, 'Go-Live (Apresentação ao operacional)',                                                      'ambos',      'sincrono'),
    (12, 'executar',     4, 4, 25, 'Reunião de alinhamentos com a gestão: boas práticas, KPIs desejados, cadência mínima e ideal', 'ambos',    'sincrono'),
    (13, 'executar',     4, 2, 27, 'Confecção do relatório de resultados (semana 1)',                                            'perfecting', 'assincrono'),
    (14, 'executar',     5, 1, 28, 'Reunião semanal 1: apresentação de relatório, prática semanal e encaminhamentos',            'ambos',      'sincrono'),
    (15, 'executar',     5, 6, 34, 'Confecção do relatório de resultados (semana 2)',                                            'perfecting', 'assincrono'),
    (16, 'executar',     6, 1, 35, 'Reunião semanal 2: apresentação de relatório, prática semanal e encaminhamentos',            'ambos',      'sincrono'),
    (17, 'executar',     6, 6, 41, 'Confecção do relatório de resultados (semana 3)',                                            'perfecting', 'assincrono'),
    (18, 'executar',     7, 1, 42, 'Reunião semanal 3: apresentação de relatório, prática semanal e encaminhamentos',            'ambos',      'sincrono'),
    (19, 'medir',        7, 6, 48, 'Relatório final de impacto',                                                                 'perfecting', 'assincrono'),
    (20, 'medir',        8, 1, 49, 'Reunião semanal 4: apresentação do relatório final de impacto',                              'ambos',      'sincrono'),
    (21, 'medir',        8, 1, 50, 'O cliente pretende avançar com a solução e realizar negociação para fechar contrato?',       'ambos',      'assincrono')
),
pointer(client_id, current_ord) as (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 15), -- RD
    ('00000000-0000-4000-8000-000000000002'::uuid, 7),  -- Suri
    ('00000000-0000-4000-8000-000000000003'::uuid, 19), -- Fiesc
    ('00000000-0000-4000-8000-000000000004'::uuid, 1),  -- GM
    ('00000000-0000-4000-8000-000000000005'::uuid, 4)   -- Engenho
)
insert into public.activities
  (client_id, stage, position, title, status,
   week, duration_days, cumulative_days, responsavel, tipo)
select
  p.client_id,
  tpl.stage,
  row_number() over (partition by p.client_id, tpl.stage order by tpl.ord) - 1,
  tpl.title,
  case
    when tpl.ord < p.current_ord then 'concluida'::public.activity_status
    when tpl.ord = p.current_ord then 'em_andamento'::public.activity_status
    else 'pendente'::public.activity_status
  end,
  tpl.week,
  tpl.duration_days,
  tpl.cumulative_days,
  tpl.responsavel,
  tpl.tipo
from pointer p
cross join tpl;

-- Evento de criação de cada cliente para o feed "Atividades Recentes".
insert into public.events (client_id, type, payload)
select id, 'cliente_criado', jsonb_build_object('name', name)
from public.clients;

commit;
