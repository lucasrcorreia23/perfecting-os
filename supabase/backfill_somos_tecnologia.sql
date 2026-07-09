-- ============================================================================
-- Backfill: dá ao cliente "Somos Tecnologia" as atividades da COLUNA (etapa)
-- atual dele. Espelha o cronograma canônico da POC
-- (supabase/seed.sql / src/lib/methodology.ts).
--
-- Como usar: Supabase Dashboard > SQL Editor > cole e clique em "Run".
--   Executa como service role (ignora o RLS). Idempotente: não insere nada se
--   o cliente já tiver atividades na etapa atual, então pode rodar de novo sem
--   duplicar. O resultado exibido no final é a conferência (passo 3).
-- ============================================================================

-- 1) Antes: qual etapa e quantas atividades o cliente já tem.
select c.id, c.name, c.stage, count(a.id) as atividades
from public.clients c
left join public.activities a on a.client_id = c.id
where lower(btrim(c.name)) = 'somos tecnologia'
group by c.id, c.name, c.stage;

-- 2) Insere as atividades da etapa atual (todas como "pendente").
with alvo as (
  select id as client_id, stage
  from public.clients
  where lower(btrim(name)) = 'somos tecnologia'
  limit 1
),
tpl(ord, stage, week, duration_days, cumulative_days, title, responsavel, tipo) as (
  values
    (1,  'diagnosticar'::public.workflow_stage, 1, 1, 1,  'Aceite Formal',                                                                                'ambos'::public.responsavel_categoria, 'assincrono'::public.atividade_tipo),
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
)
insert into public.activities
  (client_id, stage, position, title, status, week, duration_days, cumulative_days, responsavel, tipo)
select
  a.client_id,
  tpl.stage,
  row_number() over (order by tpl.ord) - 1,   -- posição 0-based dentro da etapa
  tpl.title,
  'pendente'::public.activity_status,
  tpl.week, tpl.duration_days, tpl.cumulative_days, tpl.responsavel, tpl.tipo
from alvo a
join tpl on tpl.stage = a.stage
where not exists (                              -- idempotência: só se ainda não tem
  select 1 from public.activities x
  where x.client_id = a.client_id and x.stage = a.stage
);

-- 3) Depois: confere as atividades da etapa atual.
select a.stage, a.position, a.title, a.status
from public.activities a
join public.clients c on c.id = a.client_id
where lower(btrim(c.name)) = 'somos tecnologia'
order by a.stage, a.position;
