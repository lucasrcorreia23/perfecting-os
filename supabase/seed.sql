-- Perfecting v1 — seed com os 5 clientes reais (sem mocks).
-- Idempotente: limpa os dados antes de inserir, então pode ser reaplicado a
-- qualquer momento (inclusive por `supabase db reset`). Colunas de ator ficam
-- NULL (o seed não referencia auth.users).

begin;

-- Limpa dados existentes. O cascade das FKs cobre activities, client_files e
-- events ligados a clientes; a linha seguinte remove eventos órfãos.
delete from public.clients;
delete from public.events;

-- 5 clientes, cada um na sua etapa atual do workflow (UUIDs fixos → reaplicável).
insert into public.clients (id, name, stage, status) values
  ('00000000-0000-4000-8000-000000000001', 'RD',      'medir',        'ativo'),
  ('00000000-0000-4000-8000-000000000002', 'Suri',    'diagnosticar', 'ativo'),
  ('00000000-0000-4000-8000-000000000003', 'Fiesc',   'medir',        'ativo'),
  ('00000000-0000-4000-8000-000000000004', 'GM',      'diagnosticar', 'ativo'),
  ('00000000-0000-4000-8000-000000000005', 'Engenho', 'diagnosticar', 'ativo');

-- Atividades = coluna "Perfecting Backstage" (image 12), por etapa. Cada cliente
-- recebe as atividades das etapas até a sua etapa atual: anteriores concluídas,
-- a etapa atual em andamento.
with ord(stage, idx) as (
  values
    ('diagnosticar'::public.workflow_stage, 0),
    ('priorizar', 1),
    ('construir', 2),
    ('calibrar', 3),
    ('executar', 4),
    ('medir', 5)
),
tpl(stage, position, title) as (
  values
    ('diagnosticar'::public.workflow_stage, 0, 'Cria pasta, projeto e tracker'),
    ('diagnosticar', 1, 'Audita dados e lacunas'),
    ('diagnosticar', 2, 'Cruza CRM, calls e percepção'),
    ('priorizar', 0, 'Aplica matriz de decisão'),
    ('construir', 0, 'Cria roleplays e rubricas'),
    ('construir', 1, 'Testa prompts e feedbacks'),
    ('calibrar', 0, 'Ajusta prompt, persona e rubrica'),
    ('executar', 0, 'Monitora adoção e bugs'),
    ('medir', 0, 'Cruza treino com performance')
)
insert into public.activities (client_id, stage, position, title, status)
select
  c.id,
  tpl.stage,
  tpl.position,
  tpl.title,
  case
    when ot.idx < oc.idx then 'concluida'::public.activity_status
    else 'em_andamento'::public.activity_status
  end
from public.clients c
cross join tpl
join ord ot on ot.stage = tpl.stage
join ord oc on oc.stage = c.stage
where ot.idx <= oc.idx;

-- Evento de criação de cada cliente para o feed "Atividades Recentes".
insert into public.events (client_id, type, payload)
select id, 'cliente_criado', jsonb_build_object('name', name)
from public.clients;

commit;
